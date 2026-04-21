/**
 * alertTypes.js — Single source of truth for alert type configuration.
 *
 * Covers:
 *   - ALERT_TYPES: all type definitions (active + legacy)
 *   - AlertFields: Firestore field names (documents the camelCase ↔ snake_case mapping)
 *   - AlertStatus: allowed status values
 *   - QUERY_CONFIG: all volatile numeric constants used in queries
 *   - Derived exports: ACTIVE_ALERT_TYPES, helper functions
 *
 * Principles applied:
 *   - Open/Closed (SOLID): add a new type here; zero component changes needed.
 *   - Information Expert (GRASP): this module owns alert-type knowledge.
 *   - Single Responsibility: volatile config lives here, not scattered in services.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW ALERT TYPE
 * ──────────────────────────────────────────────────────────────────────────────
 *   1. Add an entry to ALERT_TYPES with `active: true`.
 *   2. Pick an existing Lucide icon name for the `icon` field.
 *   3. Done — filters, cards and map markers will pick it up automatically.
 *
 * HOW TO DEPRECATE A TYPE
 *   Set `active: false`. Historical alerts still display correctly; the type
 *   simply disappears from the filter selector.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Type definitions ─────────────────────────────────────────────────────────

/**
 * Full registry of alert types.
 * Keys are the exact strings stored in Firestore `alertType` field.
 *
 * @type {Record<string, {
 *   color: string,
 *   icon: string,         // Lucide icon component name
 *   label: string,        // English label
 *   labelEs: string,      // Spanish label (UI display)
 *   category: string,
 *   active: boolean,      // false = legacy (display only, not in filters)
 * }>}
 */
export const ALERT_TYPES = Object.freeze({
    // ── Active types ───────────────────────────────────────────────────────────
    // Mirrors Guardian: `AlertDetailCatalog.supportedAlertTypes` (swipe) plus
    // `EmergencyTypes.quickAlertType` → URGENCY (one-tap quick alert, no subtype).
    HEALTH: {
        color:    '#26C6DA',
        icon:     'Cross',
        label:    'Health Emergency',
        labelEs:  'Sanitaria',
        category: 'Health',
        active:   true,
    },
    HOME_HELP: {
        color:    '#66BB6A',
        icon:     'Home',
        label:    'Home Help',
        labelEs:  'Ayuda en Casa',
        category: 'Assistance',
        active:   true,
    },
    POLICE: {
        color:    '#1565C0',
        icon:     'ShieldCheck',
        label:    'Police',
        labelEs:  'Policía',
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
    ACCOMPANIMENT: {
        color:    '#8E24AA',
        icon:     'Users',
        label:    'Accompaniment',
        labelEs:  'Acompañamiento',
        category: 'Assistance',
        active:   true,
    },
    ENVIRONMENTAL: {
        color:    '#43A047',
        icon:     'Leaf',
        label:    'Environmental',
        labelEs:  'Ambiental',
        category: 'Environment',
        active:   true,
    },
    ROAD_EMERGENCY: {
        color:    '#FF7043',
        icon:     'Car',
        label:    'Road Emergency',
        labelEs:  'Emergencia Vial',
        category: 'Traffic',
        active:   true,
    },
    HARASSMENT: {
        color:    '#EC407A',
        icon:     'ShieldAlert',
        label:    'Harassment',
        labelEs:  'Acoso',
        category: 'Security',
        active:   true,
    },
    /** One-tap quick alert (mobile center / configured entity destinations). */
    URGENCY: {
        color:    '#F44336',
        icon:     'Siren',
        label:    'Urgency',
        labelEs:  'Urgencia',
        category: 'Emergency',
        active:   true,
    },

    // ── Legacy types (historical display only — not shown in filters) ─────────
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
        color:    '#00BCD4',
        icon:     'Car',
        label:    'Traffic Emergency',
        labelEs:  'Emergencia Vial',
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

/** Only the currently active types — used by filter UIs. */
export const ACTIVE_ALERT_TYPES = Object.freeze(
    Object.fromEntries(
        Object.entries(ALERT_TYPES).filter(([, v]) => v.active)
    )
);

// ─── Firestore field names ────────────────────────────────────────────────────

/**
 * Canonical mapping of Firestore document field names.
 * Documents the intentional camelCase (JS) ↔ snake_case (Firestore) asymmetry.
 */
export const AlertFields = Object.freeze({
    // Stored as camelCase in Firestore
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

    // Stored as snake_case in Firestore (legacy naming from Flutter)
    alertStatus:  'alert_status',
    communityId:  'community_id',              // legacy (read-only, backward compat)
    communityIds: 'community_ids',             // new array field
    forwardsCount:'forwards_count',
    reportsCount: 'reports_count',
    reportedBy:   'reported_by',
});

// ─── Status values ────────────────────────────────────────────────────────────

/** Valid values for the `alert_status` Firestore field. */
export const AlertStatus = Object.freeze({
    PENDING:  'pending',
    ATTENDED: 'attended',
});

// ─── Query configuration ──────────────────────────────────────────────────────

/**
 * Volatile numeric constants for Firestore queries.
 * Change a value here and every query in alertService picks it up.
 */
export const QUERY_CONFIG = Object.freeze({
    /** Hours window for "recent alerts" feed (Dashboard). */
    recentWindowHours: 24,

    /** Max documents for recent-alerts feed (Firestore reads cap). */
    recentAlertsLimit: 100,

    /** Max documents fetched when no date filter is active on the map. */
    mapFetchLimit: 1000,

    /** Max documents fetched when no date filter is active on the Alerts page. */
    alertsFetchLimit: 500,

    /** Max alerts returned per community. */
    communityAlertsLimit: 50,
});

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Returns the hex color for a given alertType key, or a neutral grey fallback. */
export function getAlertColor(alertType) {
    return ALERT_TYPES[alertType]?.color ?? '#9E9E9E';
}

/** Returns the Lucide icon name for a given alertType key. */
export function getAlertIcon(alertType) {
    return ALERT_TYPES[alertType]?.icon ?? 'AlertTriangle';
}

/** Returns the Spanish display label for a given alertType key. */
export function getAlertLabel(alertType) {
    return ALERT_TYPES[alertType]?.labelEs ?? alertType;
}

/** English label for alert type (for non-ES UIs). */
export function getAlertLabelEn(alertType) {
    return ALERT_TYPES[alertType]?.label ?? alertType;
}

/**
 * Human-readable elapsed time from a Firestore Timestamp or Date.
 * Kept here so all time formatting is in one place.
 *
 * @param {import('firebase/firestore').Timestamp|Date|null} timestamp
 * @returns {string}
 */
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
