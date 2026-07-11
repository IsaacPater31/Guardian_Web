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
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Collections } from '../config/collections';
import { CommunityFields, MemberFields, UserFields } from '../config/firestoreFields';
import { extractUserProfileFields } from '../utils/userDocParse';
import { InboxKinds, notifyMembershipEvent } from './inboxNotifyService';

const communitiesCol = () => collection(db, Collections.COMMUNITIES);
const membersCol = () => collection(db, Collections.COMMUNITY_MEMBERS);
const NON_ENTITY_ROLES = new Set([
    MemberFields.roleMember,
    MemberFields.roleAdmin,
]);
const ENTITY_ROLES = new Set([
    MemberFields.roleMember,
    MemberFields.roleOfficial,
]);

// ─── Communities ────────────────────────────────────────────────────────────

export async function adminCreateCommunity({
    name,
    description,
    isEntity,
    allowForwardToEntities,
    createdByUid,
    iconCodePoint,
    iconColor,
    reportButtonColor,
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
    if (reportButtonColor) payload[CommunityFields.reportButtonColor] = String(reportButtonColor);
    if (isEntity) {
        payload[CommunityFields.reportAlertTypes] = Array.isArray(reportAlertTypes)
            ? reportAlertTypes
            : [];
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
    if (patch.reportButtonColor !== undefined) {
        data[CommunityFields.reportButtonColor] = patch.reportButtonColor;
    }
    if (patch.reportAlertTypes !== undefined) {
        data[CommunityFields.reportAlertTypes] = Array.isArray(patch.reportAlertTypes)
            ? patch.reportAlertTypes
            : [];
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

async function getCommunityName(communityId) {
    const communitySnap = await getDoc(doc(db, Collections.COMMUNITIES, communityId));
    if (!communitySnap.exists()) return 'Comunidad';
    return String(communitySnap.data()?.[CommunityFields.name] || 'Comunidad').trim() || 'Comunidad';
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
    const communityName = await getCommunityName(communityId);
    await notifyMembershipEvent({
        targetUserId: userId,
        kind: InboxKinds.memberAdded,
        communityId,
        communityName,
        actorId: actor.actorId ?? null,
        actorName: actor.actorName ?? null,
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
    // Notify BEFORE delete so membership-gated rules still allow the inbox write.
    if (targetUserId && communityId) {
        const communityName = await getCommunityName(communityId);
        await notifyMembershipEvent({
            targetUserId,
            kind: InboxKinds.memberRemoved,
            communityId,
            communityName,
            actorId: actor.actorId ?? null,
            actorName: actor.actorName ?? null,
        });
    }
    await deleteDoc(memberRef);
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
    const previousRole = memberData[MemberFields.role];
    const targetUserId = memberData[MemberFields.userId];
    await updateDoc(memberRef, {
        [MemberFields.role]: r,
    });
    if (targetUserId && previousRole !== r) {
        const communityName = await getCommunityName(communityId);
        await notifyMembershipEvent({
            targetUserId,
            kind: InboxKinds.roleChanged,
            communityId,
            communityName,
            actorId: actor.actorId ?? null,
            actorName: actor.actorName ?? null,
            role: r,
            previousRole,
        });
    }
}

/** @param {import('firebase/firestore').DocumentSnapshot} docSnap */
function parseUserDoc(docSnap) {
    const d = docSnap.data() || {};
    const { displayName, email, createdAt, platformAdmin } = extractUserProfileFields(d);
    let createdAtMs = 0;
    let createdDisplay = '—';
    const ts = createdAt;
    if (ts?.toDate) {
        const dt = ts.toDate();
        createdAtMs = dt.getTime();
        createdDisplay = dt.toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    }
    return {
        id: docSnap.id,
        email,
        displayName,
        createdDisplay,
        createdAtMs,
        platformAdmin,
    };
}

/** Lista usuarios para tabla admin — orden por created_at descendente. */
export async function adminListUsers(limitCount = 40) {
    try {
        const q = query(
            collection(db, Collections.USERS),
            orderBy(UserFields.createdAt, 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(parseUserDoc);
    } catch {
        const snap = await getDocs(collection(db, Collections.USERS));
        const list = snap.docs.map(parseUserDoc);
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        return list.slice(0, limitCount);
    }
}

/**
 * Usuarios cuya fecha de alta (`created_at`) cae en [startDate, endDate], más recientes primero.
 * Si falla la query (índice, etc.), obtiene un lote y filtra en cliente.
 */
export async function adminListUsersInCreatedRange(startDate, endDate, limitCount = 120) {
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(endDate);
    try {
        const q = query(
            collection(db, Collections.USERS),
            where(UserFields.createdAt, '>=', start),
            where(UserFields.createdAt, '<=', end),
            orderBy(UserFields.createdAt, 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(parseUserDoc);
    } catch (e) {
        console.warn('[adminListUsersInCreatedRange] fallback:', e?.message);
        const batchLimit = Math.max(limitCount * 4, 200);
        const all = await adminListUsers(batchLimit);
        const t0 = startDate.getTime();
        const t1 = endDate.getTime();
        return all
            .filter((u) => u.createdAtMs > 0 && u.createdAtMs >= t0 && u.createdAtMs <= t1)
            .slice(0, limitCount);
    }
}

/**
 * Real-time subscription to users created within a date range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {(users: ReturnType<typeof parseUserDoc>[]) => void} callback
 * @param {number} [limitCount=120]
 * @returns {() => void}
 */
export function subscribeUsersInCreatedRange(startDate, endDate, callback, limitCount = 120) {
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(endDate);
    const endMs = endDate.getTime();
    let unsub = () => {};
    let fallbackApplied = false;

    const attach = (withUpperBound) => {
        unsub();
        const constraints = [
            where(UserFields.createdAt, '>=', start),
            orderBy(UserFields.createdAt, 'desc'),
            limit(withUpperBound ? limitCount : Math.max(limitCount * 4, 200)),
        ];
        if (withUpperBound) {
            constraints.splice(1, 0, where(UserFields.createdAt, '<=', end));
        }

        unsub = onSnapshot(
            query(collection(db, Collections.USERS), ...constraints),
            (snap) => {
                let users = snap.docs.map(parseUserDoc);
                if (!withUpperBound) {
                    users = users.filter(
                        (u) => u.createdAtMs > 0 && u.createdAtMs >= startDate.getTime() && u.createdAtMs <= endMs,
                    );
                }
                callback(users.slice(0, limitCount));
            },
            async (error) => {
                if (withUpperBound && !fallbackApplied) {
                    fallbackApplied = true;
                    console.warn('[subscribeUsersInCreatedRange] fallback:', error?.message);
                    attach(false);
                    return;
                }
                console.error('[subscribeUsersInCreatedRange]', error?.message);
                try {
                    callback(await adminListUsersInCreatedRange(startDate, endDate, limitCount));
                } catch {
                    callback([]);
                }
            },
        );
    };

    attach(true);
    return () => unsub();
}
