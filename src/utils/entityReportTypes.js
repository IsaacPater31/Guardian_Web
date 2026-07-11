/**
 * Custom entity report types: { id, name, iconCodePoint, color }
 * Legacy string keys from ACTIVE_ALERT_TYPES are dropped on normalize.
 */
import {
    DEFAULT_ICON_CODE_POINT,
    DEFAULT_ICON_COLOR,
} from '../config/communityIconCatalog';

export function newEntityReportTypeId() {
    return `ert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {unknown} raw
 * @returns {Array<{ id: string, name: string, iconCodePoint: number, color: string }>}
 */
export function normalizeEntityReportTypes(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const item of raw) {
        if (item == null || typeof item !== 'object' || Array.isArray(item)) continue;
        const name = String(item.name || '').trim();
        if (!name) continue;
        const id = String(item.id || '').trim() || newEntityReportTypeId();
        const iconCodePoint = Number(item.iconCodePoint ?? item.icon_code_point);
        const colorRaw = String(item.color || item.iconColor || item.icon_color || '').trim();
        out.push({
            id,
            name,
            iconCodePoint: Number.isFinite(iconCodePoint) && iconCodePoint > 0
                ? iconCodePoint
                : DEFAULT_ICON_CODE_POINT,
            color: /^#([0-9a-fA-F]{6})$/.test(colorRaw)
                ? colorRaw.toUpperCase()
                : DEFAULT_ICON_COLOR,
        });
    }
    return out;
}

export function formatEntityReportTypeNames(types) {
    const list = normalizeEntityReportTypes(types);
    if (!list.length) return '—';
    return list.map((t) => t.name).join(', ');
}

export function createEmptyEntityReportType() {
    return {
        id: newEntityReportTypeId(),
        name: '',
        iconCodePoint: DEFAULT_ICON_CODE_POINT,
        color: DEFAULT_ICON_COLOR,
    };
}
