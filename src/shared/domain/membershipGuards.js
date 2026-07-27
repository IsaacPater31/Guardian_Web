/**
 * Reglas de último gestor (admin / official) — alineadas con Guardian móvil.
 * Conteos críticos se revalidan dentro de `runTransaction` para reducir TOCTOU.
 */
import {
    collection,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    runTransaction,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { CommunityFields, MemberFields } from '@/shared/config/firestoreFields';

export function managerRoleFor(isEntity) {
    return isEntity ? MemberFields.roleOfficial : MemberFields.roleAdmin;
}

export function isManagerRole(role, isEntity) {
    const r = String(role || '').trim().toLowerCase();
    return r === managerRoleFor(isEntity);
}

function lastManagerError(isEntity, name) {
    const label = isEntity ? 'oficial' : 'administrador';
    return new Error(
        `No se puede quitar o degradar al único ${label} de «${name}». Promueve a otra persona primero.`
    );
}

/**
 * @param {string} communityId
 * @param {boolean} isEntity
 * @returns {Promise<number>}
 */
export async function countManagers(communityId, isEntity) {
    if (!communityId) return 0;
    const managerRole = managerRoleFor(isEntity);
    const snap = await getDocs(
        query(
            collection(db, Collections.COMMUNITY_MEMBERS),
            where(MemberFields.communityId, '==', communityId)
        )
    );
    let count = 0;
    for (const d of snap.docs) {
        const role = String(d.data()?.[MemberFields.role] || '').trim().toLowerCase();
        if (role === managerRole) count += 1;
    }
    return count;
}

/**
 * @param {string} communityId
 * @returns {Promise<{ name: string, isEntity: boolean }>}
 */
export async function loadCommunityMeta(communityId) {
    const communitySnap = await getDoc(doc(db, Collections.COMMUNITIES, communityId));
    if (!communitySnap.exists()) {
        return { name: 'Comunidad', isEntity: false };
    }
    const data = communitySnap.data() || {};
    const isEntity = data[CommunityFields.isEntity] === true;
    const name =
        String(data[CommunityFields.name] || (isEntity ? 'Entidad' : 'Comunidad')).trim()
        || (isEntity ? 'Entidad' : 'Comunidad');
    return { name, isEntity };
}

/**
 * Bloquea quitar o degradar al último admin/official (lectura previa; preferir
 * {@link runGuardedMemberMutation} para writes).
 */
export async function assertCanRemoveOrDemoteManager({
    communityId,
    currentRole,
    nextRole = null,
    communityName,
    isEntity: isEntityHint,
}) {
    if (!communityId) return;

    let isEntity = isEntityHint;
    let name = communityName;
    if (isEntity === undefined || !name) {
        const meta = await loadCommunityMeta(communityId);
        isEntity = meta.isEntity;
        name = name || meta.name;
    }

    if (!isManagerRole(currentRole, isEntity)) return;

    const next = nextRole == null ? null : String(nextRole).trim().toLowerCase();
    const staysManager = next != null && isManagerRole(next, isEntity);
    if (staysManager) return;

    const managers = await countManagers(communityId, isEntity);
    if (managers > 1) return;

    throw lastManagerError(isEntity, name);
}

/**
 * Aplica delete o update de rol revalidando gestores dentro de una transacción.
 *
 * @param {{
 *   memberDocId: string,
 *   nextRole: string | null,
 *   communityName?: string,
 *   isEntity?: boolean,
 * }} opts
 *   `nextRole` null = eliminar membresía; string = nuevo rol.
 * @returns {Promise<{
 *   targetUserId: string | null,
 *   communityId: string | null,
 *   previousRole: string | null,
 *   communityName: string,
 *   isEntity: boolean,
 *   applied: boolean,
 * }>}
 */
export async function runGuardedMemberMutation({
    memberDocId,
    nextRole,
    communityName: communityNameHint,
    isEntity: isEntityHint,
}) {
    const memberRef = doc(db, Collections.COMMUNITY_MEMBERS, memberDocId);
    const preSnap = await getDoc(memberRef);
    if (!preSnap.exists()) {
        if (nextRole == null) {
            await deleteDoc(memberRef);
            return {
                targetUserId: null,
                communityId: null,
                previousRole: null,
                communityName: communityNameHint || 'Comunidad',
                isEntity: Boolean(isEntityHint),
                applied: false,
            };
        }
        throw new Error('Miembro no encontrado');
    }

    const pre = preSnap.data() || {};
    const communityId = pre[MemberFields.communityId];
    if (!communityId) {
        throw new Error('Miembro inválido: falta community_id');
    }

    let isEntity = isEntityHint;
    let communityName = communityNameHint;
    if (isEntity === undefined || !communityName) {
        const meta = await loadCommunityMeta(communityId);
        isEntity = meta.isEntity;
        communityName = communityName || meta.name;
    }

    const managerRole = managerRoleFor(isEntity);
    const membersSnap = await getDocs(
        query(
            collection(db, Collections.COMMUNITY_MEMBERS),
            where(MemberFields.communityId, '==', communityId)
        )
    );
    const managerRefs = membersSnap.docs
        .filter((d) => {
            const role = String(d.data()?.[MemberFields.role] || '').trim().toLowerCase();
            return role === managerRole;
        })
        .map((d) => d.ref);

    const normalizedNext =
        nextRole == null ? null : String(nextRole).trim().toLowerCase();

    const result = await runTransaction(db, async (tx) => {
        const memberSnap = await tx.get(memberRef);
        if (!memberSnap.exists()) {
            return {
                targetUserId: null,
                communityId,
                previousRole: null,
                communityName,
                isEntity,
                applied: false,
            };
        }
        const data = memberSnap.data() || {};
        const previousRole = data[MemberFields.role] || null;
        const targetUserId = data[MemberFields.userId] || null;

        let managers = 0;
        for (const ref of managerRefs) {
            const fresh = await tx.get(ref);
            if (!fresh.exists()) continue;
            const role = String(fresh.data()?.[MemberFields.role] || '').trim().toLowerCase();
            if (role === managerRole) managers += 1;
        }
        // Si el target es gestor pero no estaba en la lista previa (rol cambió), contar fresco.
        if (
            isManagerRole(previousRole, isEntity)
            && !managerRefs.some((r) => r.id === memberRef.id)
        ) {
            managers += 1;
        }

        const wouldDropManager =
            isManagerRole(previousRole, isEntity)
            && (normalizedNext == null || !isManagerRole(normalizedNext, isEntity));

        if (wouldDropManager && managers <= 1) {
            throw lastManagerError(isEntity, communityName);
        }

        if (normalizedNext == null) {
            tx.delete(memberRef);
        } else {
            tx.update(memberRef, { [MemberFields.role]: normalizedNext });
        }

        return {
            targetUserId,
            communityId,
            previousRole,
            communityName,
            isEntity,
            applied: true,
        };
    });

    return result;
}
