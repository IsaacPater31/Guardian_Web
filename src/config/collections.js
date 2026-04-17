/**
 * collections.js — Firestore collection names.
 *
 * Single source of truth for every collection identifier used in the app.
 * If a collection is renamed in the backend, change it here and the rest
 * of the app picks it up automatically.
 *
 * Principle: Information Expert (GRASP) — the config layer owns the names.
 */
export const Collections = Object.freeze({
    ALERTS:            'alerts',
    COMMUNITIES:       'communities',
    COMMUNITY_MEMBERS: 'community_members',
    USERS:             'users',
});
