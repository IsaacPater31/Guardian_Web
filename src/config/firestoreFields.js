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
});

export const MemberFields = Object.freeze({
    userId: 'user_id',
    communityId: 'community_id',
    role: 'role',
    joinedAt: 'joined_at',
    roleAdmin: 'admin',
    roleMember: 'member',
    roleOfficial: 'official',
});

export const UserFields = Object.freeze({
    displayName: 'displayName',
    fullName: 'full_name',
    name: 'name',
    email: 'email',
    createdAt: 'created_at',
    platformAdmin: 'platform_admin',
});
