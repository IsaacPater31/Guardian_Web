/**
 * Subtype labels aligned with Guardian `AlertDetailCatalog` (ES / EN).
 * Types without subtypes in Firestore use an empty map (e.g. URGENCY); unknown IDs still humanize().
 */

import { normalizeAlertType } from '../config/alertTypes';

const OTHER = 'OTHER';

const ES = {
    /** Mobile quick alert type; Firestore usually has no subtype. */
    URGENCY: {},
    policial: {
        THEFTS: 'Hurtos',
        EXTORTION_KIDNAPPING: 'Extorsión y secuestro',
        INJURIES_THREATS: 'Lesiones y amenazas',
        PUBLIC_CONSUMPTION: 'Consumo en espacio público',
        FIGHTS: 'Riñas y confrontaciones',
        VANDALISM: 'Vandalismo',
        SUSPICIOUS_PRESENCE: 'Presencia de sospechosos',
        MINOR_AT_RISK: 'Menor en riesgo',
        MISSING_PERSON: 'Persona desaparecida',
        ROBBERY: 'Robo',
        SUSPICIOUS_ACTIVITY: 'Actividad sospechosa',
        [OTHER]: 'Otro',
    },
    FIRE: {
        FIRE: 'Incendio',
        GAS_LEAK_ODOR: 'Fuga de gas / olor',
        PEOPLE_RESCUE: 'Rescate de personas',
        HAZARDOUS_SUBSTANCES: 'Sustancias peligrosas',
        SHORT_CIRCUIT: 'Cortocircuito',
        ANIMAL_RESCUE: 'Rescate animal',
        FLOOD: 'Inundación',
        DANGEROUS_FAUNA: 'Fauna peligrosa',
        LANDSLIDE: 'Derrumbes',
        TREE_OR_STRUCTURE_FALL: 'Árboles o estructuras caídas',
        [OTHER]: 'Otro',
    },
    HEALTH: {
        FIRST_AID: 'Primeros auxilios',
        MEDICATIONS: 'Medicamentos',
        AMBULANCE: 'Ambulancia',
        MENTAL_HEALTH: 'Salud mental',
        NEED_DOCTOR: 'Necesito médico',
        [OTHER]: 'Otro',
    },
    casa: {
        GAS_LEAK: 'Fuga de gas',
        FIRE: 'Incendio',
        VIOLENCE: 'Violencia',
        FLOOD: 'Inundación',
        ELECTRICAL: 'Eléctrica',
        STRUCTURAL: 'Locativa',
        DEPENDENT_SUPPORT: 'Dependiente',
        [OTHER]: 'Otro',
    },
    vial: {
        ACCIDENT: 'Accidente',
        BLOCKAGE: 'Bloqueo',
        POOR_SIGNALING: 'Mala señalización',
        RUN_OVER: 'Atropello',
        MEDICAL_ASSISTANCE: 'Asistencia médica',
        DOCUMENTS_OR_TOOLS: 'Documentos o herramientas',
        [OTHER]: 'Otro',
    },
    seguridad: {
        UNAUTHORIZED_ACCESS: 'Acceso no autorizado / intrusión',
        PERIMETER_BREACH: 'Brecha en perímetro o cerramiento',
        ALARM_OR_SURVEILLANCE: 'Falla de alarma o videovigilancia',
        SENSITIVE_ASSET: 'Activo o información sensible expuesta',
        CYBER_OR_SYSTEMS: 'Incidente en sistemas o ciberseguridad',
        [OTHER]: 'Otro',
    },
    ambiental: {
        ILLEGAL_GARBAGE_DUMP: 'Acopio ilegal de basura',
        WATER_SOURCE_POLLUTION: 'Contaminación de fuentes hídricas',
        HAZARDOUS_SPILL: 'Derrame de sustancias peligrosas',
        WILDLIFE_RISK: 'Riesgos con fauna',
        OFFENSIVE_ODORS: 'Olores ofensivos',
        FIRES_AIR_QUALITY: 'Incendios y calidad del aire',
        NOISE_POLLUTION: 'Ruido',
        NATURAL_DISASTERS: 'Desastres naturales',
        FLORA_RISK: 'Riesgo con flora',
        [OTHER]: 'Otro',
    },
    ACCOMPANIMENT: {
        HARASSMENT: 'Acoso',
        BULLYING: 'Bullying',
        INSECURITY: 'Inseguridad',
        MISSING: 'Extraviados',
        MINOR_CARE: 'Cuidado de menores',
        DISABILITY_SUPPORT: 'Personas con discapacidad',
        [OTHER]: 'Otro',
    },
    acoso: {
        HARASSMENT: 'Acoso',
        [OTHER]: 'Otro',
    },
};

const EN = {
    URGENCY: {},
    policial: {
        THEFTS: 'Theft',
        EXTORTION_KIDNAPPING: 'Extortion and kidnapping',
        INJURIES_THREATS: 'Injuries and threats',
        PUBLIC_CONSUMPTION: 'Public consumption',
        FIGHTS: 'Fights and confrontations',
        VANDALISM: 'Vandalism',
        SUSPICIOUS_PRESENCE: 'Suspicious presence',
        MINOR_AT_RISK: 'Minor at risk',
        MISSING_PERSON: 'Missing person',
        ROBBERY: 'Theft / robbery',
        [OTHER]: 'Other',
    },
    FIRE: {
        FIRE: 'Fire',
        GAS_LEAK_ODOR: 'Gas leak / odor',
        PEOPLE_RESCUE: 'People rescue',
        HAZARDOUS_SUBSTANCES: 'Hazardous substances',
        SHORT_CIRCUIT: 'Short circuit',
        ANIMAL_RESCUE: 'Animal rescue',
        FLOOD: 'Flood',
        DANGEROUS_FAUNA: 'Dangerous fauna',
        LANDSLIDE: 'Landslides',
        TREE_OR_STRUCTURE_FALL: 'Fallen trees or structures',
        [OTHER]: 'Other',
    },
    HEALTH: {
        FIRST_AID: 'First aid',
        MEDICATIONS: 'Medications',
        AMBULANCE: 'Ambulance',
        MENTAL_HEALTH: 'Mental health',
        NEED_DOCTOR: 'Need a doctor',
        [OTHER]: 'Other',
    },
    casa: {
        GAS_LEAK: 'Gas leak',
        FIRE: 'Fire',
        VIOLENCE: 'Violence',
        FLOOD: 'Flood',
        ELECTRICAL: 'Electrical',
        STRUCTURAL: 'Structural',
        DEPENDENT_SUPPORT: 'Dependent care',
        [OTHER]: 'Other',
    },
    vial: {
        ACCIDENT: 'Accident',
        BLOCKAGE: 'Blockage',
        POOR_SIGNALING: 'Poor signage',
        RUN_OVER: 'Run-over',
        MEDICAL_ASSISTANCE: 'Medical assistance',
        DOCUMENTS_OR_TOOLS: 'Documents or tools',
        [OTHER]: 'Other',
    },
    seguridad: {
        UNAUTHORIZED_ACCESS: 'Unauthorized access / intrusion',
        PERIMETER_BREACH: 'Perimeter / enclosure breach',
        ALARM_OR_SURVEILLANCE: 'Alarm or CCTV failure',
        SENSITIVE_ASSET: 'Sensitive asset or information exposed',
        CYBER_OR_SYSTEMS: 'Systems / cybersecurity incident',
        [OTHER]: 'Other',
    },
    ambiental: {
        ILLEGAL_GARBAGE_DUMP: 'Illegal garbage dump',
        WATER_SOURCE_POLLUTION: 'Water source pollution',
        HAZARDOUS_SPILL: 'Hazardous spill',
        WILDLIFE_RISK: 'Wildlife risk',
        OFFENSIVE_ODORS: 'Offensive odors',
        FIRES_AIR_QUALITY: 'Fires and air quality',
        NOISE_POLLUTION: 'Noise pollution',
        NATURAL_DISASTERS: 'Natural disasters',
        FLORA_RISK: 'Flora risk',
        [OTHER]: 'Other',
    },
    ACCOMPANIMENT: {
        HARASSMENT: 'Harassment',
        BULLYING: 'Bullying',
        INSECURITY: 'Insecurity',
        MISSING: 'Missing',
        MINOR_CARE: 'Child care',
        DISABILITY_SUPPORT: 'Disability support',
        [OTHER]: 'Other',
    },
    acoso: {
        HARASSMENT: 'Harassment',
        [OTHER]: 'Other',
    },
};

function humanize(id) {
    if (!id) return '';
    const parts = id.split('_').filter(Boolean);
    if (parts.length === 1) {
        const w = parts[0];
        return w.charAt(0) + w.slice(1).toLowerCase();
    }
    return parts.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

/**
 * @param {string} alertType
 * @param {string|null|undefined} subtype
 * @param {string|null|undefined} customDetail
 * @param {boolean} useEs
 */
export function getSubtypeLabel(alertType, subtype, customDetail, useEs = true) {
    if (!subtype) return '';
    if (subtype === OTHER) return (customDetail || '').trim();
    const canonical = normalizeAlertType(alertType);
    const table = useEs ? ES : EN;
    return table[canonical]?.[subtype] ?? table[alertType]?.[subtype] ?? humanize(subtype);
}

/**
 * @param {{ alertType?: string, subtype?: string|null, customDetail?: string|null }} alert
 * @param {boolean} useEs
 * @param {(t: string) => string} mainLabelFn — e.g. getAlertLabel
 * @param {(t: string) => string} mainLabelEnFn
 */
export function getAlertHeadline(alert, useEs, mainLabelFn, mainLabelEnFn) {
    const main = useEs ? mainLabelFn(alert.alertType) : mainLabelEnFn(alert.alertType);
    const sub = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, useEs);
    return sub ? `${main} → ${sub}` : main;
}

export function browserPreferEs() {
    if (typeof navigator === 'undefined') return true;
    return (navigator.language || 'es').toLowerCase().startsWith('es');
}
