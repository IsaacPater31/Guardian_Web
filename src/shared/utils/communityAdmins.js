import { DefaultCommunitySlugs } from '@/shared/config/firestoreFields';

/**
 * ¿Es comunidad Hogar por defecto? (slug estable o nombre legacy).
 * @param {{ defaultSlug?: string|null, name?: string|null }} community
 */
export function isDefaultHogarCommunity(community) {
    if (!community) return false;
    if (community.defaultSlug === DefaultCommunitySlugs.hogar) return true;
    return String(community.name || '').trim().toLowerCase() === 'hogar';
}
