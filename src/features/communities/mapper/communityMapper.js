import { CommunityFields } from '@/shared/config/firestoreFields';
import { normalizeEntityReportTypes } from '@/features/communities/utils/entityReportTypes';

/**
 * Non-empty hex/string — mirrors Flutter `_nonEmptyHex` so '' falls through to legacy.
 * @param {unknown} raw
 * @returns {string|null}
 */
function nonEmptyHex(raw) {
    const s = String(raw ?? '').trim();
    return s.length > 0 ? s : null;
}

/**
 * Canonical icon color: icon_color, else legacy report_button_color (ETC: one field for UI).
 * Empty strings are treated as missing (parity with CommunityModel.resolveIconColor).
 */
export function resolveIconColor(d = {}) {
    return (
        nonEmptyHex(d[CommunityFields.iconColor])
        ?? nonEmptyHex(d.icon_color)
        ?? nonEmptyHex(d[CommunityFields.reportButtonColor])
        ?? nonEmptyHex(d.report_button_color)
        ?? null
    );
}

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
        iconColor: resolveIconColor(d),
        reportAlertTypes: normalizeEntityReportTypes(
            d[CommunityFields.reportAlertTypes] ?? d.report_alert_types,
        ),
        defaultSlug: d[CommunityFields.defaultSlug] ?? d.default_slug ?? null,
    };
}

export const parseCommunity = fromDoc;
