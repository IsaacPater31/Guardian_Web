/** User-facing lists hide official entity communities in this product iteration. */
export function isOfficialEntityCommunity(community) {
    return community?.isEntity === true;
}

export function visibleUserCommunities(communities) {
    return (communities ?? []).filter((c) => !isOfficialEntityCommunity(c));
}
