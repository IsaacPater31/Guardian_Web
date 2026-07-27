/**
 * communityService.js — Firestore data-access layer for communities.
 * Refactored to use the Collections config instead of hardcoded strings.
 */

import {
    collection, doc, getDocs, getCountFromServer, query, where,
    onSnapshot, documentId, orderBy, limit, startAfter,
} from 'firebase/firestore';
import { db }          from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { CommunityFields, MemberFields } from '@/shared/config/firestoreFields';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import { fromDoc as parseCommunity } from '@/features/communities/mapper/communityMapper';
import { resolveMemberDisplayLabel } from '@/shared/utils/memberDisplayLabel';
import { extractUserProfileFields } from '@/shared/utils/userDocParse';

// ─── In-memory name cache: communityId → name ─────────────────────────────────
let _nameCache  = {};
let _cacheReady = false;

async function _warmCache() {
    if (_cacheReady) return;
    try {
        const snapshot = await getDocs(collection(db, Collections.COMMUNITIES));
        for (const doc of snapshot.docs) {
            _nameCache[doc.id] = doc.data().name || doc.id;
        }
        _cacheReady = true;
    } catch { /* Network unavailable — degrade gracefully */ }
}

/**
 * Resolve a community ID to its display name (cached after first call).
 *
 * @param {string|null} id
 * @returns {Promise<string|null>}
 */
export async function getCommunityName(id) {
    if (!id) return null;
    if (_nameCache[id]) return _nameCache[id];
    await _warmCache();
    return _nameCache[id] ?? 'Comunidad eliminada o inexistente';
}

/**
 * Resolve multiple community IDs to their display names in a single pass.
 * Reuses the same in-memory cache — only warms the cache once even if
 * called with many IDs.
 *
 * @param {string[]} ids
 * @returns {Promise<{ id: string, name: string }[]>}
 */
export async function getCommunityNames(ids) {
    if (!ids || ids.length === 0) return [];
    await _warmCache();
    return ids.map((id) => ({
        id,
        name: _nameCache[id] ?? 'Comunidad desconocida',
    }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Página de comunidades ordenadas por nombre (lecturas acotadas).
 * @param {{ pageSize?: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot | null }} [opts]
 */
export async function fetchCommunitiesPage({ pageSize = ADMIN_LIST_PAGE_SIZE, cursor = null } = {}) {
    const constraints = [orderBy(CommunityFields.name)];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(collection(db, Collections.COMMUNITIES), ...constraints));
    const items = snapshot.docs.map(parseCommunity);
    const lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;
    return {
        items,
        lastDoc,
        hasMore: snapshot.docs.length === pageSize,
    };
}

/** Conteo agregado sin leer cada documento. */
export async function getCommunitiesCount() {
    const snap = await getCountFromServer(collection(db, Collections.COMMUNITIES));
    return snap.data().count;
}

/** Fetch all communities (one-shot). Preferir {@link fetchCommunitiesPage} en listados grandes. */
export async function getAllCommunities() {
    const snapshot    = await getDocs(collection(db, Collections.COMMUNITIES));
    const communities = snapshot.docs.map(parseCommunity);
    // Keep cache warm
    for (const c of communities) _nameCache[c.id] = c.name;
    _cacheReady = true;
    return communities;
}

/** Member count for a community. */
export async function getCommunityMemberCount(communityId) {
    const q        = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.communityId, '==', communityId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

/** Real-time subscription to all communities. */
export function subscribeToCommunities(callback) {
    return onSnapshot(collection(db, Collections.COMMUNITIES), (snapshot) => {
        const communities = snapshot.docs.map(parseCommunity);
        for (const c of communities) _nameCache[c.id] = c.name;
        callback(communities);
    });
}

function membersFromSnapshot(snapshot) {
    return snapshot.docs.map((memberDoc) => {
        const d = memberDoc.data();
        return {
            id:          memberDoc.id,
            userId:      d[MemberFields.userId] ?? d.user_id ?? d.userId ?? null,
            role:        d[MemberFields.role] ?? d.role ?? 'member',
            joinedAt:    d[MemberFields.joinedAt] ?? d.joined_at ?? d.joinedAt ?? null,
            alias:       d[MemberFields.alias] ?? d.alias ?? null,
            displayName: d.display_name || d.displayName || d.full_name || d.name || null,
            email:       d.email        || d.user_email  || null,
        };
    });
}

async function enrichMembers(members) {
    const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))];
    if (userIds.length === 0) return members;

    const userMap = new Map();
    try {
        for (let i = 0; i < userIds.length; i += 10) {
            const batch  = userIds.slice(i, i + 10);
            const snap   = await getDocs(
                query(collection(db, Collections.USERS), where(documentId(), 'in', batch))
            );
            snap.forEach((d) => userMap.set(d.id, d.data()));
        }
    } catch { /* users collection may not be public */ }

    const alertUserMap = new Map();
    try {
        for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const snap  = await getDocs(
                query(collection(db, Collections.ALERTS), where('userId', 'in', batch))
            );
            snap.forEach((d) => {
                const data = d.data();
                const uid  = data.userId;
                if (!uid || alertUserMap.has(uid)) return;
                alertUserMap.set(uid, { userName: data.userName ?? null, userEmail: data.userEmail ?? null });
            });
        }
    } catch { /* ignore */ }

    return members.map((m) => {
        const u  = m.userId ? userMap.get(m.userId)      : null;
        const au = m.userId ? alertUserMap.get(m.userId) : null;
        const profileName =
            m.displayName            ||
            u?.display_name          || u?.displayName || u?.full_name || u?.name ||
            au?.userName             ||
            null;
        const email =
            m.email      ||
            u?.email     ||
            au?.userEmail ||
            null;
        const alias = m.alias ?? null;
        return {
            ...m,
            alias,
            profileName,
            displayName: resolveMemberDisplayLabel({
                alias,
                displayName: profileName,
                fallback: email || 'Usuario',
            }),
            email,
        };
    });
}

/**
 * Nombres de admin(s) / oficiales por comunidad.
 * Incluye role `admin` y, en entidades, `official`.
 * Fallback sin índice compuesto: lee miembros y filtra en cliente.
 *
 * @param {Array<{ id: string, name?: string|null, createdBy?: string|null, isEntity?: boolean }>} communities
 * @returns {Promise<Record<string, string[]>>}
 */
export async function resolveCommunityAdminNames(communities) {
    const targets = (communities || []).filter((c) => c?.id);
    if (targets.length === 0) return {};

    /** @type {Record<string, string[]>} */
    const result = {};

    await Promise.all(targets.map(async (c) => {
        const names = [];
        try {
            const userIds = await listManagerUserIds(c);
            if (userIds.length === 0 && c.createdBy) {
                userIds.push(c.createdBy);
            }
            const nameById = await loadDisplayNames(userIds);
            for (const uid of userIds) {
                const n = nameById.get(uid);
                if (n) names.push(n);
            }
        } catch (err) {
            console.warn('[resolveCommunityAdminNames]', c.id, err);
        }
        result[c.id] = names;
    }));

    return result;
}

/**
 * @param {{ id: string, isEntity?: boolean }} community
 * @returns {Promise<string[]>}
 */
async function listManagerUserIds(community) {
    const managerRoles = new Set([
        MemberFields.roleAdmin,
        ...(community.isEntity ? [MemberFields.roleOfficial] : []),
    ]);

    try {
        const snaps = await Promise.all(
            [...managerRoles].map((role) => getDocs(
                query(
                    collection(db, Collections.COMMUNITY_MEMBERS),
                    where(MemberFields.communityId, '==', community.id),
                    where(MemberFields.role, '==', role),
                ),
            )),
        );
        return [...new Set(
            snaps.flatMap((snap) => snap.docs.map((d) => {
                const data = d.data() || {};
                return data[MemberFields.userId] || data.user_id || null;
            }).filter(Boolean)),
        )];
    } catch {
        const snap = await getDocs(
            query(
                collection(db, Collections.COMMUNITY_MEMBERS),
                where(MemberFields.communityId, '==', community.id),
            ),
        );
        return [...new Set(
            snap.docs
                .map((d) => {
                    const data = d.data() || {};
                    const role = data[MemberFields.role] || data.role;
                    if (!managerRoles.has(role)) return null;
                    return data[MemberFields.userId] || data.user_id || null;
                })
                .filter(Boolean),
        )];
    }
}

/**
 * @param {string[]} userIds
 * @returns {Promise<Map<string, string>>}
 */
async function loadDisplayNames(userIds) {
    const map = new Map();
    if (!userIds.length) return map;
    try {
        for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const usersSnap = await getDocs(
                query(collection(db, Collections.USERS), where(documentId(), 'in', batch)),
            );
            usersSnap.forEach((u) => {
                const { displayName, email } = extractUserProfileFields(u.data() || {});
                const label = (displayName || email || '').trim();
                if (label) map.set(u.id, label);
            });
        }
    } catch (err) {
        console.warn('[loadDisplayNames]', err);
    }
    return map;
}

/**
 * Mapa `userId → alias` para una comunidad (alertas / remitentes).
 *
 * @param {string} communityId
 * @returns {Promise<Record<string, string>>}
 */
export async function getMemberAliasMap(communityId) {
    const q = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.communityId, '==', communityId),
    );
    const snapshot = await getDocs(q);
    const map = {};
    for (const memberDoc of snapshot.docs) {
        const d = memberDoc.data();
        const uid = d[MemberFields.userId] ?? d.user_id ?? d.userId ?? '';
        const raw = d[MemberFields.alias] ?? d.alias;
        if (!uid || typeof raw !== 'string') continue;
        const a = raw.trim();
        if (a) map[uid] = a;
    }
    return map;
}

/**
 * Fetch members of a community, enriched with display names from users/alerts.
 *
 * @param {string} communityId
 * @returns {Promise<Array<{
 *   id: string, userId: string|null, role: string,
 *   joinedAt: any, alias: string|null, profileName: string|null,
 *   displayName: string, email: string|null,
 * }>>}
 */
export async function getCommunityMembers(communityId) {
    const q        = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.communityId, '==', communityId)
    );
    const snapshot = await getDocs(q);
    return enrichMembers(membersFromSnapshot(snapshot));
}

/** Real-time subscription to community members (enriched). */
export function subscribeCommunityMembers(communityId, callback) {
    const q = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.communityId, '==', communityId),
    );
    return onSnapshot(
        q,
        async (snapshot) => {
            try {
                callback(await enrichMembers(membersFromSnapshot(snapshot)));
            } catch (e) {
                console.error('[communityService] subscribeCommunityMembers', e);
                callback(membersFromSnapshot(snapshot));
            }
        },
        (e) => {
            console.error('[communityService] subscribeCommunityMembers', e);
            callback([]);
        },
    );
}

/** Real-time member count for a community. */
export function subscribeCommunityMemberCount(communityId, callback) {
    const q = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where(MemberFields.communityId, '==', communityId),
    );
    return onSnapshot(
        q,
        (snapshot) => callback(snapshot.size),
        () => callback(0),
    );
}

/** Real-time subscription to a single community document. */
export function subscribeCommunity(communityId, callback) {
    return onSnapshot(
        doc(db, Collections.COMMUNITIES, communityId),
        (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            const community = parseCommunity(snap);
            _nameCache[community.id] = community.name;
            callback(community);
        },
        () => callback(null),
    );
}
