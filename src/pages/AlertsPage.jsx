import { useState, useEffect, useRef, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    fetchAlertsPage,
    fetchActivePendingAlertId,
    isActivePendingAlert,
} from '../services/alertService';
import { getAlertColor, getAlertLabel } from '../config/alertTypes';
import AlertCard from '../components/AlertCard';
import AlertDetailModal from '../components/AlertDetailModal';
import AlertFilterPanel from '../components/AlertFilterPanel';
import AdminPaginationBar from '../components/admin/AdminPaginationBar';
import { ALERTS_LIST_PAGE_SIZE } from '../config/adminPagination';
import { EMPTY_FILTERS, countActiveFilters } from '../config/filterOptions';

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
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const cursorsRef = useRef([null]);
    const listAnchorRef = useRef(null);

    const resetToFirstPage = useCallback(() => {
        cursorsRef.current = [null];
        setPage(1);
    }, []);

    const goToPage = useCallback((nextPage) => {
        setPage(nextPage);
        requestAnimationFrame(() => {
            listAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadActiveId() {
            try {
                const id = await fetchActivePendingAlertId();
                if (!cancelled) setLatestContextAlertId(id);
            } catch {
                if (!cancelled) setLatestContextAlertId(null);
            }
        }

        loadActiveId();
        return () => {
            cancelled = true;
        };
    }, [filters]);

    useEffect(() => {
        let cancelled = false;

        async function loadPage() {
            setLoading(true);
            const cursor = page > 1 ? cursorsRef.current[page - 1] : null;
            try {
                const result = await fetchAlertsPage(filters, {
                    pageSize: ALERTS_LIST_PAGE_SIZE,
                    cursor,
                });
                if (cancelled) return;
                cursorsRef.current[page] = result.lastDoc;
                setAlerts(result.items);
                setHasMore(result.hasMore);
            } catch (e) {
                if (!cancelled) {
                    console.error('[AlertsPage] fetchAlertsPage', e);
                    setAlerts([]);
                    setHasMore(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPage();
        return () => {
            cancelled = true;
        };
    }, [filters, page]);

    const applyFilters = (newFilters) => {
        resetToFirstPage();
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
                    resetToFirstPage();
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
            onRemove: () => {
                resetToFirstPage();
                setFilters((prev) => ({ ...prev, status: 'all' }));
            },
        });
    }

    if (filters.dateRange !== 'all') {
        activeChips.push({
            key: 'date',
            label: DATE_LABELS[filters.dateRange] ?? 'Fecha',
            color: '#3F51B5',
            onRemove: () => {
                resetToFirstPage();
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

            <div className="section section--dash" ref={listAnchorRef}>
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
                                {hasFilters
                                    ? 'Mostrando alertas que coinciden con tus filtros, de más reciente a más antigua'
                                    : 'Historial de alertas de la comunidad, de más reciente a más antigua'}
                            </p>
                        </div>
                    </div>
                    {!loading && (
                        <span
                            className="section-badge"
                            style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                        >
                            {alerts.length}
                        </span>
                    )}
                </div>

                <div className="section-body section-body--flush">
                    {alerts.length === 0 && !loading ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <LucideIcons.CheckCircle />
                            </div>
                            <div className="empty-state-title">Sin alertas</div>
                            <div className="empty-state-desc">
                                {hasFilters
                                    ? 'Ninguna alerta coincide con los filtros en esta página.'
                                    : page > 1
                                      ? 'No hay alertas en esta página. Prueba volver a la anterior.'
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
                    ) : alerts.length > 0 ? (
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
                    ) : null}

                    {(page > 1 || hasMore || alerts.length > 0) && (
                        <AdminPaginationBar
                            page={page}
                            hasMore={hasMore}
                            loading={loading}
                            onPrev={() => page > 1 && goToPage(page - 1)}
                            onNext={() => hasMore && goToPage(page + 1)}
                            pageSize={ALERTS_LIST_PAGE_SIZE}
                            shownCount={alerts.length}
                            label="alertas"
                            labelSingular="alerta"
                            filterActive={hasFilters}
                        />
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
