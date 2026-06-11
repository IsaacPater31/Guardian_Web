import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    Activity,
    Forward,
    UserPlus,
    BarChart3,
    Users,
} from 'lucide-react';
import { subscribeToAlertsInDateRange, isActivePendingAlert } from '../services/alertService';
import { adminListUsersInCreatedRange } from '../services/adminCrudService';
import { getAlertColor, getAlertLabel } from '../config/alertTypes';
import AlertCard from '../components/AlertCard';
import AlertDetailModal from '../components/AlertDetailModal';

const PRESET_DAYS = [
    { days: 7, label: '7 días' },
    { days: 14, label: '14 días' },
    { days: 30, label: '30 días' },
    { days: 90, label: '90 días' },
    { days: 180, label: '6 meses' },
    { days: 365, label: '1 año' },
];

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function computeAnalysisRange(mode, presetDays, customStart, customEnd) {
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
    return { start: daysAgo(presetDays), end: now, incomplete: false };
}

function localDateKey(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatPeriodSummary(start, end) {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    const a = start.toLocaleDateString('es-CO', opts);
    const b = end.toLocaleDateString('es-CO', opts);
    return `${a} — ${b}`;
}

function userInitials(displayName, email) {
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

function aggregateByDay(alerts, start, end) {
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
function aggregateActiveUsersByDay(alerts, start, end) {
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
function topContributorsFromAlerts(alerts, limit = 12) {
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

function formatDayLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y) return iso;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
    const [rangeMode, setRangeMode] = useState('preset');
    const [presetDays, setPresetDays] = useState(30);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [loading, setLoading] = useState(true);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [newUsers, setNewUsers] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [latestContextAlertId, setLatestContextAlertId] = useState(null);
    const [manualRefreshKey, setManualRefreshKey] = useState(0);
    const hasBootstrappedRef = useRef(false);
    const [chartH, setChartH] = useState(320);
    useEffect(() => {
        const update = () => {
            setChartH(Math.min(520, Math.max(260, Math.round(window.innerHeight * 0.32))));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const { start: rangeStart, end: rangeEnd } = useMemo(
        () => computeAnalysisRange(rangeMode, presetDays, customStart, customEnd),
        [rangeMode, presetDays, customStart, customEnd],
    );

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const users = await adminListUsersInCreatedRange(rangeStart, rangeEnd, 120);
            setNewUsers(users);
        } catch (e) {
            console.error(e);
            setNewUsers([]);
        } finally {
            if (hasBootstrappedRef.current) {
                setLoading(false);
            }
        }
    }, [rangeStart, rangeEnd]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers, manualRefreshKey]);

    useEffect(() => {
        if (hasBootstrappedRef.current) {
            setLoading(true);
        }
        const unsub = subscribeToAlertsInDateRange(rangeStart, rangeEnd, (alData, meta = {}) => {
            setAlerts(alData);
            setLatestContextAlertId(meta.latestContextAlertId ?? null);

            if (!hasBootstrappedRef.current) {
                hasBootstrappedRef.current = true;
                setBootstrapping(false);
            }
            setLoading(false);
        }, 2500);

        return unsub;
    }, [rangeStart, rangeEnd, manualRefreshKey]);

    const stats = useMemo(() => {
        const byType = {};
        let forwards = 0;
        let reports = 0;
        for (const a of alerts) {
            byType[a.alertType] = (byType[a.alertType] || 0) + 1;
            forwards += a.forwardsCount || 0;
            reports += a.reportsCount || 0;
        }
        const chartData = aggregateByDay(alerts, rangeStart, rangeEnd);

        const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
        const pieData = typeEntries.slice(0, 10).map(([type, value]) => ({
            name: getAlertLabel(type),
            type,
            value,
        }));
        const otherSum = typeEntries.slice(10).reduce((acc, [, v]) => acc + v, 0);
        if (otherSum > 0) {
            pieData.push({ name: 'Otros', type: 'OTHER', value: otherSum });
        }

        return {
            total: alerts.length,
            byType,
            forwards,
            reports,
            chartData,
            pieData,
            typeEntries,
        };
    }, [alerts, rangeStart, rangeEnd]);

    const activeByDay = useMemo(
        () => aggregateActiveUsersByDay(alerts, rangeStart, rangeEnd),
        [alerts, rangeStart, rangeEnd],
    );

    const topContributors = useMemo(() => topContributorsFromAlerts(alerts, 12), [alerts]);

    const peakDates = useMemo(() => {
        const nonzero = activeByDay.filter((r) => r.activeUsers > 0);
        if (nonzero.length === 0) return new Set();
        const sorted = [...nonzero].sort((a, b) => b.activeUsers - a.activeUsers);
        const cut = Math.min(3, sorted.length);
        return new Set(sorted.slice(0, cut).map((r) => r.date));
    }, [activeByDay]);

    const activityTableRows = useMemo(
        () => [...activeByDay].filter((r) => r.alertCount > 0 || r.activeUsers > 0).reverse(),
        [activeByDay],
    );

    const CHART_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FFCC00', '#8E8E93'];

    const periodSummary = useMemo(
        () => formatPeriodSummary(rangeStart, rangeEnd),
        [rangeStart, rangeEnd],
    );

    if (bootstrapping) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    const periodKey = `${rangeStart.getTime()}-${rangeEnd.getTime()}-${rangeMode}`;
    const isRefreshing = loading && !bootstrapping;

    return (
        <>
            <div className={`dash-period-card${isRefreshing ? ' dash-period-card--busy' : ''}`}>
                <div className="dash-period-head">
                    <div className="dash-period-head-main">
                        <div className="dash-period-title">Periodo</div>
                        <div className="dash-period-dates" key={periodKey}>
                            {periodSummary}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`dash-refresh-btn${isRefreshing ? ' dash-refresh-btn--busy' : ''}`}
                        onClick={() => setManualRefreshKey((v) => v + 1)}
                        disabled={loading}
                    >
                        {loading ? 'Actualizando…' : 'Actualizar'}
                    </button>
                </div>
                <div className="admin-toolbar-ranges dash-period-ranges">
                    <div className="admin-segmented admin-segmented--ios admin-segmented--scroll">
                        {PRESET_DAYS.map(({ days: d, label }) => (
                            <button
                                key={d}
                                type="button"
                                className={`admin-segment${
                                    rangeMode === 'preset' && presetDays === d ? ' active' : ''
                                }`}
                                onClick={() => {
                                    setRangeMode('preset');
                                    setPresetDays(d);
                                }}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`admin-segment${rangeMode === 'custom' ? ' active' : ''}`}
                            onClick={() => setRangeMode('custom')}
                        >
                            Personalizado
                        </button>
                    </div>
                    {rangeMode === 'custom' && (
                        <div
                            key="custom-range"
                            className="admin-custom-range admin-custom-range--inline admin-custom-range--animate"
                        >
                            <label className="admin-date-field">
                                <span className="admin-date-field-label">Desde</span>
                                <input
                                    type="date"
                                    className="admin-date-input"
                                    value={customStart}
                                    max={customEnd || new Date().toISOString().slice(0, 10)}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                />
                            </label>
                            <span className="admin-custom-range-sep" aria-hidden>
                                —
                            </span>
                            <label className="admin-date-field">
                                <span className="admin-date-field-label">Hasta</span>
                                <input
                                    type="date"
                                    className="admin-date-input"
                                    value={customEnd}
                                    min={customStart || undefined}
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`dash-main${isRefreshing ? ' dash-main--refreshing' : ''}`}
                aria-busy={isRefreshing}
            >
            <div className="stats-grid admin-stats-grid">
                {[
                    {
                        label: 'Alertas en rango',
                        value: stats.total,
                        icon: Activity,
                        color: '#FF3B30',
                        bg: 'rgba(255, 59, 48, 0.08)',
                        variant: 'alert',
                    },
                    {
                        label: 'Reenvíos (suma)',
                        value: stats.forwards,
                        icon: Forward,
                        color: '#5856D6',
                        bg: 'rgba(88, 86, 214, 0.08)',
                        variant: 'forward',
                    },
                    {
                        label: 'Reportes (suma)',
                        value: stats.reports,
                        icon: BarChart3,
                        color: '#FF9500',
                        bg: 'rgba(255, 149, 0, 0.08)',
                        variant: 'report',
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className={`stat-card stat-card--dash stat-card--${s.variant}`}
                        style={{ '--stat-accent': s.color }}
                    >
                        <div className="stat-card-header">
                            <div className="stat-card-icon" style={{ background: s.bg }}>
                                <s.icon style={{ color: s.color }} />
                            </div>
                        </div>
                        <div className="stat-card-value">{s.value}</div>
                        <div className="stat-card-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <section className="section section--dash dash-contributors">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.12)' }}>
                            <Users style={{ color: '#34C759' }} />
                        </div>
                        <div>
                            <h3 className="section-title">Usuarios más activos</h3>
                            <p className="section-subtitle">
                                Por alertas publicadas en el periodo (cuentas identificadas, sin anónimos)
                            </p>
                        </div>
                    </div>
                </div>
                <div className="section-body section-body--table">
                    {topContributors.length === 0 ? (
                        <p className="admin-muted admin-empty-inset">
                            Sin actividad identificada en este rango.
                        </p>
                    ) : (
                        <div className="admin-table-scroll">
                            <table className="admin-table admin-table--users admin-table--compact">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th className="admin-th-narrow">Alertas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topContributors.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <span className="admin-user-avatar admin-user-avatar--sm" aria-hidden>
                                                        {userInitials(row.label, row.id)}
                                                    </span>
                                                    <span className="admin-user-name">{row.label}</span>
                                                </div>
                                            </td>
                                            <td className="admin-td-num">{row.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section className="section section--dash dash-activity-section">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
                            <BarChart3 style={{ color: '#007AFF' }} />
                        </div>
                        <div>
                            <h3 className="section-title">Usuarios activos por día</h3>
                            <p className="section-subtitle">
                                Picos de participación: usuarios únicos que emitieron al menos una alerta cada día
                            </p>
                        </div>
                    </div>
                </div>
                <div className="section-body admin-activity-split">
                    <div className="admin-chart-body admin-activity-chart">
                        {activeByDay.every((r) => r.activeUsers === 0) ? (
                            <p className="admin-muted">Sin datos de actividad identificada.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={chartH}>
                                <BarChart data={activeByDay} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" width={32} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(52, 199, 89, 0.06)' }}
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            fontSize: 13,
                                        }}
                                    />
                                    <Bar
                                        dataKey="activeUsers"
                                        name="Usuarios activos"
                                        fill="#34C759"
                                        radius={[7, 7, 0, 0]}
                                        maxBarSize={48}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="admin-activity-table-panel">
                        {activityTableRows.length === 0 ? (
                            <p className="admin-muted admin-empty-inset">Sin filas para mostrar.</p>
                        ) : (
                            <div className="admin-activity-table-wrap">
                                <table className="admin-table admin-table--users admin-table--compact">
                                    <thead>
                                        <tr>
                                            <th>Día</th>
                                            <th className="admin-th-narrow">Activos</th>
                                            <th className="admin-th-narrow">Alertas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityTableRows.map((r) => (
                                            <tr key={r.date} className={peakDates.has(r.date) ? 'admin-row-peak' : ''}>
                                                <td>
                                                    <span className="admin-day-label">{formatDayLabel(r.date)}</span>
                                                    {peakDates.has(r.date) && (
                                                        <span className="dash-peak-badge">Pico</span>
                                                    )}
                                                </td>
                                                <td className="admin-td-num">{r.activeUsers}</td>
                                                <td className="admin-td-num admin-td-muted">{r.alertCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="admin-charts-grid">
                <section className="section section--dash admin-chart-section">
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(0, 122, 255, 0.08)' }}>
                                <Activity style={{ color: '#007AFF' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Alertas por día</h3>
                                <p className="section-subtitle">Volumen diario en el periodo</p>
                            </div>
                        </div>
                    </div>
                    <div className="section-body admin-chart-body">
                        {stats.chartData.length === 0 ? (
                            <p className="admin-muted">Sin datos en este rango.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={chartH}>
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#007AFF" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            fontSize: 13,
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#007AFF"
                                        strokeWidth={2}
                                        fill="url(#dashFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                <section className="section section--dash admin-chart-section">
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(88, 86, 214, 0.08)' }}>
                                <BarChart3 style={{ color: '#5856D6' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Distribución por tipo</h3>
                                <p className="section-subtitle">Participación por categoría</p>
                            </div>
                        </div>
                    </div>
                    <div className="section-body admin-chart-body">
                        {stats.pieData.length === 0 ? (
                            <p className="admin-muted">Sin datos.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={chartH}>
                                <PieChart>
                                    <Pie
                                        data={stats.pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={88}
                                        paddingAngle={2}
                                    >
                                        {stats.pieData.map((entry, i) => (
                                            <Cell
                                                key={entry.type}
                                                fill={
                                                    entry.type === 'OTHER'
                                                        ? '#8E8E93'
                                                        : getAlertColor(entry.type) || CHART_COLORS[i % CHART_COLORS.length]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>
            </div>

            <div className="admin-two-col">
                <section className="section section--dash">
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                                <UserPlus style={{ color: '#34C759' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Usuarios recientes</h3>
                                <p className="section-subtitle">Altas en el periodo seleccionado</p>
                            </div>
                        </div>
                    </div>
                    <div className="section-body section-body--table">
                        {newUsers.length === 0 ? (
                            <p className="admin-muted admin-empty-inset">
                                No hay altas de usuario en este periodo.
                            </p>
                        ) : (
                            <div className="admin-table-scroll">
                                <table className="admin-table admin-table--users">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Correo</th>
                                            <th className="admin-th-date">Fecha de ingreso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newUsers.map((u) => (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="admin-user-cell">
                                                        <span className="admin-user-avatar" aria-hidden>
                                                            {userInitials(u.displayName, u.email)}
                                                        </span>
                                                        <span className="admin-user-name">
                                                            {u.displayName?.trim() || 'Sin nombre'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {u.email ? (
                                                        <a className="admin-user-email" href={`mailto:${u.email}`}>
                                                            {u.email}
                                                        </a>
                                                    ) : (
                                                        <span className="admin-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="admin-td-date">{u.createdDisplay}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>

                <section className="section section--dash">
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(255, 59, 48, 0.08)' }}>
                                <Activity style={{ color: '#FF3B30' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Últimas alertas</h3>
                                <p className="section-subtitle">En el mismo periodo</p>
                            </div>
                        </div>
                    </div>
                    <div className="section-body admin-scroll-list">
                        {alerts.length === 0 ? (
                            <p className="admin-muted">Sin alertas en este periodo.</p>
                        ) : (
                            alerts.slice(0, 12).map((a) => (
                                <AlertCard
                                    key={a.id}
                                    alert={a}
                                    onClick={setSelectedAlert}
                                    isActive={isActivePendingAlert(a, latestContextAlertId)}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>

            </div>

            {selectedAlert && (
                <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
            )}
        </>
    );
}
