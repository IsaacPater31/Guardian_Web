import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── In-memory name cache: communityId → name ───
let _nameCache = {};
let _cacheLoaded = false;

async function _loadCache() {
    if (_cacheLoaded) return;
    try {
        const snapshot = await getDocs(collection(db, 'communities'));
        for (const doc of snapshot.docs) {
            _nameCache[doc.id] = doc.data().name || doc.id;
        }
        _cacheLoaded = true;
    } catch { /* silent */ }
}

/**
 * Resolve a community ID to its display name.
 * Returns the name (cached after first load) or the raw ID as fallback.
 */
export async function getCommunityName(id) {
    if (!id) return null;
    if (_nameCache[id]) return _nameCache[id];
    await _loadCache();
    return _nameCache[id] || id;
}

// ─── Community Service ───

function parseCommunity(doc) {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name || '',
        description: data.description || null,
        isEntity: data.is_entity || false,
        createdBy: data.created_by || null,
        allowForwardToEntities: data.allow_forward_to_entities ?? true,
        createdAt: data.created_at,
        iconCodePoint: data.icon_code_point || null,
        iconColor: data.icon_color || null,
    };
}

/** Get all communities. */
export async function getAllCommunities() {
    const snapshot = await getDocs(collection(db, 'communities'));
    const communities = snapshot.docs.map(parseCommunity);
    // Populate cache while we're at it
    for (const c of communities) {
        _nameCache[c.id] = c.name;
    }
    _cacheLoaded = true;
    return communities;
}

/** Get member count for a community. */
export async function getCommunityMemberCount(communityId) {
    const q = query(
        collection(db, 'community_members'),
        where('community_id', '==', communityId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

/** Subscribe to communities in real-time. */
export function subscribeToCommunities(callback) {
    return onSnapshot(collection(db, 'communities'), (snapshot) => {
        const communities = snapshot.docs.map(parseCommunity);
        // Keep cache hot
        for (const c of communities) _nameCache[c.id] = c.name;
        callback(communities);
    });
}

/**
 * Get members of a community.
 * Reads from 'community_members' where community_id == communityId.
 *
 * @param {string} communityId
 * @returns {Promise<Array<{ userId, role, joinedAt, displayName, email }>>}
 */
export async function getCommunityMembers(communityId) {
    const q = query(
        collection(db, 'community_members'),
        where('community_id', '==', communityId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            userId: d.user_id || d.userId || null,
            role: d.role || 'member',
            joinedAt: d.joined_at || d.joinedAt || null,
            displayName: d.display_name || d.displayName || d.name || null,
            email: d.email || null,
        };
    });
}

