/**
 * dateRangeUtils.js — Date range resolution utilities.
 *
 * Extracted from alertService.js to honour Single Responsibility.
 * This module has one job: convert a range key or custom dates into
 * a { start: Date|null, end: Date|null } pair ready for Firestore queries.
 *
 * Mirrors Flutter AlertRepository._resolveDateRange.
 */

/**
 * Resolve a named date-range preset to a `{ start, end }` pair.
 *
 * @param {'today'|'yesterday'|'week'|'7days'|'month'} range
 * @returns {{ start: Date, end: Date|null }}
 */
export function resolveDateRange(range) {
    const now = new Date();

    switch (range) {
        case 'today':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                end:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            };

        case 'yesterday': {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            return {
                start: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0),
                end:   new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59),
            };
        }

        case 'week': {
            // Monday of the current week
            const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon = 0
            const monday = new Date(now);
            monday.setDate(now.getDate() - dayOfWeek);
            monday.setHours(0, 0, 0, 0);
            return { start: monday, end: now };
        }

        case '7days': {
            const start = new Date(now);
            start.setDate(now.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        case 'month':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
                end:   now,
            };

        default:
            return { start: null, end: null };
    }
}

/**
 * Given a filter object, returns the resolved { start, end } dates.
 * Handles both preset ranges and custom ISO date strings from <input type="date">.
 *
 * @param {{
 *   dateRange: string,
 *   customStart: Date|string|null,
 *   customEnd: Date|string|null,
 * }} filters
 * @returns {{ start: Date|null, end: Date|null }}
 */
export function resolveFilterDates({ dateRange, customStart, customEnd }) {
    if (dateRange === 'all') return { start: null, end: null };

    if (dateRange === 'custom') {
        // customStart/customEnd may be Date objects (from MapFilterPanel)
        // or ISO date strings 'YYYY-MM-DD' (from AlertFilterPanel date inputs)
        const toDate = (val, timeStr) => {
            if (!val) return null;
            if (val instanceof Date) return val;
            return new Date(`${val}T${timeStr}`);
        };
        return {
            start: toDate(customStart, '00:00:00'),
            end:   toDate(customEnd,   '23:59:59'),
        };
    }

    return resolveDateRange(dateRange);
}
