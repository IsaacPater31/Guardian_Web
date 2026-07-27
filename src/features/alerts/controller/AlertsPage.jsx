import { useState, useEffect, useCallback, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    subscribeToAlertsFiltered,
    isActivePendingAlert,
    resolveLatestPendingAlertId,
} from '@/features/alerts/repository/alertRepository';
import { getAlertColor, getAlertLabel } from '@/shared/config/alertTypes';
import AlertCard from '@/features/alerts/ui/AlertCard';
import AlertDetailModal from '@/features/alerts/ui/AlertDetailModal';
import AlertFilterPanel from '@/features/alerts/ui/AlertFilters';
import CommunityScopeFilterBar from '@/features/communities/ui/CommunityScopeFilterBar';
import { subscribeToCommunities, getMemberAliasMap } from '@/features/communities/repository/communityRepository';
import {
    buildStatsCommunityOptions,
    filterStatsOptionsByKind,
    reconcileSelectedCommunityIds,
} from '@/features/dashboard/utils/statsScope';
import { filterAlertsByCommunities } from '@/features/alerts/utils/alertScope';
import { EMPTY_FILTERS, countActiveFilters } from '@/shared/config/filterOptions';
import { resolveSenderLabelForAlert } from '@/shared/utils/memberDisplayLabel';

const STATUS_LABELS = {
    pending: 'No atendidas',
    attended: 'Atendidas',
};

const DATE_LABELS = {
    today: 'Hoy',
    yesterday: 'Ayer',
    week: 'Esta semana',
    '7days': 'Últimos 7 días',
    month: 'Este mes',
    custom: 'Personalizado',
};

const KIND_OPTIONS = [
    { key: 'all', label: 'Todos' },
    { key: 'communities', label: 'Comunidades' },
    { key: 'entities', label: 'Entidades' },
];

export default function AlertsPage() {
    const [rawAlerts, setRawAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [communities, setCommunities] = useState([]);
    const [kindFilter, setKindFilter] = useState('all');
    /** null = all visible for kind; [] = none; [ids] = subset */
    const [selectedCommunityIds, setSelectedCommunityIds] = useState(null);
    const [aliasMaps, setAliasMaps] = useState({});

    useEffect(() => subscribeToCommunities(setCommunities), []);

    const communityOptions = useMemo(
        () => buildStatsCommunityOptions(communities),
        [communities],
    );

    const visibleCommunityOptions = useMemo(
        () => filterStatsOptionsByKind(communityOptions, kindFilter),
        [communityOptions, kindFilter],
    );

    const scopeCommunities = useMemo(
        () => visibleCommunityOptions.map((o) => ({
            id: o.id,
            name: o.name,
            isEntity: o.isEntity,
        })),
        [visibleCommunityOptions],
    );

    const effectiveCommunityIds = useMemo(() => {
        if (selectedCommunityIds == null) {
            return visibleCommunityOptions.map((o) => o.id);
        }
        return selectedCommunityIds;
    }, [selectedCommunityIds, visibleCommunityOptions]);

    useEffect(() => {
        let cancelled = false;
        const ids = [...new Set(effectiveCommunityIds)];
        if (ids.length === 0) {
            setAliasMaps({});
            return undefined;
        }
        Promise.all(ids.map(async (id) => [id, await getMemberAliasMap(id)]))
            .then((entries) => {
                if (!cancelled) setAliasMaps(Object.fromEntries(entries));
            })
            .catch((err) => {
                console.warn("[AlertsPage] alias maps", err);
                if (!cancelled) setAliasMaps({});
            });
        return () => {
            cancelled = true;
        };
    }, [effectiveCommunityIds]);

    const alerts = useMemo(
        () => filterAlertsByCommunities(rawAlerts, effectiveCommunityIds),
        [rawAlerts, effectiveCommunityIds],
    );

    /* Business rule: the newest unattended alert in the visible scope is highlighted. */
    const latestPendingAlertId = useMemo(
        () => resolveLatestPendingAlertId(alerts),
        [alerts],
    );

    const subscribe = useCallback((activeFilters) => {
        setLoading(true);
        const unsub = subscribeToAlertsFiltered(activeFilters, (data) => {
            setRawAlerts(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = subscribe(filters);
        return unsub;
    }, [filters, subscribe]);

    function setKindAndReconcile(nextKind) {
        setKindFilter(nextKind);
        const nextVisible = filterStatsOptionsByKind(communityOptions, nextKind);
        const reconciled = reconcileSelectedCommunityIds(selectedCommunityIds, nextVisible);
        setSelectedCommunityIds(reconciled);
    }

    const applyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const clearFilters = () => {
        applyFilters(EMPTY_FILTERS);
        setSelectedCommunityIds(null);
    };

    const activeCount = countActiveFilters(filters.types, filters.status, filters.dateRange);
    const hasFilters = activeCount > 0;
    const communityFilterActive = selectedCommunityIds != null;
    const showKindFilter = useMemo(() => {
        const hasCommunity = communityOptions.some((o) => !o.isEntity);
        const hasEntity = communityOptions.some((o) => o.isEntity);
        return hasCommunity && hasEntity;
    }, [communityOptions]);

    const activeChips = [];

    if (communityFilterActive) {
        const label = selectedCommunityIds.length === 0
            ? 'Sin alcance'
            : selectedCommunityIds.length === 1
              ? scopeCommunities.find((c) => c.id === selectedCommunityIds[0])?.name || '1 seleccionada'
              : `${selectedCommunityIds.length} seleccionadas`;
        activeChips.push({
            key: 'community-scope',
            label,
            color: '#3F51B5',
            onRemove: () => setSelectedCommunityIds(null),
        });
    }

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
            color: filters.status === 'attended' ? '#2E7D32' : '#B45309',
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

    if (loading && alerts.length === 0 && rawAlerts.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <>
            <div className="alerts-toolbar-card">
                {showKindFilter && (
                    <div className="alerts-kind-segments">
                        <span className="alerts-kind-segments-label" id="alerts-kind-label">
                            Tipo
                        </span>
                        <div
                            className="admin-segmented admin-segmented--ios"
                            role="group"
                            aria-labelledby="alerts-kind-label"
                        >
                            {KIND_OPTIONS.map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    className={`admin-segment${kindFilter === opt.key ? ' active' : ''}`}
                                    aria-pressed={kindFilter === opt.key}
                                    onClick={() => setKindAndReconcile(opt.key)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {scopeCommunities.length > 0 && (
                    <CommunityScopeFilterBar
                        communities={scopeCommunities}
                        selectedIds={selectedCommunityIds}
                        onChange={setSelectedCommunityIds}
                        title={kindFilter === 'entities' ? 'Entidades' : kindFilter === 'communities' ? 'Comunidades' : 'Alcance'}
                        ariaLabel="Filtrar alertas por comunidad o entidad"
                    />
                )}

                <div className="filter-toolbar">
                    <button
                        id="alerts-filter-btn"
                        type="button"
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
                                type="button"
                                onClick={chip.onRemove}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}
                            >
                                <LucideIcons.X style={{ width: 11, height: 11 }} />
                            </button>
                        </span>
                    ))}

                    {(hasFilters || communityFilterActive) && (
                        <button type="button" className="filter-clear-all-btn" onClick={clearFilters}>
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
                                {hasFilters || communityFilterActive ? 'Resultados filtrados' : 'Todas las alertas'}
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
                                {hasFilters || communityFilterActive
                                    ? 'Ninguna alerta coincide con los filtros.'
                                    : 'Aún no hay alertas registradas.'}
                            </div>
                            {(hasFilters || communityFilterActive) && (
                                <button
                                    type="button"
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
                                    isActive={isActivePendingAlert(alert, latestPendingAlertId)}
                                    senderLabel={resolveSenderLabelForAlert(alert, aliasMaps)}
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
                    senderLabel={resolveSenderLabelForAlert(selectedAlert, aliasMaps)}
                />
            )}
        </>
    );
}
