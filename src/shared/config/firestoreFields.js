/**
 * Field names aligned with Guardian (`lib/core/app_constants.dart`).
 */
export const CommunityFields = Object.freeze({
    name: 'name',
    description: 'description',
    isEntity: 'is_entity',
    createdBy: 'created_by',
    allowForwardToEntities: 'allow_forward_to_entities',
    createdAt: 'created_at',
    iconCodePoint: 'icon_code_point',
    iconColor: 'icon_color',
    reportButtonColor: 'report_button_color',
    reportAlertTypes: 'report_alert_types',
    /** Comunidades creadas al primer acceso (p. ej. `hogar`). */
    defaultSlug: 'default_slug',
});

/** Slug estable de la comunidad hogar por defecto (alineado con Guardian). */
export const DefaultCommunitySlugs = Object.freeze({
    hogar: 'hogar',
});

export const MemberFields = Object.freeze({
    userId: 'user_id',
    communityId: 'community_id',
    role: 'role',
    joinedAt: 'joined_at',
    /** Etiqueta libre por membresía (p. ej. "Julio Casa 10"). */
    alias: 'alias',
    roleAdmin: 'admin',
    roleMember: 'member',
    roleOfficial: 'official',
});

export const UserFields = Object.freeze({
    displayName: 'displayName',
    fullName: 'full_name',
    name: 'name',
    email: 'email',
    /** Campo canónico de teléfono en perfil admin web. */
    phone: 'phone',
    createdAt: 'created_at',
    /** Misma clave que `UserProfileRepository.mergeProfile` (Guardian). */
    updatedAt: 'updated_at',
    platformAdmin: 'platform_admin',
    /** Cuenta inhabilitada: no puede usar Guardian ni Usersweb. */
    suspended: 'suspended',
    suspendedAt: 'suspended_at',
});
