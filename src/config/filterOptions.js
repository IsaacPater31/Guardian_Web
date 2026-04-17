/**
 * filterOptions.js — Shared filter option constants for alert UIs.
 *
 * Previously duplicated in MapFilterPanel.jsx and AlertFilterPanel.jsx.
 * Now defined once; both panels import from here.
 *
 * Principle: DRY + Information Expert (GRASP).
 */

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
 * Centralising this prevents drift between the two pages.
 */
export const DEFAULT_FILTERS = Object.freeze({
    types:       [],
    status:      'all',
    dateRange:   'all',
    customStart: null,
    customEnd:   null,
});

/**
 * Returns the number of non-default filter dimensions.
 * Used by both filter panels to display the active-filter badge.
 *
 * @param {string[]} types
 * @param {string}   status
 * @param {string}   dateRange
 * @returns {number}
 */
export function countActiveFilters(types, status, dateRange) {
    let n = 0;
    if (types.length > 0)   n++;
    if (status    !== 'all') n++;
    if (dateRange !== 'all') n++;
    return n;
}
