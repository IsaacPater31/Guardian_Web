/**
 * CRUD comunidades y miembros — mismos campos que Guardian móvil.
 * Requiere reglas Firestore que permitan escrituras solo a platform admins.
 */
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Collections } from '../config/collections';
import { CommunityFields, MemberFields, UserFields } from '../config/firestoreFields';

const communitiesCol = () => collection(db, Collections.COMMUNITIES);
const membersCol = () => collection(db, Collections.COMMUNITY_MEMBERS);

// ─── Communities ────────────────────────────────────────────────────────────

export async function adminCreateCommunity({
    name,
    description,
    isEntity,
    allowForwardToEntities,
    createdByUid,
    iconCodePoint,
    iconColor,
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

const VALID_ROLES = new Set(['member', 'admin', 'official']);

/**
 * @param {string} communityId
 * @param {string} userId — Firebase Auth UID
 * @param {'member'|'admin'|'official'} role
 */
export async function adminAddCommunityMember(communityId, userId, role) {
    const r = VALID_ROLES.has(role) ? role : MemberFields.roleMember;
    await addDoc(membersCol(), {
        [MemberFields.communityId]: communityId,
        [MemberFields.userId]: userId,
        [MemberFields.role]: r,
        [MemberFields.joinedAt]: serverTimestamp(),
    });
}

export async function adminRemoveMember(memberDocId) {
    await deleteDoc(doc(db, Collections.COMMUNITY_MEMBERS, memberDocId));
}

export async function adminUpdateMemberRole(memberDocId, role) {
    if (!VALID_ROLES.has(role)) return;
    await updateDoc(doc(db, Collections.COMMUNITY_MEMBERS, memberDocId), {
        [MemberFields.role]: role,
    });
}

/** @param {import('firebase/firestore').DocumentSnapshot} docSnap */
function parseUserDoc(docSnap) {
    const d = docSnap.data();
    const ts = d[UserFields.createdAt] ?? d.created_at;
    let createdAtMs = 0;
    let createdDisplay = '—';
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
        email: d.email ?? null,
        displayName: d.displayName ?? d.full_name ?? d.name ?? null,
        createdDisplay,
        createdAtMs,
        platformAdmin: d[UserFields.platformAdmin] === true,
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
