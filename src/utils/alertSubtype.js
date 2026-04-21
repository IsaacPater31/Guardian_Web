/**
 * Subtype labels aligned with Guardian `AlertDetailCatalog` (ES / EN).
 * Types without subtypes in Firestore use an empty map (e.g. URGENCY); unknown IDs still humanize().
 */

const OTHER = 'OTHER';

const ES = {
    /** Mobile quick alert type; Firestore usually has no subtype. */
    URGENCY: {},
    POLICE: {
        ROBBERY: 'Robo',
        SUSPICIOUS_ACTIVITY: 'Actividad sospechosa',
        GENDER_VIOLENCE: 'Violencia de género',
        PUBLIC_ORDER: 'Orden público',
        EXTORTION: 'Extorsión',
        SICARIATO: 'Sicariato',
        FLETEO: 'Fleteo',
        KIDNAPPING: 'Secuestro',
        ANIMAL_ABUSE: 'Maltrato animal',
        PREVENTIVE_PATROL: 'Patrullaje preventivo',
        MISSING_PERSONS: 'Personas perdidas',
        NOISE: 'Ruido',
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
        LANDSLIDE: 'Derrumbe',
        TREE_OR_STRUCTURE_FALL: 'Árbol o estructura caída',
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
    HOME_HELP: {
        GAS_LEAK: 'Fuga de gas',
        FIRE: 'Incendio',
        VIOLENCE: 'Violencia',
        FLOOD: 'Inundación',
        ELECTRICAL: 'Eléctrica',
        STRUCTURAL: 'Locativa',
        DEPENDENT_SUPPORT: 'Dependiente',
        [OTHER]: 'Otro',
    },
    ROAD_EMERGENCY: {
        ACCIDENT: 'Accidente',
        BLOCKAGE: 'Bloqueo',
        POOR_SIGNALING: 'Mala señalización',
        RUN_OVER: 'Atropello',
        MEDICAL_ASSISTANCE: 'Asistencia médica',
        DOCUMENTS_OR_TOOLS: 'Documentos o herramientas',
        [OTHER]: 'Otro',
    },
    ENVIRONMENTAL: {
        NOISE_POLLUTION: 'Contaminación auditiva',
        ILLEGAL_DUMPS: 'Basureros satélites',
        TREE_LOGGING: 'Tala de árboles',
        WATER_POLLUTION: 'Contaminación hídrica',
        INVASIVE_SPECIES: 'Especies invasoras',
        HAZARDOUS_WASTE: 'Residuos peligrosos',
        DANGEROUS_ANIMALS: 'Animales peligrosos',
        ANIMAL_IN_DANGER: 'Animal en peligro',
        AIR_POLLUTION: 'Contaminación del aire',
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
    HARASSMENT: {
        HARASSMENT: 'Acoso',
        [OTHER]: 'Otro',
    },
};

const EN = {
    URGENCY: {},
    POLICE: {
        ROBBERY: 'Theft / robbery',
        SUSPICIOUS_ACTIVITY: 'Suspicious activity',
        GENDER_VIOLENCE: 'Gender-based violence',
        PUBLIC_ORDER: 'Public order',
        EXTORTION: 'Extortion',
        SICARIATO: 'Contract killing',
        FLETEO: 'Express kidnapping',
        KIDNAPPING: 'Kidnapping',
        ANIMAL_ABUSE: 'Animal abuse',
        PREVENTIVE_PATROL: 'Preventive patrol',
        MISSING_PERSONS: 'Missing persons',
        NOISE: 'Noise',
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
        LANDSLIDE: 'Landslide',
        TREE_OR_STRUCTURE_FALL: 'Fallen tree or structure',
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
    HOME_HELP: {
        GAS_LEAK: 'Gas leak',
        FIRE: 'Fire',
        VIOLENCE: 'Violence',
        FLOOD: 'Flood',
        ELECTRICAL: 'Electrical',
        STRUCTURAL: 'Structural',
        DEPENDENT_SUPPORT: 'Dependent care',
        [OTHER]: 'Other',
    },
    ROAD_EMERGENCY: {
        ACCIDENT: 'Accident',
        BLOCKAGE: 'Blockage',
        POOR_SIGNALING: 'Poor signage',
        RUN_OVER: 'Run-over',
        MEDICAL_ASSISTANCE: 'Medical assistance',
        DOCUMENTS_OR_TOOLS: 'Documents or tools',
        [OTHER]: 'Other',
    },
    ENVIRONMENTAL: {
        NOISE_POLLUTION: 'Noise pollution',
        ILLEGAL_DUMPS: 'Illegal dumping',
        TREE_LOGGING: 'Illegal logging',
        WATER_POLLUTION: 'Water pollution',
        INVASIVE_SPECIES: 'Invasive species',
        HAZARDOUS_WASTE: 'Hazardous waste',
        DANGEROUS_ANIMALS: 'Dangerous animals',
        ANIMAL_IN_DANGER: 'Animal in danger',
        AIR_POLLUTION: 'Air pollution',
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
    HARASSMENT: {
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
    const table = useEs ? ES : EN;
    return table[alertType]?.[subtype] || humanize(subtype);
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
