import {
    getAlertColor,
    getAlertIcon,
    getAlertLabel,
} from '@/shared/config/alertTypes';

/**
 * Resolves display label/color/icon for an alert.
 * Prefers snapshot fields on the alert doc (entity report types survive deletion).
 * Single place for variable/entity types — ETC for cards, map list, markers, filters.
 *
 * @param {{ alertType?: string, alertTypeLabel?: string|null, alertTypeColor?: string|null }|null|undefined} alert
 * @returns {{ label: string, color: string, icon: string, typeKey: string }}
 */
export function resolveAlertTypePresentation(alert) {
    const typeKey = alert?.alertType ?? '';
    return {
        typeKey,
        label: getAlertLabel(typeKey, alert),
        color: getAlertColor(typeKey, alert),
        icon: getAlertIcon(typeKey, alert),
    };
}

/**
 * Merge configured filter chips with types present on live alerts.
 * Orphaned/deleted entity types still appear using snapshot labels.
 *
 * @param {Array<{key:string,label?:string,color?:string,icon?:string}>|null|undefined} typeOptions
 * @param {Array} alerts
 */
export function mergeTypeOptionsFromAlerts(typeOptions, alerts) {
    const byKey = new Map();
    for (const opt of typeOptions ?? []) {
        if (!opt?.key) continue;
        byKey.set(opt.key, opt);
    }
    for (const alert of alerts ?? []) {
        const { typeKey, label, color, icon } = resolveAlertTypePresentation(alert);
        if (!typeKey || byKey.has(typeKey)) continue;
        byKey.set(typeKey, { key: typeKey, label, color, icon });
    }
    return [...byKey.values()];
}
