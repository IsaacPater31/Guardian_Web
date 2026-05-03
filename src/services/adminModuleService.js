/**
 * Panel «Módulo admin»: totales, búsqueda usuario ↔ comunidades.
 * Mismas colecciones/campos que Guardian (`collections.js`, `firestoreFields.js`).
 */
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getCountFromServer,
    query,
    where,
    limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Collections } from '../config/collections';
import { MemberFields, UserFields } from '../config/firestoreFields';
import { getAllCommunities, getCommunityMembers, getCommunityName } from './communityService';
import { extractUserProfileFields } from '../utils/userDocParse';

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
 * Lista todos los documentos de `users`.
 *
 * No usar `orderBy(created_at)` en servidor: en Firestore los docs **sin** ese campo
 * no entran en el resultado y desaparecen del panel (p. ej. perfiles viejos o solo correo).
 */
export async function fetchAllUsers() {
    const snap = await getDocs(collection(db, Collections.USERS));
    const list = snap.docs.map(parseUserSnap);
    list.sort((a, b) => createdAtSortKey(b.createdAt) - createdAtSortKey(a.createdAt));
    return list;
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
    const snap = await getDocs(collection(db, Collections.USERS));
    for (const d of snap.docs) {
        const u = parseUserSnap(d);
        if (userMatchesText(u, d, qLower)) return u;
    }
    return null;
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

    const all = await getAllCommunities();
    const lower = raw.toLowerCase();
    const hit =
        all.find((c) => c.id === raw) ||
        all.find((c) => (c.name || '').toLowerCase().includes(lower));
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
