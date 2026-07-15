/**
 * Panel «Módulo admin»: totales, búsqueda usuario ↔ comunidades.
 * Mismas colecciones/campos que Guardian (`collections.js`, `firestoreFields.js`).
 */
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    getCountFromServer,
    query,
    where,
    limit,
    orderBy,
    startAfter,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { MemberFields, UserFields } from '@/shared/config/firestoreFields';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import { fetchCommunitiesPage, getCommunityMembers, getCommunityName } from '@/features/communities/repository/communityRepository';
import { extractUserProfileFields } from '@/shared/utils/userDocParse';

function parseUserSnap(docSnap) {
    const d = docSnap.data() || {};
    return {
        id: docSnap.id,
        ...extractUserProfileFields(d),
    };
}

function userMatchesText(u, docSnap, qLower) {
    if (!qLower) return false;
    if (u.email?.toLowerCase().includes(qLower)) return true;
    if (u.displayName?.toLowerCase().includes(qLower)) return true;
    if (u.phone?.replace(/\s/g, '').includes(qLower.replace(/\s/g, ''))) return true;
    if (docSnap.id.toLowerCase().includes(qLower)) return true;
    return false;
}

function createdAtSortKey(ts) {
    if (ts == null) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    return 0;
}

/**
 * Página del directorio de usuarios (lecturas acotadas).
 *
 * Orden principal: `created_at` desc. Si falla (índice / campo ausente), cae a `documentId`.
 * Perfiles sin `created_at` pueden no aparecer en el listado paginado; usar búsqueda.
 *
 * @param {{ pageSize?: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot | null }} [opts]
 * @returns {Promise<{ items: Array<any>, lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null, hasMore: boolean }>}
 */
export async function fetchUsersPage({ pageSize = ADMIN_LIST_PAGE_SIZE, cursor = null } = {}) {
    const run = async (field, direction = 'desc') => {
        const constraints = [orderBy(field, direction), limit(pageSize)];
        if (cursor) constraints.push(startAfter(cursor));
        const snap = await getDocs(query(collection(db, Collections.USERS), ...constraints));
        const items = snap.docs.map(parseUserSnap);
        if (field === UserFields.createdAt) {
            items.sort((a, b) => createdAtSortKey(b.createdAt) - createdAtSortKey(a.createdAt));
        }
        const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        return {
            items,
            lastDoc,
            hasMore: snap.docs.length === pageSize,
        };
    };

    try {
        return await run(UserFields.createdAt, 'desc');
    } catch {
        return run(documentId(), 'asc');
    }
}

/** @returns {{ users: number, communities: number }} */
export async function fetchRegistryCounts() {
    const [u, c] = await Promise.all([
        getCountFromServer(collection(db, Collections.USERS)),
        getCountFromServer(collection(db, Collections.COMMUNITIES)),
    ]);
    return {
        users: u.data().count,
        communities: c.data().count,
    };
}


/**
 * Busca un usuario por UID exacto, email exacto o texto en nombre/email (lote reciente).
 * @param {string} searchText
 */
export async function findUserBySearch(searchText) {
    const raw = searchText.trim();
    if (!raw) return null;

    const byId = await getDoc(doc(db, Collections.USERS, raw));
    if (byId.exists()) return parseUserSnap(byId);

    const emailLower = raw.toLowerCase();
    try {
        const q1 = query(
            collection(db, Collections.USERS),
            where(UserFields.email, '==', emailLower),
            limit(1)
        );
        const snapE = await getDocs(q1);
        if (!snapE.empty) return parseUserSnap(snapE.docs[0]);
    } catch {
        /* sin índice o sin permiso */
    }
    if (raw.includes('@')) {
        try {
            const q2 = query(
                collection(db, Collections.USERS),
                where(UserFields.email, '==', raw.trim()),
                limit(1)
            );
            const snapE2 = await getDocs(q2);
            if (!snapE2.empty) return parseUserSnap(snapE2.docs[0]);
        } catch {
            /* misma query alternativa */
        }
    }

    const qLower = raw.toLowerCase();
    try {
        const snap = await getDocs(
            query(collection(db, Collections.USERS), orderBy(documentId()), limit(500))
        );
        for (const d of snap.docs) {
            const u = parseUserSnap(d);
            if (userMatchesText(u, d, qLower)) return u;
        }
    } catch {
        /* sin permiso */
    }
    return null;
}

/**
 * Busca usuarios por nombre, correo o UID (hasta 10 coincidencias).
 * Excluye miembros ya presentes en [excludeCommunityId] si se indica.
 * @param {string} searchText
 * @param {{ excludeCommunityId?: string, limit?: number }} [opts]
 */
export async function searchUsersByText(searchText, { excludeCommunityId, limit: max = 10 } = {}) {
    const raw = searchText.trim();
    if (raw.length < 2) return [];

    const qLower = raw.toLowerCase();
    const results = [];
    const added = new Set();

    const pushUser = (u) => {
        if (!u?.id || added.has(u.id)) return;
        added.add(u.id);
        results.push(u);
    };

    const exact = await findUserBySearch(raw);
    if (exact) pushUser(exact);
    if (results.length >= max) return results.slice(0, max);

    let existingMemberIds = new Set();
    if (excludeCommunityId) {
        try {
            const members = await getCommunityMembers(excludeCommunityId);
            existingMemberIds = new Set(
                members.map((m) => m.userId).filter(Boolean)
            );
        } catch {
            /* sin permiso */
        }
    }

    const tryEmail = async (email) => {
        if (!email || results.length >= max) return;
        try {
            const q = query(
                collection(db, Collections.USERS),
                where(UserFields.email, '==', email),
                limit(5)
            );
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                if (results.length >= max) break;
                const u = parseUserSnap(d);
                if (!existingMemberIds.has(u.id)) pushUser(u);
            }
        } catch {
            /* sin índice */
        }
    };

    if (raw.includes('@')) {
        await tryEmail(raw.trim());
        await tryEmail(qLower);
        if (results.length >= max) return results.slice(0, max);
    }

    try {
        const snap = await getDocs(
            query(collection(db, Collections.USERS), orderBy(documentId()), limit(500))
        );
        for (const d of snap.docs) {
            if (results.length >= max) break;
            const u = parseUserSnap(d);
            if (existingMemberIds.has(u.id)) continue;
            if (userMatchesText(u, d, qLower)) pushUser(u);
        }
    } catch {
        /* sin permiso */
    }

    return results.slice(0, max);
}

/**
 * Membresías de un usuario con nombre de comunidad.
 * @param {string} userId
 */
export async function listCommunitiesForUser(userId) {
    if (!userId) return [];
    const q = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.userId, '==', userId)
    );
    const snap = await getDocs(q);
    const out = [];
    for (const d of snap.docs) {
        const data = d.data();
        const cid = data[MemberFields.communityId];
        const name = await getCommunityName(cid);
        out.push({
            memberDocId: d.id,
            communityId: cid,
            communityName: name,
            role: data[MemberFields.role] || 'member',
        });
    }
    return out;
}

/**
 * Comunidad por ID de documento o nombre parcial (lista en memoria).
 * @param {string} searchText
 */
export async function findCommunityBySearch(searchText) {
    const raw = searchText.trim();
    if (!raw) return null;

    const direct = await getDoc(doc(db, Collections.COMMUNITIES, raw));
    if (direct.exists()) {
        const d = direct.data();
        return {
            id: direct.id,
            name: d.name || direct.id,
            description: d.description ?? null,
            isEntity: !!d.is_entity,
        };
    }

    const lower = raw.toLowerCase();
    let hit = null;
    try {
        const page = await fetchCommunitiesPage({ pageSize: 200 });
        hit =
            page.items.find((c) => c.id === raw) ||
            page.items.find((c) => (c.name || '').toLowerCase().includes(lower));
    } catch {
        /* sin permiso */
    }
    return hit
        ? {
              id: hit.id,
              name: hit.name,
              description: hit.description,
              isEntity: !!hit.isEntity,
          }
        : null;
}

/** Miembros enriquecidos (misma API que detalle de comunidad). */
export function fetchCommunityMembersEnriched(communityId) {
    return getCommunityMembers(communityId);
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
 * Real-time subscription to users created within a date range (Dashboard).
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
