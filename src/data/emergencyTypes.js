/**
 * Emergency types configuration — mirrors Flutter EmergencyTypes
 * Each type has a color, icon name (lucide-react), and category.
 */

export const EMERGENCY_TYPES = {
    'ROBBERY': {
        color: '#9C27B0',
        icon: 'UserX',
        label: 'Robbery',
        labelEs: 'Robo',
        category: 'Crime',
    },
    'FIRE': {
        color: '#F44336',
        icon: 'Flame',
        label: 'Fire',
        labelEs: 'Incendio',
        category: 'Emergency',
    },
    'EMERGENCY': {
        color: '#F44336',
        icon: 'Siren',
        label: 'Emergency',
        labelEs: 'Emergencia',
        category: 'Emergency',
    },
    'ACCIDENT': {
        color: '#FF9800',
        icon: 'CarFront',
        label: 'Accident',
        labelEs: 'Accidente',
        category: 'Traffic',
    },
    'UNSAFETY': {
        color: '#FF9800',
        icon: 'AlertTriangle',
        label: 'Unsafety',
        labelEs: 'Inseguridad',
        category: 'Crime',
    },
    'PHYSICAL RISK': {
        color: '#673AB7',
        icon: 'Accessibility',
        label: 'Physical Risk',
        labelEs: 'Riesgo Físico',
        category: 'Emergency',
    },
    'PUBLIC SERVICES EMERGENCY': {
        color: '#FFC107',
        icon: 'Construction',
        label: 'Public Services',
        labelEs: 'Servicios Públicos',
        category: 'Infrastructure',
    },
    'VIAL EMERGENCY': {
        color: '#00BCD4',
        icon: 'Car',
        label: 'Traffic Emergency',
        labelEs: 'Emergencia Vial',
        category: 'Traffic',
    },
    'ASSISTANCE': {
        color: '#4CAF50',
        icon: 'HelpCircle',
        label: 'Assistance',
        labelEs: 'Asistencia',
        category: 'Assistance',
    },
    'STREET ESCORT': {
        color: '#2196F3',
        icon: 'Users',
        label: 'Street Escort',
        labelEs: 'Acompañamiento',
        category: 'Assistance',
    },
};

export const CATEGORIES = {
    'Crime': { color: '#9C27B0', icon: 'Shield' },
    'Emergency': { color: '#F44336', icon: 'Siren' },
    'Traffic': { color: '#FF9800', icon: 'Car' },
    'Infrastructure': { color: '#FFC107', icon: 'Construction' },
    'Assistance': { color: '#4CAF50', icon: 'HelpCircle' },
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
