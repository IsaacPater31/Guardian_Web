/**
 * Catálogo curado de iconos para comunidades.
 * Mantener en sync manual con `guardian/lib/core/community_icon_catalog.dart`.
 */
export const DEFAULT_ICON_CODE_POINT = 58502;
export const DEFAULT_ICON_COLOR = '#5B6ABF';

/** @type {ReadonlyArray<{ codePoint: number, label: string, colorHex: string }>} */
export const COMMUNITY_ICON_CATALOG = [
    { codePoint: 58502, label: 'Grupo', colorHex: '#5B6ABF' },
    { codePoint: 58094, label: 'Comunidad', colorHex: '#7C4DFF' },
    { codePoint: 57943, label: 'Familia', colorHex: '#E91E63' },
    { codePoint: 985180, label: 'Diversidad', colorHex: '#FF5722' },
    { codePoint: 984766, label: 'Alianza', colorHex: '#009688' },
    { codePoint: 58136, label: 'Hogar', colorHex: '#795548' },
    { codePoint: 58280, label: 'Ciudad', colorHex: '#607D8B' },
    { codePoint: 57481, label: 'Edificio', colorHex: '#455A64' },
    { codePoint: 58412, label: 'Refugio', colorHex: '#8D6E63' },
    { codePoint: 58312, label: 'Zona', colorHex: '#4CAF50' },
    { codePoint: 58713, label: 'Escuela', colorHex: '#1976D2' },
    { codePoint: 59122, label: 'Trabajo', colorHex: '#F57C00' },
    { codePoint: 57627, label: 'Empresa', colorHex: '#37474F' },
    { codePoint: 58714, label: 'Ciencia', colorHex: '#00BCD4' },
    { codePoint: 58333, label: 'Estudio', colorHex: '#3F51B5' },
    { codePoint: 58866, label: 'Fútbol', colorHex: '#388E3C' },
    { codePoint: 57997, label: 'Gimnasio', colorHex: '#D32F2F' },
    { codePoint: 57820, label: 'Correr', colorHex: '#FF6F00' },
    { codePoint: 58854, label: 'Basket', colorHex: '#E65100' },
    { codePoint: 58588, label: 'Natación', colorHex: '#0288D1' },
    { codePoint: 58262, label: 'Salud', colorHex: '#C62828' },
    { codePoint: 57947, label: 'Bienestar', colorHex: '#AD1457' },
    { codePoint: 58116, label: 'Cuidado', colorHex: '#00897B' },
    { codePoint: 59078, label: 'Voluntariado', colorHex: '#F06292' },
    { codePoint: 984269, label: 'Iglesia', colorHex: '#6D4C41' },
    { codePoint: 57535, label: 'Cultura', colorHex: '#1565C0' },
    { codePoint: 58389, label: 'Música', colorHex: '#AB47BC' },
    { codePoint: 58964, label: 'Teatro', colorHex: '#FF7043' },
    { codePoint: 58774, label: 'Seguridad', colorHex: '#1F2937' },
    { codePoint: 58729, label: 'Vigilancia', colorHex: '#263238' },
    { codePoint: 984314, label: 'Emergencia', colorHex: '#B71C1C' },
    { codePoint: 58448, label: 'Alertas', colorHex: '#FF8F00' },
];

const byCodePoint = new Map(
    COMMUNITY_ICON_CATALOG.map((entry) => [entry.codePoint, entry])
);

export function catalogEntryForCodePoint(codePoint) {
    if (codePoint == null) return null;
    return byCodePoint.get(Number(codePoint)) ?? null;
}

export function colorFromHex(hex) {
    if (!hex) return DEFAULT_ICON_COLOR;
    const normalized = hex.replace('#', '');
    return normalized.length === 6 ? `#${normalized}` : `#${normalized}`;
}
