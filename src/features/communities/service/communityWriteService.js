/**
 * CRUD comunidades y miembros — mismos campos que Guardian móvil.
 * Requiere reglas Firestore que permitan escrituras solo a platform admins.
 */
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { CommunityFields, MemberFields, UserFields } from '@/shared/config/firestoreFields';
import { normalizeEntityReportTypes } from '@/features/communities/utils/entityReportTypes';
import { InboxKinds, notifyMembershipEvent } from '@/shared/data/inbox/inboxNotifyRepository';
import { ENTITY_ROLE_SET, NON_ENTITY_ROLE_SET } from '@/shared/validators/roles';
import { runGuardedMemberMutation, assertCanRemoveOrDemoteManager } from '@/shared/domain/membershipGuards';

const communitiesCol = () => collection(db, Collections.COMMUNITIES);
const membersCol = () => collection(db, Collections.COMMUNITY_MEMBERS);
const NON_ENTITY_ROLES = NON_ENTITY_ROLE_SET;
const ENTITY_ROLES = ENTITY_ROLE_SET;

// ─── Communities ────────────────────────────────────────────────────────────

export async function adminCreateCommunity({
    name,
    description,
    isEntity,
    allowForwardToEntities,
    createdByUid,
    iconCodePoint,
    iconColor,
    reportAlertTypes,
}) {
    const payload = {
        [CommunityFields.name]: String(name || '').trim(),
        [CommunityFields.description]: description ?? null,
        [CommunityFields.isEntity]: Boolean(isEntity),
        [CommunityFields.allowForwardToEntities]: allowForwardToEntities !== false,
        [CommunityFields.createdBy]: createdByUid ?? null,
        [CommunityFields.createdAt]: serverTimestamp(),
    };
    if (iconCodePoint != null) payload[CommunityFields.iconCodePoint] = Number(iconCodePoint);
    if (iconColor) payload[CommunityFields.iconColor] = String(iconColor);
    if (isEntity) {
        payload[CommunityFields.reportAlertTypes] = normalizeEntityReportTypes(reportAlertTypes);
    }

    const ref = await addDoc(communitiesCol(), payload);
    return ref.id;
}

export async function adminUpdateCommunity(communityId, patch) {
    const ref = doc(db, Collections.COMMUNITIES, communityId);
    const data = {};
    if (patch.name != null) data[CommunityFields.name] = String(patch.name).trim();
    if (patch.description !== undefined) data[CommunityFields.description] = patch.description;
    if (patch.isEntity != null) data[CommunityFields.isEntity] = Boolean(patch.isEntity);
    if (patch.allowForwardToEntities != null) {
        data[CommunityFields.allowForwardToEntities] = Boolean(patch.allowForwardToEntities);
    }
    if (patch.iconCodePoint !== undefined) {
        data[CommunityFields.iconCodePoint] =
            patch.iconCodePoint == null ? null : Number(patch.iconCodePoint);
    }
    if (patch.iconColor !== undefined) data[CommunityFields.iconColor] = patch.iconColor;
    if (patch.reportAlertTypes !== undefined) {
        data[CommunityFields.reportAlertTypes] = normalizeEntityReportTypes(patch.reportAlertTypes);
    }
    await updateDoc(ref, data);
}

/**
 * Borra la comunidad y todos los `community_members` asociados (chunks de 500).
 */
export async function adminDeleteCommunityCascade(communityId) {
    const q = query(membersCol(), where(MemberFields.communityId, '==', communityId));
    const snap = await getDocs(q);
    const memberDocs = snap.docs;

    for (let i = 0; i < memberDocs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = memberDocs.slice(i, i + 500);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }

    await deleteDoc(doc(db, Collections.COMMUNITIES, communityId));
}

// ─── Members ────────────────────────────────────────────────────────────────

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase() || MemberFields.roleMember;
}

async function getAllowedRolesForCommunity(communityId) {
    const communityRef = doc(db, Collections.COMMUNITIES, communityId);
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
        throw new Error('Comunidad no encontrada');
    }
    const data = communitySnap.data() || {};
    return data[CommunityFields.isEntity] === true
        ? ENTITY_ROLES
        : NON_ENTITY_ROLES;
}

async function getCommunityMeta(communityId) {
    const communitySnap = await getDoc(doc(db, Collections.COMMUNITIES, communityId));
    if (!communitySnap.exists()) {
        return { name: 'Comunidad', isEntity: false };
    }
    const data = communitySnap.data() || {};
    const isEntity = data[CommunityFields.isEntity] === true;
    const name =
        String(data[CommunityFields.name] || (isEntity ? 'Reporte' : 'Comunidad')).trim()
        || (isEntity ? 'Reporte' : 'Comunidad');
    return { name, isEntity };
}

async function getUserDisplayName(userId) {
    if (!userId) return null;
    try {
        const snap = await getDoc(doc(db, Collections.USERS, userId));
        if (!snap.exists()) return null;
        const d = snap.data() || {};
        return (
            d[UserFields.displayName]
            || d[UserFields.fullName]
            || d[UserFields.name]
            || d[UserFields.email]
            || null
        );
    } catch {
        return null;
    }
}

/**
 * @param {string} communityId
 * @param {string} userId — Firebase Auth UID
 * @param {'member'|'admin'|'official'} role
 */
export async function adminAddCommunityMember(communityId, userId, role, actor = {}) {
    const r = normalizeRole(role);
    const allowedRoles = await getAllowedRolesForCommunity(communityId);
    if (!allowedRoles.has(r)) {
        throw new Error('Rol inválido para esta comunidad');
    }
    await addDoc(membersCol(), {
        [MemberFields.communityId]: communityId,
        [MemberFields.userId]: userId,
        [MemberFields.role]: r,
        [MemberFields.joinedAt]: serverTimestamp(),
    });
    const { name: communityName, isEntity } = await getCommunityMeta(communityId);
    const subjectName = actor.subjectName ?? (await getUserDisplayName(userId));
    await notifyMembershipEvent({
        targetUserId: userId,
        kind: InboxKinds.memberAdded,
        communityId,
        communityName,
        isEntity,
        actorId: actor.actorId ?? null,
        actorName: actor.actorName ?? null,
        subjectName,
        role: r,
    });
}

export async function adminRemoveMember(memberDocId, actor = {}) {
    const memberRef = doc(db, Collections.COMMUNITY_MEMBERS, memberDocId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
        await deleteDoc(memberRef);
        return;
    }
    const data = memberSnap.data() || {};
    const targetUserId = data[MemberFields.userId];
    const communityId = data[MemberFields.communityId];
    const currentRole = data[MemberFields.role];
    let communityName = 'Comunidad';
    let isEntity = false;
    if (communityId) {
        const meta = await getCommunityMeta(communityId);
        communityName = meta.name;
        isEntity = meta.isEntity;
        await assertCanRemoveOrDemoteManager({
            communityId,
            currentRole,
            nextRole: null,
            communityName,
            isEntity,
        });
    }
    // Notify BEFORE delete so membership-gated rules still allow the inbox write.
    if (targetUserId && communityId) {
        const subjectName = actor.subjectName ?? (await getUserDisplayName(targetUserId));
        await notifyMembershipEvent({
            targetUserId,
            kind: InboxKinds.memberRemoved,
            communityId,
            communityName,
            isEntity,
            actorId: actor.actorId ?? null,
            actorName: actor.actorName ?? null,
            subjectName,
        });
    }
    await runGuardedMemberMutation({
        memberDocId,
        nextRole: null,
        communityName,
        isEntity,
    });
}

export async function adminUpdateMemberRole(memberDocId, role, actor = {}) {
    const r = normalizeRole(role);
    const memberRef = doc(db, Collections.COMMUNITY_MEMBERS, memberDocId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
        throw new Error('Miembro no encontrado');
    }
    const memberData = memberSnap.data() || {};
    const communityId = memberData[MemberFields.communityId];
    if (!communityId) {
        throw new Error('Miembro inválido: falta community_id');
    }
    const allowedRoles = await getAllowedRolesForCommunity(communityId);
    if (!allowedRoles.has(r)) {
        throw new Error('Rol inválido para esta comunidad');
    }
    const { name: communityName, isEntity } = await getCommunityMeta(communityId);
    const mutation = await runGuardedMemberMutation({
        memberDocId,
        nextRole: r,
        communityName,
        isEntity,
    });
    if (
        mutation.applied
        && mutation.targetUserId
        && mutation.previousRole !== r
    ) {
        const subjectName =
            actor.subjectName ?? (await getUserDisplayName(mutation.targetUserId));
        await notifyMembershipEvent({
            targetUserId: mutation.targetUserId,
            kind: InboxKinds.roleChanged,
            communityId: mutation.communityId,
            communityName: mutation.communityName,
            isEntity: mutation.isEntity,
            actorId: actor.actorId ?? null,
            actorName: actor.actorName ?? null,
            subjectName,
            role: r,
            previousRole: mutation.previousRole,
        });
    }
}
