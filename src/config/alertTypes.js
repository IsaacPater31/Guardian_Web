/**
 * alertTypes.js — Single source of truth for alert type configuration.
 *
 * Paridad con Guardian móvil (`lib/core/alert_detail_catalog.dart`):
 * tipos de swipe en Firestore usan nombres cortos: casa, seguridad, vial,
 * acoso, ambiental, policial (+ HEALTH, FIRE, ACCOMPANIMENT, URGENCY).
 *
 * `LEGACY_ALERT_TYPE_ALIASES` mapea claves antiguas (HOME_HELP, POLICE, …)
 * al canónico para lectura, filtros y UI.
 */

// ─── Type definitions ─────────────────────────────────────────────────────────

/**
 * @type {Record<string, {
 *   color: string,
 *   icon: string,
 *   label: string,
 *   labelEs: string,
 *   category: string,
 *   active: boolean,
 * }>}
 */
export const ALERT_TYPES = Object.freeze({
    // ── Active (canónico — mismo valor que Firestore en app nueva) ─────────────
    HEALTH: {
        color:    '#26C6DA',
        icon:     'Cross',
        label:    'Health',
        labelEs:  'Sanitaria',
        category: 'Health',
        active:   true,
    },
    casa: {
        color:    '#66BB6A',
        icon:     'Home',
        label:    'Home',
        labelEs:  'Casa',
        category: 'Assistance',
        active:   true,
    },
    policial: {
        color:    '#1565C0',
        icon:     'ShieldCheck',
        label:    'Police',
        labelEs:  'Policial',
        category: 'Security',
        active:   true,
    },
    FIRE: {
        color:    '#E53935',
        icon:     'Flame',
        label:    'Firefighters',
        labelEs:  'Bomberos',
        category: 'Emergency',
        active:   true,
    },
    seguridad: {
        color:    '#C62828',
        icon:     'Shield',
        label:    'Security',
        labelEs:  'Seguridad',
        category: 'Security',
        active:   true,
    },
    ACCOMPANIMENT: {
        color:    '#8E24AA',
        icon:     'Users',
        label:    'Accompaniment',
        labelEs:  'Acompañamiento',
        category: 'Assistance',
        active:   true,
    },
    ambiental: {
        color:    '#43A047',
        icon:     'CloudLightning',
        label:    'Environmental',
        labelEs:  'Ambiental',
        category: 'Environment',
        active:   true,
    },
    vial: {
        color:    '#FF7043',
        icon:     'CarFront',
        label:    'Road',
        labelEs:  'Vial',
        category: 'Traffic',
        active:   true,
    },
    acoso: {
        color:    '#7B1FA2',
        icon:     'Hand',
        label:    'Harassment',
        labelEs:  'Acoso',
        category: 'Security',
        active:   true,
    },
    URGENCY: {
        color:    '#F44336',
        icon:     'Siren',
        label:    'Urgency',
        labelEs:  'Urgencia',
        category: 'Emergency',
        active:   true,
    },

    // ── Legacy alertType keys (solo visualización / datos históricos) ─────────
    HOME_HELP: {
        color:    '#66BB6A',
        icon:     'Home',
        label:    'Home Help',
        labelEs:  'Casa',
        category: 'Assistance',
        active:   false,
    },
    POLICE: {
        color:    '#1565C0',
        icon:     'ShieldCheck',
        label:    'Police',
        labelEs:  'Policial',
        category: 'Security',
        active:   false,
    },
    SECURITY_BREACH: {
        color:    '#C62828',
        icon:     'Shield',
        label:    'Security breach',
        labelEs:  'Seguridad',
        category: 'Security',
        active:   false,
    },
    ENVIRONMENTAL: {
        color:    '#43A047',
        icon:     'Leaf',
        label:    'Environmental',
        labelEs:  'Ambiental',
        category: 'Environment',
        active:   false,
    },
    ROAD_EMERGENCY: {
        color:    '#FF7043',
        icon:     'Car',
        label:    'Road Emergency',
        labelEs:  'Vial',
        category: 'Traffic',
        active:   false,
    },
    HARASSMENT: {
        color:    '#7B1FA2',
        icon:     'Hand',
        label:    'Harassment',
        labelEs:  'Acoso',
        category: 'Security',
        active:   false,
    },
    ROBBERY: {
        color:    '#9C27B0',
        icon:     'UserX',
        label:    'Robbery',
        labelEs:  'Robo',
        category: 'Crime',
        active:   false,
    },
    EMERGENCY: {
        color:    '#F44336',
        icon:     'Siren',
        label:    'Emergency',
        labelEs:  'Emergencia',
        category: 'Emergency',
        active:   false,
    },
    ACCIDENT: {
        color:    '#FF9800',
        icon:     'CarFront',
        label:    'Accident',
        labelEs:  'Accidente',
        category: 'Traffic',
        active:   false,
    },
    UNSAFETY: {
        color:    '#FF9800',
        icon:     'AlertTriangle',
        label:    'Unsafety',
        labelEs:  'Inseguridad',
        category: 'Crime',
        active:   false,
    },
    'PHYSICAL RISK': {
        color:    '#673AB7',
        icon:     'Accessibility',
        label:    'Physical Risk',
        labelEs:  'Riesgo Físico',
        category: 'Emergency',
        active:   false,
    },
    'PUBLIC SERVICES EMERGENCY': {
        color:    '#FFC107',
        icon:     'Construction',
        label:    'Public Services',
        labelEs:  'Servicios Públicos',
        category: 'Infrastructure',
        active:   false,
    },
    'VIAL EMERGENCY': {
        color:    '#FF7043',
        icon:     'Car',
        label:    'Traffic Emergency',
        labelEs:  'Vial',
        category: 'Traffic',
        active:   false,
    },
    ASSISTANCE: {
        color:    '#4CAF50',
        icon:     'HelpCircle',
        label:    'Assistance',
        labelEs:  'Asistencia',
        category: 'Assistance',
        active:   false,
    },
    'STREET ESCORT': {
        color:    '#2196F3',
        icon:     'Users',
        label:    'Street Escort',
        labelEs:  'Acompañamiento',
        category: 'Assistance',
        active:   false,
    },
});

/**
 * Valores históricos en Firestore → clave canónica (Guardian móvil / web nuevos).
 * Claves = texto exacto guardado en `alertType`.
 */
export const LEGACY_ALERT_TYPE_ALIASES = Object.freeze({
    HOME_HELP:         'casa',
    SECURITY_BREACH:   'seguridad',
    ROAD_EMERGENCY:    'vial',
    HARASSMENT:        'acoso',
    ENVIRONMENTAL:     'ambiental',
    POLICE:            'policial',
    'VIAL EMERGENCY':  'vial',
});

/** Tipos activos del swipe radial + inferiores (paridad `AlertDetailCatalog.supportedAlertTypes`). */
export const GUARDIAN_SWIPE_ALERT_TYPES = Object.freeze([
    'HEALTH',
    'casa',
    'policial',
    'FIRE',
    'seguridad',
    'vial',
    'ambiental',
    'ACCOMPANIMENT',
    'acoso',
]);

/**
 * Normaliza `alertType` al canónico (alias legacy + quick HEALTH → URGENCY).
 *
 * @param {string|null|undefined} alertType
 * @param {string} [flowType] — valor Firestore `type` (`quick`, `detailed`, …)
 */
export function normalizeAlertType(alertType, flowType = '') {
    if (alertType == null || alertType === '') return alertType ?? '';
    let t = String(alertType).trim();
    const flow = String(flowType || '').trim().toLowerCase();
    if (flow === 'quick' && t === 'HEALTH') {
        t = 'URGENCY';
    }
    return LEGACY_ALERT_TYPE_ALIASES[t] ?? t;
}

/** Normaliza lista de filtros UI → claves canónicas para queries y chips. */
export function normalizeFilterTypes(types) {
    if (!types?.length) return [];
    return [...new Set(types.map((t) => normalizeAlertType(t)).filter(Boolean))];
}

/** Solo tipos activos — selectores de filtro. */
export const ACTIVE_ALERT_TYPES = Object.freeze(
    Object.fromEntries(
        Object.entries(ALERT_TYPES).filter(([, v]) => v.active)
    )
);

// ─── Firestore field names ────────────────────────────────────────────────────

export const AlertFields = Object.freeze({
    alertType:    'alertType',
    timestamp:    'timestamp',
    isAnonymous:  'isAnonymous',
    shareLocation:'shareLocation',
    location:     'location',
    userId:       'userId',
    userEmail:    'userEmail',
    userName:     'userName',
    imageBase64:  'imageBase64',
    viewedCount:  'viewedCount',
    viewedBy:     'viewedBy',
    description:  'description',
    type:         'type',
    subtype:      'subtype',
    customDetail: 'custom_detail',
    alertStatus:  'alert_status',
    communityId:  'community_id',
    communityIds: 'community_ids',
    forwardsCount:'forwards_count',
    reportsCount: 'reports_count',
    reportedBy:   'reported_by',
});

export const AlertStatus = Object.freeze({
    PENDING:  'pending',
    ATTENDED: 'attended',
});

export const QUERY_CONFIG = Object.freeze({
    recentWindowHours: 24,
    recentAlertsLimit: 100,
    mapFetchLimit: 1000,
    alertsFetchLimit: 500,
    communityAlertsLimit: 50,
});

/** Marker/card highlight pulse window (web: animation only; mobile vibrates separately). */
export const ACTIVE_ALERT_FEEDBACK_MS = 10_000;

export function getAlertColor(alertType, alert = null) {
    const override = alert?.alertTypeColor || alert?.alert_type_color;
    if (override) return override;
    const key = normalizeAlertType(alertType);
    return ALERT_TYPES[key]?.color ?? ALERT_TYPES[alertType]?.color ?? '#9E9E9E';
}

export function getAlertIcon(alertType, alert = null) {
    if (alert?.alertTypeLabel || alert?.alert_type_label) return 'AlertTriangle';
    const key = normalizeAlertType(alertType);
    return ALERT_TYPES[key]?.icon ?? ALERT_TYPES[alertType]?.icon ?? 'AlertTriangle';
}

export function getAlertLabel(alertType, alert = null) {
    const override = alert?.alertTypeLabel || alert?.alert_type_label;
    if (override) return override;
    const key = normalizeAlertType(alertType);
    return ALERT_TYPES[key]?.labelEs ?? ALERT_TYPES[alertType]?.labelEs ?? alertType;
}

export function getAlertLabelEn(alertType) {
    const key = normalizeAlertType(alertType);
    return ALERT_TYPES[key]?.label ?? ALERT_TYPES[alertType]?.label ?? alertType;
}

export function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date     = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs   = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHrs  = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1)  return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHrs  < 24) return `Hace ${diffHrs}h`;
    if (diffDays === 1)return 'Ayer';
    return `Hace ${diffDays}d`;
}
