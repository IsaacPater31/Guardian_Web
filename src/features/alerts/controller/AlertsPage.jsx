import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    subscribeToAlertsFiltered,
    isActivePendingAlert,
} from '@/features/alerts/repository/alertRepository';
import { getAlertColor, getAlertLabel } from '@/shared/config/alertTypes';
import AlertCard from '@/features/alerts/ui/AlertCard';
import AlertDetailModal from '@/features/alerts/ui/AlertDetailModal';
import AlertFilterPanel from '@/features/alerts/ui/AlertFilters';
import { EMPTY_FILTERS, countActiveFilters } from '@/shared/config/filterOptions';

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

    const subscribe = useCallback((activeFilters) => {
        setLoading(true);
        const unsub = subscribeToAlertsFiltered(activeFilters, (data, meta = {}) => {
            setAlerts(data);
            setLatestContextAlertId(meta.latestContextAlertId ?? null);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = subscribe(filters);
        return unsub;
    }, [filters, subscribe]);

    const applyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const clearFilters = () => applyFilters(EMPTY_FILTERS);

    const activeCount = countActiveFilters(filters.types, filters.status, filters.dateRange);
    const hasFilters  = activeCount > 0;

    const activeChips = [];

    if (filters.types.length > 0) {
        filters.types.forEach((type) => {
            activeChips.push({
                key: `type-${type}`,
                label: getAlertLabel(type),
                color: getAlertColor(type),
                onRemove: () => {
                    setFilters((prev) => ({
                        ...prev,
                        types: prev.types.filter((t) => t !== type),
                    }));
                },
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
            onRemove: () => {
                setFilters((prev) => ({
                    ...prev,
                    dateRange: 'all',
                    customStart: null,
                    customEnd: null,
                }));
            },
        });
    }

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

                {hasFilters && (
                    <button className="filter-clear-all-btn" onClick={clearFilters}>
                        Limpiar todo
                    </button>
                )}
            </div>
            </div>

            <div className="section section--dash">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(255, 59, 48, 0.08)' }}>
                            <LucideIcons.AlertTriangle style={{ color: '#FF3B30' }} />
                        </div>
                        <div>
                            <h3 className="section-title">
                                {hasFilters ? 'Resultados filtrados' : 'Todas las alertas'}
                            </h3>
                            <p className="section-subtitle">
                                Actualización en tiempo real — de más reciente a más antigua
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
                                    ? 'Ninguna alerta coincide con los filtros.'
                                    : 'Aún no hay alertas registradas.'}
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
                        <div className={`alerts-feed-grid${loading ? ' alerts-feed-grid--loading' : ''}`}>
                            {alerts.map((alert) => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert}
                                    onClick={setSelectedAlert}
                                    isActive={isActivePendingAlert(alert, latestContextAlertId)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showFilterPanel && (
                <AlertFilterPanel
                    filters={filters}
                    onChange={applyFilters}
                    onClose={() => setShowFilterPanel(false)}
                />
            )}

            {selectedAlert && (
                <AlertDetailModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </>
    );
}
