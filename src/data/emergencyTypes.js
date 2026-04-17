/**
 * Emergency types configuration — mirrors Flutter EmergencyTypes.
 *
 * PRIMARY (active: true):  7 types used in the radial swipe menu.
 * LEGACY  (active: false): historical types, displayed in map/feed for old alerts.
 */

export const EMERGENCY_TYPES = {
    // ── Active types (radial menu) ────────────────────────────────────────
    'HEALTH': {
        color: '#26C6DA',
        icon: 'Cross',
        label: 'Health Emergency',
        labelEs: 'Sanitaria',
        category: 'Health',
        active: true,
    },
    'HOME_HELP': {
        color: '#66BB6A',
        icon: 'Home',
        label: 'Home Help',
        labelEs: 'Ayuda en Casa',
        category: 'Assistance',
        active: true,
    },
    'POLICE': {
        color: '#1565C0',
        icon: 'ShieldCheck',
        label: 'Police',
        labelEs: 'Policía',
        category: 'Security',
        active: true,
    },
    'FIRE': {
        color: '#E53935',
        icon: 'Flame',
        label: 'Firefighters',
        labelEs: 'Bomberos',
        category: 'Emergency',
        active: true,
    },
    'ACCOMPANIMENT': {
        color: '#8E24AA',
        icon: 'Users',
        label: 'Accompaniment',
        labelEs: 'Acompañamiento',
        category: 'Assistance',
        active: true,
    },
    'ENVIRONMENTAL': {
        color: '#43A047',
        icon: 'Leaf',
        label: 'Environmental',
        labelEs: 'Ambiental',
        category: 'Environment',
        active: true,
    },
    'ROAD_EMERGENCY': {
        color: '#FF7043',
        icon: 'Car',
        label: 'Road Emergency',
        labelEs: 'Emergencia Vial',
        category: 'Traffic',
        active: true,
    },
    // ── Legacy types (historical display only) ────────────────────────────
    'ROBBERY': {
        color: '#9C27B0',
        icon: 'UserX',
        label: 'Robbery',
        labelEs: 'Robo',
        category: 'Crime',
        active: false,
    },
    'EMERGENCY': {
        color: '#F44336',
        icon: 'Siren',
        label: 'Emergency',
        labelEs: 'Emergencia',
        category: 'Emergency',
        active: false,
    },
    'ACCIDENT': {
        color: '#FF9800',
        icon: 'CarFront',
        label: 'Accident',
        labelEs: 'Accidente',
        category: 'Traffic',
        active: false,
    },
    'UNSAFETY': {
        color: '#FF9800',
        icon: 'AlertTriangle',
        label: 'Unsafety',
        labelEs: 'Inseguridad',
        category: 'Crime',
        active: false,
    },
    'PHYSICAL RISK': {
        color: '#673AB7',
        icon: 'Accessibility',
        label: 'Physical Risk',
        labelEs: 'Riesgo Físico',
        category: 'Emergency',
        active: false,
    },
    'PUBLIC SERVICES EMERGENCY': {
        color: '#FFC107',
        icon: 'Construction',
        label: 'Public Services',
        labelEs: 'Servicios Públicos',
        category: 'Infrastructure',
        active: false,
    },
    'VIAL EMERGENCY': {
        color: '#00BCD4',
        icon: 'Car',
        label: 'Traffic Emergency',
        labelEs: 'Emergencia Vial',
        category: 'Traffic',
        active: false,
    },
    'ASSISTANCE': {
        color: '#4CAF50',
        icon: 'HelpCircle',
        label: 'Assistance',
        labelEs: 'Asistencia',
        category: 'Assistance',
        active: false,
    },
    'STREET ESCORT': {
        color: '#2196F3',
        icon: 'Users',
        label: 'Street Escort',
        labelEs: 'Acompañamiento',
        category: 'Assistance',
        active: false,
    },
};

/** Only the 7 active types — use for filter chips, dropdowns, etc. */
export const ACTIVE_EMERGENCY_TYPES = Object.fromEntries(
    Object.entries(EMERGENCY_TYPES).filter(([, v]) => v.active)
);

export const CATEGORIES = {
    'Health':         { color: '#26C6DA', icon: 'Cross' },
    'Security':       { color: '#1565C0', icon: 'ShieldCheck' },
    'Emergency':      { color: '#F44336', icon: 'Siren' },
    'Assistance':     { color: '#4CAF50', icon: 'HelpCircle' },
    'Environment':    { color: '#43A047', icon: 'Leaf' },
    'Traffic':        { color: '#FF7043', icon: 'Car' },
    'Crime':          { color: '#9C27B0', icon: 'Shield' },
    'Infrastructure': { color: '#FFC107', icon: 'Construction' },
};

export function getAlertColor(alertType) {
    return EMERGENCY_TYPES[alertType]?.color || '#9E9E9E';
}

export function getAlertIcon(alertType) {
    return EMERGENCY_TYPES[alertType]?.icon || 'AlertTriangle';
}

export function getAlertLabel(alertType) {
    return EMERGENCY_TYPES[alertType]?.labelEs || alertType;
}

export function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays}d`;
}
