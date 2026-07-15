import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { CommunityFields, MemberFields } from '@/shared/config/firestoreFields';

/**
 * One-shot migration utility:
 * - Finds entity communities (`is_entity == true`)
 * - Converts every member with role `admin` to `official`
 *
 * Returns a small report so operators can log/audit execution.
 */
export async function migrateEntityAdminsToOfficials() {
    const entitySnap = await getDocs(
        query(
            collection(db, Collections.COMMUNITIES),
            where(CommunityFields.isEntity, '==', true)
        )
    );
    if (entitySnap.empty) {
        return { entityCount: 0, updatedMembers: 0, touchedEntities: [] };
    }

    const entityIds = entitySnap.docs.map((d) => d.id);
    const touchedEntities = new Set();
    let updatedMembers = 0;

    for (let i = 0; i < entityIds.length; i += 10) {
        const batchIds = entityIds.slice(i, i + 10);
        const membersSnap = await getDocs(
            query(
                collection(db, Collections.COMMUNITY_MEMBERS),
                where(MemberFields.communityId, 'in', batchIds),
                where(MemberFields.role, '==', MemberFields.roleAdmin)
            )
        );
        if (membersSnap.empty) continue;

        const batch = writeBatch(db);
        for (const memberDoc of membersSnap.docs) {
            batch.update(memberDoc.ref, { [MemberFields.role]: MemberFields.roleOfficial });
            updatedMembers += 1;
            const communityId = memberDoc.data()?.[MemberFields.communityId];
            if (communityId) touchedEntities.add(communityId);
        }
        await batch.commit();
    }

    return {
        entityCount: entityIds.length,
        updatedMembers,
        touchedEntities: [...touchedEntities],
    };
}

