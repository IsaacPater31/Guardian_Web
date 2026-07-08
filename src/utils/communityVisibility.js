/** User-facing lists hide official entity communities in this product iteration. */
// Las entidades (`is_entity: true`) son bandejas de reportes: en el móvil se
// muestran en el apartado "Reportes" y solo el rol official recibe
// las notificaciones de reportes de terceros.
// TODO(entidades): panel web con inicio de sesión para que cada entidad
// genere sus propios códigos/enlaces de invitación. Hoy los enlaces se
// generan desde la app móvil (admins de la entidad).
export function isOfficialEntityCommunity(community) {
    return community?.isEntity === true;
}

export function visibleUserCommunities(communities) {
    return (communities ?? []).filter((c) => !isOfficialEntityCommunity(c));
}
