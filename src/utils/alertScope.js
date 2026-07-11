/**
 * Client-side scoping of alerts to selected communities.
 */

export function alertBelongsToCommunities(alert, communityIds) {
    if (!communityIds?.length) return false;
    const allowed = new Set(communityIds);
    const ids = alert?.communityIds?.length
        ? alert.communityIds
        : alert?.communityId
          ? [alert.communityId]
          : [];
    return ids.some((id) => allowed.has(id));
}

export function filterAlertsByCommunities(alerts, communityIds) {
    return (alerts ?? []).filter((a) => alertBelongsToCommunities(a, communityIds));
}
