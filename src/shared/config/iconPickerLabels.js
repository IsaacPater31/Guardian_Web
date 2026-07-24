/**
 * Contextual copy for the shared icon catalog picker.
 * One source of truth per domain so community/entity/emergency-type flows
 * never reuse the wrong label (ISO 25010 maintainability / ETC).
 *
 * Keep strings in sync with Usersweb `iconPickerLabels.js` and guardian l10n keys.
 */

/** @typedef {'community' | 'entity' | 'emergencyType'} IconPickerDomain */

export const IconPickerDomain = Object.freeze({
    COMMUNITY: 'community',
    ENTITY: 'entity',
    EMERGENCY_TYPE: 'emergencyType',
});

export const ICON_PICKER_LABELS = Object.freeze({
    [IconPickerDomain.COMMUNITY]: 'Icono de la comunidad',
    [IconPickerDomain.ENTITY]: 'Icono de la entidad',
    [IconPickerDomain.EMERGENCY_TYPE]: 'Icono del tipo de emergencia',
});

/**
 * @param {IconPickerDomain | string} domain
 * @returns {string}
 */
export function iconPickerLabel(domain) {
    const label = ICON_PICKER_LABELS[domain];
    if (!label) {
        throw new Error(`Unknown icon picker domain: ${domain}`);
    }
    return label;
}

/**
 * @param {boolean} isEntity
 * @returns {string}
 */
export function iconPickerLabelForSubject(isEntity) {
    return iconPickerLabel(
        isEntity ? IconPickerDomain.ENTITY : IconPickerDomain.COMMUNITY,
    );
}

/**
 * @param {boolean} isEntity
 * @returns {string}
 */
export function subjectEditTitle(isEntity) {
    return isEntity ? 'Editar entidad' : 'Editar comunidad';
}

/**
 * @param {boolean} isEntity
 * @returns {string}
 */
export function subjectInfoTitle(isEntity) {
    return isEntity ? 'Información de la entidad' : 'Información de la comunidad';
}

/**
 * @param {string | null | undefined} modal
 * @returns {string}
 */
export function communityFormModalTitle(modal) {
    switch (modal) {
        case 'create-community':
            return 'Nueva comunidad';
        case 'create-entity':
            return 'Nueva entidad de reportes';
        case 'edit-community':
            return subjectEditTitle(false);
        case 'edit-entity':
            return subjectEditTitle(true);
        default:
            return 'Comunidad';
    }
}
