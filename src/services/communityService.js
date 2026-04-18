/**
 * communityService.js — Firestore data-access layer for communities.
 * Refactored to use the Collections config instead of hardcoded strings.
 */

import {
    collection, getDocs, query, where,
    onSnapshot, documentId,
} from 'firebase/firestore';
import { db }          from '../firebase';
import { Collections } from '../config/collections';

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

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseCommunity(doc) {
    const d = doc.data();
    return {
        id:                     doc.id,
        name:                   d.name                     || '',
        description:            d.description              ?? null,
        isEntity:               d.is_entity                ?? false,
        createdBy:              d.created_by               ?? null,
        allowForwardToEntities: d.allow_forward_to_entities ?? true,
        createdAt:              d.created_at               ?? null,
        iconCodePoint:          d.icon_code_point          ?? null,
        iconColor:              d.icon_color               ?? null,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch all communities (one-shot). */
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
        where('community_id', '==', communityId)
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

/**
 * Fetch members of a community, enriched with display names from users/alerts.
 *
 * @param {string} communityId
 * @returns {Promise<Array<{
 *   id: string, userId: string|null, role: string,
 *   joinedAt: any, displayName: string|null, email: string|null,
 * }>>}
 */
export async function getCommunityMembers(communityId) {
    const q        = query(
        collection(db, Collections.COMMUNITY_MEMBERS),
        where('community_id', '==', communityId)
    );
    const snapshot = await getDocs(q);

    const members = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id:          doc.id,
            userId:      d.user_id      || d.userId      || null,
            role:        d.role                          || 'member',
            joinedAt:    d.joined_at    || d.joinedAt    || null,
            displayName: d.display_name || d.displayName || d.full_name || d.name || null,
            email:       d.email        || d.user_email  || null,
        };
    });

    const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))];
    if (userIds.length === 0) return members;

    // Enrich names from the users collection (batched in groups of 10 — Firestore `in` limit)
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

    // Fallback: enrich from alert documents (they store userName/userEmail)
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
        return {
            ...m,
            displayName:
                m.displayName            ||
                u?.display_name          || u?.displayName || u?.full_name || u?.name ||
                au?.userName             ||
                null,
            email:
                m.email      ||
                u?.email     ||
                au?.userEmail ||
                null,
        };
    });
}
