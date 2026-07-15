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
import { db } from '@/shared/api/firebase';
import { Collections, UserSubcollections } from '@/shared/config/collections';
import { MemberFields } from '@/shared/config/firestoreFields';

export const InboxKinds = Object.freeze({
    communityMessage: 'community_message',
    memberAdded: 'member_added',
    memberRemoved: 'member_removed',
    roleChanged: 'role_changed',
    memberLeft: 'member_left',
});

const ROLE_LABELS = Object.freeze({
    admin: 'Administrador',
    official: 'Oficial',
    member: 'Miembro',
});

function roleLabel(role) {
    return ROLE_LABELS[String(role || '').toLowerCase()] || String(role || 'Miembro');
}

function subjectLabel(subjectName) {
    const n = String(subjectName || '').trim();
    return n || 'Alguien';
}

/**
 * Target-facing copy (the affected member).
 */
function buildTargetCopy({ kind, isEntity, name, role, previousRole }) {
    if (isEntity) {
        switch (kind) {
            case InboxKinds.memberAdded:
                return {
                    title: 'Te agregaron a un reporte',
                    body: `Ahora formas parte de ${name}.`,
                };
            case InboxKinds.memberRemoved:
                return {
                    title: 'Te eliminaron de un reporte',
                    body: `Ya no formas parte del reporte ${name}.`,
                };
            case InboxKinds.roleChanged:
                return {
                    title: 'Tu rol cambió',
                    body: previousRole
                        ? `En el reporte ${name} pasaste de ${roleLabel(previousRole)} a ${roleLabel(role)}.`
                        : `Tu rol cambió en el reporte ${name}. Ahora eres ${roleLabel(role)}.`,
                };
            default:
                return null;
        }
    }

    switch (kind) {
        case InboxKinds.memberAdded:
            return {
                title: 'Te agregaron a una comunidad',
                body: `Ahora formas parte de ${name}.`,
            };
        case InboxKinds.memberRemoved:
            return {
                title: 'Te eliminaron de una comunidad',
                body: `Ya no formas parte de ${name}.`,
            };
        case InboxKinds.roleChanged:
            return {
                title: 'Tu rol cambió',
                body: previousRole
                    ? `En ${name} pasaste de ${roleLabel(previousRole)} a ${roleLabel(role)}.`
                    : `En ${name} tu rol ahora es ${roleLabel(role)}.`,
            };
        default:
            return null;
    }
}

/**
 * Manager-facing copy (admins / officials).
 */
function buildManagerCopy({ kind, isEntity, name, subjectName, role, previousRole }) {
    const who = subjectLabel(subjectName);
    if (isEntity) {
        switch (kind) {
            case InboxKinds.memberAdded:
                return {
                    title: 'Nuevo miembro en reporte',
                    body: `${who} se unió al reporte ${name}.`,
                };
            case InboxKinds.memberRemoved:
                return {
                    title: 'Miembro eliminado',
                    body: `${who} fue eliminado/a del reporte ${name}.`,
                };
            case InboxKinds.memberLeft:
                return {
                    title: 'Miembro salió',
                    body: `${who} abandonó el reporte ${name}.`,
                };
            case InboxKinds.roleChanged:
                return {
                    title: 'Cambio de rol',
                    body: previousRole
                        ? `${who} pasó de ${roleLabel(previousRole)} a ${roleLabel(role)} en el reporte ${name}.`
                        : `${who} ahora es ${roleLabel(role)} en el reporte ${name}.`,
                };
            default:
                return null;
        }
    }

    switch (kind) {
        case InboxKinds.memberAdded:
            return {
                title: 'Nuevo miembro',
                body: `${who} se unió a la comunidad ${name}.`,
            };
        case InboxKinds.memberRemoved:
            return {
                title: 'Miembro eliminado',
                body: `${who} fue eliminado/a de la comunidad ${name}.`,
            };
        case InboxKinds.memberLeft:
            return {
                title: 'Miembro salió',
                body: `${who} abandonó la comunidad ${name}.`,
            };
        case InboxKinds.roleChanged:
            return {
                title: 'Cambio de rol',
                body: previousRole
                    ? `${who} pasó de ${roleLabel(previousRole)} a ${roleLabel(role)} en ${name}.`
                    : `${who} ahora es ${roleLabel(role)} en ${name}.`,
            };
        default:
            return null;
    }
}

/**
 * Write one inbox document for a user.
 * Uses client Timestamp so Android orderBy(created_at) sees the doc immediately.
 */
export function batchSetInboxDoc(batch, userId, docId, data) {
    const ref = doc(collection(db, Collections.USERS, userId, UserSubcollections.COMMUNITY_MESSAGES), docId);
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

    const messagesCol = collection(db, Collections.USERS, userId, UserSubcollections.COMMUNITY_MESSAGES);
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

    const alertInboxCol = collection(db, Collections.USERS, userId, UserSubcollections.ALERT_INBOX);
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

async function queryManagerUserIds(communityId, isEntity) {
    const managerRole = isEntity ? MemberFields.roleOfficial : MemberFields.roleAdmin;
    const snap = await getDocs(
        query(
            collection(db, Collections.COMMUNITY_MEMBERS),
            where(MemberFields.communityId, '==', communityId),
            where(MemberFields.role, '==', managerRole),
        ),
    );
    return snap.docs
        .map((d) => d.data()?.[MemberFields.userId])
        .filter(Boolean)
        .map(String);
}

function newInboxDocId(kind, communityId) {
    return `${kind}_${communityId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Notify target user and/or managers about a membership event.
 *
 * @param {object} opts
 * @param {string} opts.targetUserId - Affected member
 * @param {string} opts.kind
 * @param {string} opts.communityId
 * @param {string} [opts.communityName]
 * @param {boolean} [opts.isEntity=false]
 * @param {string|null} [opts.actorId]
 * @param {string|null} [opts.actorName]
 * @param {string|null} [opts.subjectName] - Display name of affected member (for managers)
 * @param {string|null} [opts.role]
 * @param {string|null} [opts.previousRole]
 * @param {boolean} [opts.notifyTarget=true]
 * @param {boolean} [opts.notifyManagers=true]
 * @param {boolean} [opts.purgeTargetOnRemove=true]
 */
export async function notifyMembershipEvent({
    targetUserId,
    kind,
    communityId,
    communityName,
    isEntity = false,
    actorId = null,
    actorName = null,
    subjectName = null,
    role = null,
    previousRole = null,
    notifyTarget = true,
    notifyManagers = true,
    purgeTargetOnRemove = true,
}) {
    if (!communityId || !kind) return;
    if (!targetUserId && notifyTarget) return;

    const name = (communityName || (isEntity ? 'tu reporte' : 'tu comunidad')).trim()
        || (isEntity ? 'tu reporte' : 'tu comunidad');

    const basePayload = {
        kind,
        community_id: communityId,
        community_name: name,
        community_ids: [communityId],
        sender_id: actorId,
        sender_name: actorName,
        role: role || null,
        previous_role: previousRole || null,
        target_user_id: targetUserId || null,
        subject_name: subjectName || null,
        is_entity: Boolean(isEntity),
    };

    const batch = writeBatch(db);
    let writes = 0;

    if (notifyTarget && targetUserId) {
        const copy = buildTargetCopy({ kind, isEntity, name, role, previousRole });
        if (copy) {
            batchSetInboxDoc(batch, targetUserId, newInboxDocId(kind, communityId), {
                ...basePayload,
                title: copy.title,
                body: copy.body,
            });
            writes += 1;
        }
    }

    if (notifyManagers) {
        const managerKind = kind === InboxKinds.memberLeft ? InboxKinds.memberLeft : kind;
        const copy = buildManagerCopy({
            kind: managerKind,
            isEntity,
            name,
            subjectName: subjectName || actorName,
            role,
            previousRole,
        });
        if (copy) {
            const managers = await queryManagerUserIds(communityId, isEntity);
            const exclude = new Set(
                [targetUserId, actorId].filter(Boolean).map(String),
            );
            for (const managerId of managers) {
                if (exclude.has(managerId)) continue;
                batchSetInboxDoc(batch, managerId, newInboxDocId(managerKind, communityId), {
                    ...basePayload,
                    kind: managerKind,
                    title: copy.title,
                    body: copy.body,
                });
                writes += 1;
            }
        }
    }

    if (writes > 0) {
        await batch.commit();
    }

    if (
        purgeTargetOnRemove
        && notifyTarget
        && targetUserId
        && kind === InboxKinds.memberRemoved
    ) {
        await purgeCommunityAccessForUser(targetUserId, communityId);
    }
}
