/**
 * Catálogo curado de iconos Guardian (comunidades / entidades / tipos).
 *
 * Runtime: `./communityIconCatalog.json`
 * SSOT (guardian repo): `lib/shared/catalog/community_icon_catalog.json`
 * Refresh local copy: `npm run sync:icons`
 *   (uses GUARDIAN_ROOT / GUARDIAN_ICON_CATALOG, or sibling `../guardian`)
 */
import catalogJson from './communityIconCatalog.json';

export const DEFAULT_ICON_CODE_POINT = catalogJson.defaultCodePoint;
export const DEFAULT_ICON_COLOR = catalogJson.defaultColor;

/** @typedef {{ id: string, labelEs: string, labelEn: string }} CommunityIconCategory */
/** @typedef {{
 *   codePoint: number,
 *   id: string,
 *   category: string,
 *   labelEs: string,
 *   labelEn: string,
 *   keywords: string[],
 *   colorHex: string,
 *   label?: string,
 * }} CommunityIconCatalogEntry */

/** @type {ReadonlyArray<CommunityIconCategory>} */
export const COMMUNITY_ICON_CATEGORIES = Object.freeze(
    (catalogJson.categories || []).map((c) => Object.freeze({ ...c })),
);

/** @type {ReadonlyArray<CommunityIconCatalogEntry>} */
export const COMMUNITY_ICON_CATALOG = Object.freeze(
    (catalogJson.icons || []).map((entry) =>
        Object.freeze({
            ...entry,
            // Back-compat for UI that reads `label`
            label: entry.labelEs,
        }),
    ),
);

const byCodePoint = new Map(
    COMMUNITY_ICON_CATALOG.map((entry) => [entry.codePoint, entry]),
);

const byCategory = new Map();
for (const entry of COMMUNITY_ICON_CATALOG) {
    const list = byCategory.get(entry.category) || [];
    list.push(entry);
    byCategory.set(entry.category, list);
}

export function catalogEntryForCodePoint(codePoint) {
    if (codePoint == null) return null;
    return byCodePoint.get(Number(codePoint)) ?? null;
}

export function entriesForCategory(categoryId) {
    return byCategory.get(categoryId) || [];
}

/**
 * Filter catalog by label (ES/EN), id, or keywords.
 * @param {string} query
 * @returns {ReadonlyArray<CommunityIconCatalogEntry>}
 */
export function filterCommunityIcons(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return COMMUNITY_ICON_CATALOG;
    return COMMUNITY_ICON_CATALOG.filter((entry) => {
        if (entry.labelEs.toLowerCase().includes(q)) return true;
        if (entry.labelEn.toLowerCase().includes(q)) return true;
        if (entry.id.toLowerCase().includes(q)) return true;
        return (entry.keywords || []).some((k) =>
            String(k).toLowerCase().includes(q),
        );
    });
}

export function colorFromHex(hex) {
    if (!hex) return DEFAULT_ICON_COLOR;
    const normalized = String(hex).replace('#', '');
    return normalized.length === 6 ? `#${normalized}` : `#${normalized}`;
}
