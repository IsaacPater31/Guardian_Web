import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
    documentId,
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
    const members = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            userId: d.user_id || d.userId || null,
            role: d.role || 'member',
            joinedAt: d.joined_at || d.joinedAt || null,
            displayName: d.display_name || d.displayName || d.full_name || d.name || null,
            email: d.email || d.user_email || null,
        };
    });

    const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))];
    if (userIds.length === 0) return members;

    const userMap = new Map();
    try {
        for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)));
            usersSnap.forEach((userDoc) => {
                userMap.set(userDoc.id, userDoc.data());
            });
        }
    } catch {
        // Some projects don't have a public 'users' collection (names come from Auth).
    }

    // Fallback: enrich names from recent alerts (alerts contain userName/userEmail).
    const alertUserMap = new Map(); // userId -> { userName, userEmail }
    try {
        for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const alertsSnap = await getDocs(query(collection(db, 'alerts'), where('userId', 'in', batch)));
            alertsSnap.forEach((aDoc) => {
                const d = aDoc.data();
                const uid = d.userId;
                if (!uid || alertUserMap.has(uid)) return;
                alertUserMap.set(uid, { userName: d.userName || null, userEmail: d.userEmail || null });
            });
        }
    } catch {
        // ignore
    }

    return members.map((member) => {
        const u = member.userId ? userMap.get(member.userId) : null;
        const au = member.userId ? alertUserMap.get(member.userId) : null;
        return {
            ...member,
            displayName:
                member.displayName ||
                u?.display_name || u?.displayName || u?.full_name || u?.name ||
                au?.userName ||
                null,
            email:
                member.email ||
                u?.email ||
                au?.userEmail ||
                null,
        };
    });
}

