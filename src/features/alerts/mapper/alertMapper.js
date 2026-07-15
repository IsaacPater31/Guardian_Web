import {
    AlertFields,
    AlertStatus,
    normalizeAlertType,
} from '@/shared/config/alertTypes';

/**
 * Firestore alert doc → domain model.
 * Sole conversion point for alerts in webapp.
 *
 * @param {import('firebase/firestore').DocumentSnapshot} docSnap
 */
export function fromDoc(docSnap) {
    const d = docSnap.data();
    const rawCommunityIds = d[AlertFields.communityIds];
    const rawCommunityId = d[AlertFields.communityId];

    let communityIds;
    if (Array.isArray(rawCommunityIds) && rawCommunityIds.length > 0) {
        communityIds = rawCommunityIds;
    } else if (rawCommunityId) {
        communityIds = [rawCommunityId];
    } else {
        communityIds = [];
    }

    const flowType = d[AlertFields.type] || '';
    const subtype = d[AlertFields.subtype] ?? d.subType ?? d.sub_type ?? null;
    const customDetail = d[AlertFields.customDetail] ?? d.customDetail ?? d.custom_detail ?? null;
    const alertType = normalizeAlertType(d[AlertFields.alertType] || '', flowType);

    return {
        id: docSnap.id,
        type: flowType,
        alertType,
        alertTypeLabel: d.alertTypeLabel ?? d.alert_type_label ?? null,
        alertTypeColor: d.alertTypeColor ?? d.alert_type_color ?? null,
        alertTypeIconCodePoint:
            d.alertTypeIconCodePoint ?? d.alert_type_icon_code_point ?? null,
        description: d[AlertFields.description] ?? null,
        subtype,
        customDetail,
        timestamp: d[AlertFields.timestamp] ?? null,
        isAnonymous: d[AlertFields.isAnonymous] ?? false,
        shareLocation: d[AlertFields.shareLocation] ?? false,
        location: d[AlertFields.location] ?? null,
        userId: d[AlertFields.userId] ?? null,
        userEmail: d[AlertFields.userEmail] ?? null,
        userName: d[AlertFields.userName] ?? null,
        imageBase64: d[AlertFields.imageBase64] ?? null,
        viewedCount: d[AlertFields.viewedCount] ?? 0,
        viewedBy: d[AlertFields.viewedBy] ?? [],
        communityIds,
        communityId: communityIds[0] ?? null,
        forwardsCount: d[AlertFields.forwardsCount] ?? 0,
        reportsCount: d[AlertFields.reportsCount] ?? 0,
        reportedBy: d[AlertFields.reportedBy] ?? [],
        alertStatus: d[AlertFields.alertStatus] ?? AlertStatus.PENDING,
    };
}

export const parseAlert = fromDoc;
