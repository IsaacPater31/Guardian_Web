/**
 * Soft inbox fan-out → users/{uid}/community_messages
 * Consumed by Guardian feed + Android GuardianBackgroundService (soft channel).
 */
import {
    Timestamp,
    collection,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Collections } from '../config/collections';

export const InboxKinds = Object.freeze({
    communityMessage: 'community_message',
    memberAdded: 'member_added',
    memberRemoved: 'member_removed',
    roleChanged: 'role_changed',
});

const ROLE_LABELS = Object.freeze({
    admin: 'Administrador',
    official: 'Oficial',
    member: 'Miembro',
});

function roleLabel(role) {
    return ROLE_LABELS[String(role || '').toLowerCase()] || String(role || 'Miembro');
}

/**
 * Write one inbox document for a user.
 * Uses client Timestamp so Android orderBy(created_at) sees the doc immediately.
 */
export function batchSetInboxDoc(batch, userId, docId, data) {
    const ref = doc(collection(db, Collections.USERS, userId, 'community_messages'), docId);
    batch.set(ref, {
        ...data,
        read: false,
        created_at: data.created_at ?? Timestamp.now(),
    });
}

/**
 * After kick: delete soft-inbox history for the community, keep member_removed.
 * Also strips alert_inbox copies for that community.
 */
export async function purgeCommunityAccessForUser(userId, communityId) {
    if (!userId || !communityId) return;

    const messagesCol = collection(db, Collections.USERS, userId, 'community_messages');
    const [byIdSnap, byIdsSnap] = await Promise.all([
        getDocs(query(messagesCol, where('community_id', '==', communityId))),
        getDocs(query(messagesCol, where('community_ids', 'array-contains', communityId))),
    ]);

    const msgDocs = new Map();
    for (const d of [...byIdSnap.docs, ...byIdsSnap.docs]) {
        msgDocs.set(d.id, d);
    }

    const msgDeletes = [];
    for (const d of msgDocs.values()) {
        const kind = d.data()?.kind;
        if (kind === InboxKinds.memberRemoved) continue;
        msgDeletes.push(d.ref);
    }

    for (let i = 0; i < msgDeletes.length; i += 400) {
        const batch = writeBatch(db);
        msgDeletes.slice(i, i + 400).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }

    const alertInboxCol = collection(db, Collections.USERS, userId, 'alert_inbox');
    const alertSnap = await getDocs(
        query(alertInboxCol, where('community_ids', 'array-contains', communityId)),
    );

    for (let i = 0; i < alertSnap.docs.length; i += 400) {
        const chunk = alertSnap.docs.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const d of chunk) {
            const ids = Array.isArray(d.data()?.community_ids)
                ? d.data().community_ids.map(String)
                : [];
            const remaining = ids.filter((id) => id !== communityId);
            if (remaining.length === 0) {
                batch.delete(d.ref);
            } else {
                batch.update(d.ref, { community_ids: remaining });
            }
        }
        await batch.commit();
    }
}

export async function notifyMembershipEvent({
    targetUserId,
    kind,
    communityId,
    communityName,
    actorId = null,
    actorName = null,
    role = null,
    previousRole = null,
}) {
    if (!targetUserId || !communityId || !kind) return;

    const name = (communityName || 'tu comunidad').trim() || 'tu comunidad';
    let title = 'Comunidad';
    let body = '';

    switch (kind) {
        case InboxKinds.memberAdded:
            title = 'Te agregaron a una comunidad';
            body = `Ahora formas parte de ${name}.`;
            break;
        case InboxKinds.memberRemoved:
            title = 'Te eliminaron de una comunidad';
            body = `Ya no formas parte de ${name}.`;
            break;
        case InboxKinds.roleChanged:
            title = 'Tu rol cambió';
            body = previousRole
                ? `En ${name} pasaste de ${roleLabel(previousRole)} a ${roleLabel(role)}.`
                : `En ${name} tu rol ahora es ${roleLabel(role)}.`;
            break;
        default:
            return;
    }

    const batch = writeBatch(db);
    const docId = `${kind}_${communityId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    batchSetInboxDoc(batch, targetUserId, docId, {
        kind,
        community_id: communityId,
        community_name: name,
        community_ids: [communityId],
        title,
        body,
        sender_id: actorId,
        sender_name: actorName,
        role: role || null,
        previous_role: previousRole || null,
        target_user_id: targetUserId,
    });
    await batch.commit();

    if (kind === InboxKinds.memberRemoved) {
        await purgeCommunityAccessForUser(targetUserId, communityId);
    }
}
