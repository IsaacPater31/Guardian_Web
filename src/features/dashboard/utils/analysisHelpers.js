/**
 * Dashboard period / aggregation helpers (pure).
 * Kept out of the page controller for ETC and testability.
 */

export const PRESET_DAYS = [
    { days: 7, label: '7 días' },
    { days: 14, label: '14 días' },
    { days: 30, label: '30 días' },
    { days: 90, label: '90 días' },
    { days: 180, label: '6 meses' },
    { days: 365, label: '1 año' },
];

export function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

export function computeAnalysisRange(mode, presetDays, customStart, customEnd) {
    const now = new Date();
    if (mode === 'custom') {
        if (!customStart || !customEnd) {
            return { start: daysAgo(30), end: now, incomplete: true };
        }
        let s = startOfDay(new Date(`${customStart}T12:00:00`));
        let e = endOfDay(new Date(`${customEnd}T12:00:00`));
        if (s.getTime() > e.getTime()) {
            s = startOfDay(new Date(`${customEnd}T12:00:00`));
            e = endOfDay(new Date(`${customStart}T12:00:00`));
        }
        if (e.getTime() > now.getTime()) e = now;
        return { start: s, end: e, incomplete: false };
    }
    return { start: daysAgo(presetDays), end: endOfDay(now), incomplete: false };
}

export function localDateKey(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function formatPeriodSummary(start, end) {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    const a = start.toLocaleDateString('es-CO', opts);
    const b = end.toLocaleDateString('es-CO', opts);
    return `${a} — ${b}`;
}

export function userInitials(displayName, email) {
    const n = (displayName || '').trim();
    if (n) {
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return n.slice(0, 2).toUpperCase();
    }
    const e = (email || '').trim();
    if (e) return e.slice(0, 2).toUpperCase();
    return '?';
}

export function aggregateByDay(alerts, start, end) {
    const map = new Map();
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endT = end.getTime();
    while (cur.getTime() <= endT) {
        map.set(localDateKey(cur), 0);
        cur.setDate(cur.getDate() + 1);
    }
    for (const a of alerts) {
        const t = a.timestamp?.toDate?.();
        if (!t) continue;
        const key = localDateKey(t);
        if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].map(([date, count]) => ({ date, count }));
}

/** Usuarios únicos por día (publicaron alerta identificada; excluye anónimos sin UID). */
export function aggregateActiveUsersByDay(alerts, start, end) {
    const alertCount = new Map();
    const userSets = new Map();
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endT = end.getTime();
    while (cur.getTime() <= endT) {
        const key = localDateKey(cur);
        alertCount.set(key, 0);
        userSets.set(key, new Set());
        cur.setDate(cur.getDate() + 1);
    }
    for (const a of alerts) {
        const t = a.timestamp?.toDate?.();
        if (!t) continue;
        const key = localDateKey(t);
        if (!alertCount.has(key)) continue;
        alertCount.set(key, (alertCount.get(key) || 0) + 1);
        if (a.userId && !a.isAnonymous) {
            userSets.get(key).add(a.userId);
        }
    }
    return [...userSets.keys()].sort().map((date) => ({
        date,
        activeUsers: userSets.get(date).size,
        alertCount: alertCount.get(date) || 0,
    }));
}

function contributorLabelFromAlert(a) {
    const n = a.userName?.trim();
    if (n) return n;
    const e = a.userEmail?.trim();
    if (e) return e;
    if (a.userId) return `${a.userId.slice(0, 8)}…`;
    return 'Usuario';
}

/** Ranking por cantidad de alertas publicadas en el periodo. */
export function topContributorsFromAlerts(alerts, limit = 12) {
    const map = new Map();
    for (const a of alerts) {
        if (!a.userId || a.isAnonymous) continue;
        if (!map.has(a.userId)) {
            map.set(a.userId, { id: a.userId, label: contributorLabelFromAlert(a), count: 0 });
        }
        map.get(a.userId).count += 1;
    }
    return [...map.values()].sort((x, y) => y.count - x.count).slice(0, limit);
}

export function formatDayLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y) return iso;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
