/**
 * filterOptions.js — Shared filter option constants for alert UIs.
 * Single source for Map + Alerts filter panels (DRY).
 */

import { ACTIVE_ALERT_TYPES } from '@/shared/config/alertTypes';

/** Alert attendance status filter options. */
export const STATUS_OPTIONS = Object.freeze([
    { value: 'all',      label: 'Todas' },
    { value: 'pending',  label: 'No atendida' },
    { value: 'attended', label: 'Atendida' },
]);

/** Date range preset filter options. */
export const DATE_OPTIONS = Object.freeze([
    { value: 'all',       label: 'Cualquier fecha' },
    { value: 'today',     label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'week',      label: 'Esta semana' },
    { value: '7days',     label: 'Últimos 7 días' },
    { value: 'month',     label: 'Este mes' },
    { value: 'custom',    label: 'Personalizado' },
]);

/**
 * Default filter state — shared by MapPage and AlertsPage.
 */
export const DEFAULT_FILTERS = Object.freeze({
    types:       [],
    status:      'all',
    dateRange:   'all',
    customStart: null,
    customEnd:   null,
});

/** Alias kept for AlertsPage imports. */
export const EMPTY_FILTERS = DEFAULT_FILTERS;

/**
 * Default type chips from ACTIVE_ALERT_TYPES (or caller override).
 * @param {Array|{key:string,label?:string,color?:string,icon?:string}|null|undefined} typeOptions
 */
export function resolveTypeOptions(typeOptions) {
    if (Array.isArray(typeOptions)) return typeOptions;
    return Object.entries(ACTIVE_ALERT_TYPES).map(([key, meta]) => ({
        key,
        label: meta.labelEs || meta.label || key,
        color: meta.color,
        icon: meta.icon,
    }));
}

/**
 * @param {string[]} types
 * @param {string}   status
 * @param {string}   dateRange
 * @returns {number}
 */
export function countActiveFilters(types, status, dateRange) {
    let n = 0;
    if (types.length > 0) n++;
    if (status !== 'all') n++;
    if (dateRange !== 'all') n++;
    return n;
}

/** Compatible with filter objects. */
export function countActiveFiltersCompat(filters) {
    return countActiveFilters(filters.types, filters.status, filters.dateRange);
}
