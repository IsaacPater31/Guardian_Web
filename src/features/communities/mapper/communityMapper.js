import { CommunityFields } from '@/shared/config/firestoreFields';
import { normalizeEntityReportTypes } from '@/features/communities/utils/entityReportTypes';

export function fromDoc(docSnap) {
    const d = docSnap.data() || {};
    return {
        id: docSnap.id,
        name: d[CommunityFields.name] ?? d.name ?? '',
        description: d[CommunityFields.description] ?? d.description ?? null,
        isEntity: d[CommunityFields.isEntity] ?? d.is_entity ?? false,
        createdBy: d[CommunityFields.createdBy] ?? d.created_by ?? null,
        allowForwardToEntities:
            d[CommunityFields.allowForwardToEntities] ?? d.allow_forward_to_entities ?? true,
        createdAt: d[CommunityFields.createdAt] ?? d.created_at ?? null,
        iconCodePoint: d[CommunityFields.iconCodePoint] ?? d.icon_code_point ?? null,
        iconColor: d[CommunityFields.iconColor] ?? d.icon_color ?? null,
        reportButtonColor: d[CommunityFields.reportButtonColor] ?? d.report_button_color ?? null,
        reportAlertTypes: normalizeEntityReportTypes(
            d[CommunityFields.reportAlertTypes] ?? d.report_alert_types,
        ),
    };
}

export const parseCommunity = fromDoc;
