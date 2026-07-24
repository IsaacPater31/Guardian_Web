/**
 * Stats scoping helpers — community/entity filter only.
 * Membership / visibility must already be applied upstream when required.
 * Kept pure for ETC and shared use (dashboard, future entity panels).
 */

import { filterAlertsByCommunities } from '@/features/alerts/utils/alertScope';
import { isOfficialEntityCommunity } from '@/shared/domain/communityVisibility';

/** @typedef {'all' | 'communities' | 'entities'} StatsKindFilter */

/**
 * Selection model (parity with map filter):
 * - `null`  → all communities in scope
 * - `[]`    → none
 * - `string[]` → subset
 *
 * @param {Array} alerts
 * @param {string[]|null|undefined} selectedCommunityIds
 */
export function scopeAlertsByCommunities(alerts, selectedCommunityIds) {
    if (selectedCommunityIds == null) return alerts ?? [];
    if (!selectedCommunityIds.length) return [];
    return filterAlertsByCommunities(alerts, selectedCommunityIds);
}

/**
 * Options for the stats community picker (communities + entities).
 * @param {Array<{ id: string, name?: string, isEntity?: boolean }>} communities
 * @returns {Array<{ id: string, name: string, isEntity: boolean, kindLabel: string }>}
 */
export function buildStatsCommunityOptions(communities) {
    return (communities ?? [])
        .filter((c) => c?.id)
        .map((c) => {
            const isEntity = isOfficialEntityCommunity(c);
            return {
                id: c.id,
                name: (c.name || '').trim() || c.id,
                isEntity,
                kindLabel: isEntity ? 'Entidad' : 'Comunidad',
            };
        })
        .sort((a, b) => {
            if (a.isEntity !== b.isEntity) return a.isEntity ? 1 : -1;
            return a.name.localeCompare(b.name, 'es');
        });
}

/**
 * Narrow options by kind chip (all / only communities / only entities).
 * @param {ReturnType<typeof buildStatsCommunityOptions>} options
 * @param {StatsKindFilter} kind
 */
export function filterStatsOptionsByKind(options, kind) {
    if (kind === 'communities') return options.filter((o) => !o.isEntity);
    if (kind === 'entities') return options.filter((o) => o.isEntity);
    return options;
}

/**
 * When the kind filter changes, drop selected ids that no longer apply.
 * @param {string[]|null} selectedIds
 * @param {ReturnType<typeof buildStatsCommunityOptions>} visibleOptions
 * @returns {string[]|null}
 */
export function reconcileSelectedCommunityIds(selectedIds, visibleOptions) {
    if (selectedIds == null) return null;
    const allowed = new Set(visibleOptions.map((o) => o.id));
    const next = selectedIds.filter((id) => allowed.has(id));
    if (next.length === visibleOptions.length) return null;
    return next;
}
