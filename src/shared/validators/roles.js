import { MemberFields } from '@/shared/config/firestoreFields';

export const NON_ENTITY_ROLES = Object.freeze([
    MemberFields.roleMember,
    MemberFields.roleAdmin,
]);

export const ENTITY_ROLES = Object.freeze([
    MemberFields.roleMember,
    MemberFields.roleOfficial,
]);

export const NON_ENTITY_ROLE_SET = new Set(NON_ENTITY_ROLES);
export const ENTITY_ROLE_SET = new Set(ENTITY_ROLES);

export function allowedRolesFor(isEntity) {
    return isEntity ? ENTITY_ROLES : NON_ENTITY_ROLES;
}

export function roleSelectOptions(isEntity) {
    if (isEntity) {
        return [
            { value: MemberFields.roleMember, label: 'Miembro' },
            { value: MemberFields.roleOfficial, label: 'Oficial' },
        ];
    }
    return [
        { value: MemberFields.roleMember, label: 'Miembro' },
        { value: MemberFields.roleAdmin, label: 'Administrador' },
    ];
}
