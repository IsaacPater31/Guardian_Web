import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { subscribeToAlertsFiltered } from '../services/alertService';
import { getAlertColor, getAlertLabel } from '../config/alertTypes';
import AlertCard from '../components/AlertCard';
import AlertDetailModal from '../components/AlertDetailModal';
import AlertFilterPanel from '../components/AlertFilterPanel';
import { EMPTY_FILTERS, countActiveFilters } from '../config/filterOptions';

// ─── Labels de los filtros activos ────────────────────────────────────────────

const STATUS_LABELS = {
    pending:  'No atendidas',
    attended: 'Atendidas',
};

const DATE_LABELS = {
    today:     'Hoy',
    yesterday: 'Ayer',
    week:      'Esta semana',
    '7days':   'Últimos 7 días',
    month:     'Este mes',
    custom:    'Personalizado',
};

export default function AlertsPage() {
    const [alerts, setAlerts]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filters, setFilters]             = useState(EMPTY_FILTERS);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [latestContextAlertId, setLatestContextAlertId] = useState(null);

    // Suscripción reactiva con filtros
    const subscribe = useCallback((activeFilters) => {
        setLoading(true);

        const unsub = subscribeToAlertsFiltered(activeFilters, (data, meta = {}) => {
            setAlerts(data);
            setLoading(false);
            setLatestContextAlertId(meta.latestContextAlertId ?? null);
        });

        return unsub;
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Firestore listener wires loading/alerts
        const unsub = subscribe(filters);
        return unsub;
    }, [filters, subscribe]);

    const applyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const clearFilters = () => setFilters(EMPTY_FILTERS);

    const activeCount = countActiveFilters(filters.types, filters.status, filters.dateRange);
    const hasFilters  = activeCount > 0;

    // ─── Chips de filtros activos ─────────────────────────────────────────────

    const activeChips = [];

    if (filters.types.length > 0) {
        filters.types.forEach((type) => {
            activeChips.push({
                key: `type-${type}`,
                label: getAlertLabel(type),
                color: getAlertColor(type),
                onRemove: () =>
                    setFilters((prev) => ({
                        ...prev,
                        types: prev.types.filter((t) => t !== type),
                    })),
            });
        });
    }

    if (filters.status !== 'all') {
        activeChips.push({
            key: 'status',
            label: STATUS_LABELS[filters.status],
            color: filters.status === 'attended' ? '#34C759' : '#FF9500',
            onRemove: () => setFilters((prev) => ({ ...prev, status: 'all' })),
        });
    }

    if (filters.dateRange !== 'all') {
        activeChips.push({
            key: 'date',
            label: DATE_LABELS[filters.dateRange] ?? 'Fecha',
            color: '#3F51B5',
            onRemove: () =>
                setFilters((prev) => ({
                    ...prev,
                    dateRange: 'all',
                    customStart: null,
                    customEnd: null,
                })),
        });
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading && alerts.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <>
            <div className="alerts-toolbar-card">
            <div className="filter-toolbar">
                {/* Botón principal de filtros */}
                <button
                    id="alerts-filter-btn"
                    className={`filter-toolbar-btn${hasFilters ? ' active' : ''}`}
                    onClick={() => setShowFilterPanel(true)}
                >
                    <LucideIcons.SlidersHorizontal style={{ width: 15, height: 15 }} />
                    Filtros
                    {hasFilters && (
                        <span className="filter-toolbar-badge">{activeCount}</span>
                    )}
                </button>

                {/* Chips de filtros activos */}
                {activeChips.map((chip) => (
                    <span
                        key={chip.key}
                        className="filter-active-chip"
                        style={{ borderColor: chip.color, color: chip.color, background: `${chip.color}15` }}
                    >
                        {chip.label}
                        <button
                            onClick={chip.onRemove}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}
                        >
                            <LucideIcons.X style={{ width: 11, height: 11 }} />
                        </button>
                    </span>
                ))}

                {/* Botón limpiar todo */}
                {hasFilters && (
                    <button className="filter-clear-all-btn" onClick={clearFilters}>
                        Limpiar todo
                    </button>
                )}

                {/* Indicador de carga */}
                {loading && alerts.length > 0 && (
                    <span className="filter-loading-indicator">
                        <span className="filter-loading-dot" />
                        Actualizando…
                    </span>
                )}
            </div>
            </div>

            {/* ── Sección de alertas ── */}
            <div className="section section--dash">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(255, 59, 48, 0.08)' }}>
                            <LucideIcons.AlertTriangle style={{ color: '#FF3B30' }} />
                        </div>
                        <div>
                            <h3 className="section-title">
                                {hasFilters ? 'Alertas filtradas' : 'Todas las alertas'}
                            </h3>
                            <p className="section-subtitle">
                                Listado en vivo según tus filtros
                            </p>
                        </div>
                    </div>
                    <span
                        className="section-badge"
                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                    >
                        {alerts.length}
                    </span>
                </div>

                <div className="section-body section-body--flush">
                    {alerts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <LucideIcons.CheckCircle />
                            </div>
                            <div className="empty-state-title">Sin alertas</div>
                            <div className="empty-state-desc">
                                {hasFilters
                                    ? 'No hay alertas que coincidan con los filtros aplicados.'
                                    : 'No hay alertas recientes.'}
                            </div>
                            {hasFilters && (
                                <button
                                    style={{
                                        marginTop: 12,
                                        padding: '8px 18px',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid var(--color-border)',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-secondary)',
                                    }}
                                    onClick={clearFilters}
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="alerts-feed-grid">
                            {alerts.map((alert, index) => {
                                const isPending = alert.alertStatus !== 'attended';
                                const hasLatest = Boolean(latestContextAlertId);
                                const isLatest = isPending && hasLatest
                                    ? alert.id === latestContextAlertId
                                    : isPending && !hasLatest && index === 0;
                                const isRecent = isPending && (
                                    hasLatest
                                        ? !isLatest && index <= 3
                                        : !isLatest && index <= 2
                                );
                                const priorityLevel = isLatest
                                    ? 'latest'
                                    : isRecent
                                        ? 'recent'
                                        : hasLatest && isPending
                                            ? 'historical'
                                            : 'normal';

                                return (
                                    <AlertCard
                                        key={alert.id}
                                        alert={alert}
                                        onClick={setSelectedAlert}
                                        priorityLevel={priorityLevel}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Panel de filtros ── */}
            {showFilterPanel && (
                <AlertFilterPanel
                    filters={filters}
                    onChange={applyFilters}
                    onClose={() => setShowFilterPanel(false)}
                />
            )}

            {/* ── Modal de detalle ── */}
            {selectedAlert && (
                <AlertDetailModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </>
    );
}
