import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
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
import {
    subscribeToAlertsInDateRange,
    isActivePendingAlert,
    resolveLatestPendingAlertId,
} from '@/features/alerts/repository/alertRepository';
import { subscribeUsersInCreatedRange } from '@/features/admin/repository/adminDirectoryRepository';
import { subscribeToCommunities } from '@/features/communities/repository/communityRepository';
import AlertCard from '@/features/alerts/ui/AlertCard';
import AlertDetailModal from '@/features/alerts/ui/AlertDetailModal';
import DashFilterBar from '@/features/dashboard/ui/DashFilterBar';
import TypeHistogramChart from '@/features/dashboard/ui/TypeHistogramChart';
import {
    computeAnalysisRange,
    daysAgo,
    userInitials,
    aggregateActiveUsersByDay,
    topContributorsFromAlerts,
    formatDayLabel,
    buildScopedAlertStats,
} from '@/features/dashboard/utils/analysisHelpers';
import {
    scopeAlertsByCommunities,
    buildStatsCommunityOptions,
    filterStatsOptionsByKind,
} from '@/features/dashboard/utils/statsScope';

function toIsoDate(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function Dashboard() {
    const [rangeMode, setRangeMode] = useState('preset');
    const [presetDays, setPresetDays] = useState(30);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [bootstrapping, setBootstrapping] = useState(true);
    const [rawAlerts, setRawAlerts] = useState([]);
    const [newUsers, setNewUsers] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [selectedCommunityIds, setSelectedCommunityIds] = useState(null);
    const [kindFilter, setKindFilter] = useState('all');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const hasBootstrappedRef = useRef(false);
    const [chartH, setChartH] = useState(280);

    useEffect(() => {
        const update = () => {
            setChartH(Math.min(420, Math.max(220, Math.round(window.innerHeight * 0.28))));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => subscribeToCommunities(setCommunities), []);

    const {
        start: rangeStart,
        end: rangeEnd,
        incomplete: rangeIncomplete,
    } = useMemo(
        () => computeAnalysisRange(rangeMode, presetDays, customStart, customEnd),
        [rangeMode, presetDays, customStart, customEnd],
    );

    useEffect(() => {
        if (rangeIncomplete) {
            setNewUsers([]);
            return undefined;
        }
        const unsub = subscribeUsersInCreatedRange(rangeStart, rangeEnd, setNewUsers, 120);
        return unsub;
    }, [rangeStart, rangeEnd, rangeIncomplete]);

    useEffect(() => {
        if (rangeIncomplete) {
            setRawAlerts([]);
            if (!hasBootstrappedRef.current) {
                hasBootstrappedRef.current = true;
                setBootstrapping(false);
            }
            return undefined;
        }
        const unsub = subscribeToAlertsInDateRange(rangeStart, rangeEnd, (alData) => {
            setRawAlerts(alData);

            if (!hasBootstrappedRef.current) {
                hasBootstrappedRef.current = true;
                setBootstrapping(false);
            }
        }, 2500);

        return unsub;
    }, [rangeStart, rangeEnd, rangeIncomplete]);

    function enterCustomRange() {
        setRangeMode('custom');
        if (!customStart || !customEnd) {
            setCustomStart(toIsoDate(daysAgo(30)));
            setCustomEnd(toIsoDate(new Date()));
        }
    }

    const communityOptions = useMemo(
        () => buildStatsCommunityOptions(communities),
        [communities],
    );

    const visibleCommunityOptions = useMemo(
        () => filterStatsOptionsByKind(communityOptions, kindFilter),
        [communityOptions, kindFilter],
    );

    const scopedAlerts = useMemo(() => {
        let ids = selectedCommunityIds;
        if (ids == null && kindFilter !== 'all') {
            ids = visibleCommunityOptions.map((o) => o.id);
        }
        return scopeAlertsByCommunities(rawAlerts, ids);
    }, [rawAlerts, selectedCommunityIds, visibleCommunityOptions, kindFilter]);

    /* Business rule: newest unattended alert in the visible scope is highlighted. */
    const latestPendingAlertId = useMemo(
        () => resolveLatestPendingAlertId(scopedAlerts),
        [scopedAlerts],
    );

    const stats = useMemo(
        () => buildScopedAlertStats(scopedAlerts, rangeStart, rangeEnd),
        [scopedAlerts, rangeStart, rangeEnd],
    );

    const activeByDay = useMemo(
        () => aggregateActiveUsersByDay(scopedAlerts, rangeStart, rangeEnd),
        [scopedAlerts, rangeStart, rangeEnd],
    );

    const topContributors = useMemo(
        () => topContributorsFromAlerts(scopedAlerts, 12),
        [scopedAlerts],
    );

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

    if (bootstrapping) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="dash-page">
            <DashFilterBar
                rangeMode={rangeMode}
                presetDays={presetDays}
                customStart={customStart}
                customEnd={customEnd}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                kind={kindFilter}
                onKindChange={setKindFilter}
                onPreset={(d) => {
                    setRangeMode('preset');
                    setPresetDays(d);
                }}
                onCustomMode={enterCustomRange}
                onCustomStart={setCustomStart}
                onCustomEnd={setCustomEnd}
                allOptions={communityOptions}
                visibleOptions={visibleCommunityOptions}
                selectedCommunityIds={selectedCommunityIds}
                onCommunityChange={setSelectedCommunityIds}
            />

            <div className="dash-main">
                <div className="stats-grid admin-stats-grid">
                    {[
                        {
                            label: 'Alertas',
                            value: stats.total,
                            icon: Activity,
                            color: '#FF3B30',
                            bg: 'rgba(255, 59, 48, 0.1)',
                            variant: 'alert',
                        },
                        {
                            label: 'Reenvíos',
                            value: stats.forwards,
                            icon: Forward,
                            color: '#5856D6',
                            bg: 'rgba(88, 86, 214, 0.1)',
                            variant: 'forward',
                        },
                        {
                            label: 'Reportes',
                            value: stats.reports,
                            icon: BarChart3,
                            color: 'var(--color-warning)',
                            bg: 'rgba(255, 149, 0, 0.1)',
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

                <div className="admin-charts-grid dash-charts-priority">
                    <section className="section section--dash admin-chart-section">
                        <div className="section-header">
                            <div className="section-header-left">
                                <div className="section-icon" style={{ background: 'rgba(88, 86, 214, 0.12)' }}>
                                    <BarChart3 style={{ color: '#5856D6' }} />
                                </div>
                                <div>
                                    <h3 className="section-title">Por tipo</h3>
                                    <p className="section-subtitle">Histograma en el alcance actual</p>
                                </div>
                            </div>
                        </div>
                        <div className="section-body admin-chart-body">
                            <TypeHistogramChart bars={stats.typeHistogram.bars} height={chartH} />
                        </div>
                    </section>

                    <section className="section section--dash admin-chart-section">
                        <div className="section-header">
                            <div className="section-header-left">
                                <div className="section-icon" style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
                                    <Activity style={{ color: 'var(--color-info)' }} />
                                </div>
                                <div>
                                    <h3 className="section-title">Alertas por día</h3>
                                    <p className="section-subtitle">Volumen en el periodo</p>
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
                                                borderRadius: 14,
                                                border: '1px solid rgba(255,255,255,0.5)',
                                                background: 'rgba(255,255,255,0.92)',
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
                </div>

                <section className="section section--dash dash-contributors">
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.12)' }}>
                                <Users style={{ color: 'var(--color-success)' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Usuarios más activos</h3>
                                <p className="section-subtitle">Publicaciones identificadas en el alcance</p>
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
                                <BarChart3 style={{ color: 'var(--color-info)' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Usuarios activos por día</h3>
                                <p className="section-subtitle">Emisores únicos con al menos una alerta</p>
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
                                                borderRadius: 14,
                                                border: '1px solid rgba(255,255,255,0.5)',
                                                background: 'rgba(255,255,255,0.92)',
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

                <div className="admin-two-col">
                    <section className="section section--dash">
                        <div className="section-header">
                            <div className="section-header-left">
                                <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                                    <UserPlus style={{ color: 'var(--color-success)' }} />
                                </div>
                                <div>
                                    <h3 className="section-title">Usuarios recientes</h3>
                                    <p className="section-subtitle">
                                        Altas globales en el periodo (no filtradas por comunidad)
                                    </p>
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
                                    <p className="section-subtitle">Mismo alcance y periodo</p>
                                </div>
                            </div>
                        </div>
                        <div className="section-body admin-scroll-list">
                            {scopedAlerts.length === 0 ? (
                                <p className="admin-muted">Sin alertas en este alcance.</p>
                            ) : (
                                scopedAlerts.slice(0, 12).map((a) => (
                                    <AlertCard
                                        key={a.id}
                                        alert={a}
                                        onClick={setSelectedAlert}
                                        isActive={isActivePendingAlert(a, latestPendingAlertId)}
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
        </div>
    );
}
