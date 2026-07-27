/**
 * Etiqueta visible de un miembro en una comunidad.
 * Prioridad: alias (membresía) → displayName (perfil) → fallback.
 * Contrato compartido Usersweb ↔ webapp (ETC: un solo punto de cambio).
 *
 * @param {{ alias?: string|null, displayName?: string|null, fallback?: string }} opts
 * @returns {string}
 */
export function resolveMemberDisplayLabel({
    alias = null,
    displayName = null,
    fallback = 'Usuario',
} = {}) {
    const a = String(alias ?? '').trim();
    if (a) return a;
    const n = String(displayName ?? '').trim();
    if (n) return n;
    return fallback;
}

/**
 * Etiqueta del remitente de una alerta en un contexto de comunidad.
 * Respeta anonimato; alias de membresía prioriza sobre userName.
 *
 * @param {{ isAnonymous?: boolean, userName?: string|null, userEmail?: string|null }} alert
 * @param {string|null|undefined} membershipAlias
 * @returns {string|null}
 */
export function resolveAlertSenderLabel(alert, membershipAlias) {
    if (!alert || alert.isAnonymous) return null;
    const email = String(alert.userEmail ?? '').trim();
    return resolveMemberDisplayLabel({
        alias: membershipAlias,
        displayName: alert.userName,
        fallback: email || 'Usuario',
    });
}

/**
 * Primera alias no vacía del usuario en cualquiera de las comunidades de la alerta.
 *
 * @param {{ userId?: string|null, communityIds?: string[] }} alert
 * @param {Record<string, Record<string, string>>} aliasMapsByCommunityId
 * @returns {string|null}
 */
export function membershipAliasForAlert(alert, aliasMapsByCommunityId = {}) {
    if (!alert?.userId || !alert.communityIds?.length) return null;
    for (const cid of alert.communityIds) {
        const a = aliasMapsByCommunityId[cid]?.[alert.userId];
        if (a) return a;
    }
    return null;
}

/**
 * Remitente con mapas de alias por comunidad (mapa / listados multi-scope).
 *
 * @param {Parameters<typeof resolveAlertSenderLabel>[0]} alert
 * @param {Record<string, Record<string, string>>} [aliasMapsByCommunityId]
 * @returns {string|null}
 */
export function resolveSenderLabelForAlert(alert, aliasMapsByCommunityId = {}) {
    if (!alert || alert.isAnonymous) return null;
    return resolveAlertSenderLabel(
        alert,
        membershipAliasForAlert(alert, aliasMapsByCommunityId),
    );
}
