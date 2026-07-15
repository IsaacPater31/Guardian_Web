import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, SlidersHorizontal, Circle, CheckCircle2, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { getAlertColor, getAlertLabel } from '@/shared/config/alertTypes';
import {
    STATUS_OPTIONS,
    DATE_OPTIONS,
    DEFAULT_FILTERS,
    EMPTY_FILTERS,
    resolveTypeOptions,
    countActiveFilters,
    countActiveFiltersCompat,
} from '@/shared/config/filterOptions';

export { EMPTY_FILTERS, countActiveFiltersCompat, DEFAULT_FILTERS };

/**
 * Unified alert filters UI.
 *
 * variant="drawer" — modal overlay (Alerts page); draft + Aplicar; custom dates as ISO strings.
 * variant="map"    — floating panel (Map); immediate onChange; custom dates as Date objects.
 */
export default function AlertFilters({    variant = 'drawer',
    filters,
    onChange,
    onClose,
    typeOptions = null,
    typesSectionLabel,
    totalVisible = 0,
    // Map flat-prop compat (used when filters object omitted)
    types,
    status,
    dateRange,
    customStart,
    customEnd,
}) {
    const isMap = variant === 'map';
    const resolvedLabel = typesSectionLabel
        ?? (isMap ? 'Tipo de alerta' : 'TIPO DE ALERTA');

    const sourceFilters = filters ?? {
        types: types ?? [],
        status: status ?? 'all',
        dateRange: dateRange ?? 'all',
        customStart: customStart ?? null,
        customEnd: customEnd ?? null,
    };

    if (isMap) {
        return (
            <MapVariant
                filters={sourceFilters}
                onChange={onChange}
                typeOptions={typeOptions}
                typesSectionLabel={resolvedLabel}
                totalVisible={totalVisible}
            />
        );
    }

    return (
        <DrawerVariant
            filters={sourceFilters}
            onChange={onChange}
            onClose={onClose}
            typeOptions={typeOptions}
            typesSectionLabel={resolvedLabel}
        />
    );
}

/** @deprecated Prefer default export name AlertFilters */
export { AlertFilters as AlertFilterPanel };

// ─── Drawer (Alerts page) ────────────────────────────────────────────────────

function DrawerVariant({ filters, onChange, onClose, typeOptions, typesSectionLabel }) {
    const [local, setLocal] = useState({ ...filters });
    const resolvedTypeOptions = resolveTypeOptions(typeOptions);

    useEffect(() => {
        setLocal({ ...filters });
    }, [filters]);

    const toggleType = (type) => {
        setLocal((prev) => ({
            ...prev,
            types: prev.types.includes(type)
                ? prev.types.filter((t) => t !== type)
                : [...prev.types, type],
        }));
    };

    const setStatus = (next) => setLocal((prev) => ({ ...prev, status: next }));

    const setDateRange = (next) =>
        setLocal((prev) => ({
            ...prev,
            dateRange: next,
            ...(next !== 'custom' ? { customStart: null, customEnd: null } : {}),
        }));

    const clearAll = () => setLocal({ ...DEFAULT_FILTERS });

    const apply = () => {
        onChange(local);
        onClose();
    };

    const activeCount = countActiveFiltersCompat(local);
    const hasFilters = activeCount > 0;

    return (
        <div className="filter-panel-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
                <div className="filter-panel-header">
                    <div className="filter-panel-title">
                        <div className="filter-panel-icon">
                            <LucideIcons.SlidersHorizontal style={{ width: 14, height: 14, color: 'white' }} />
                        </div>
                        <span>Filtros</span>
                        {hasFilters && (
                            <span className="filter-active-badge">{activeCount}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {hasFilters && (
                            <button className="filter-clear-btn" onClick={clearAll}>
                                Limpiar todo
                            </button>
                        )}
                        <button className="filter-close-btn" onClick={onClose}>
                            <LucideIcons.X style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                </div>

                <div className="filter-panel-divider" />

                <div className="filter-panel-body">
                    <div className="filter-section">
                        <div className="filter-section-label">
                            <LucideIcons.Tag style={{ width: 12, height: 12 }} />
                            {typesSectionLabel}
                        </div>
                        {resolvedTypeOptions.length === 0 ? (
                            <p className="admin-muted" style={{ margin: 0, fontSize: 13 }}>
                                No hay tipos configurados en tus reportes.
                            </p>
                        ) : (
                            <div className="filter-type-grid">
                                {resolvedTypeOptions.map((opt) => {
                                    const isActive = local.types.includes(opt.key);
                                    const color = opt.color || getAlertColor(opt.key);
                                    const Icon = LucideIcons[opt.icon] || LucideIcons.AlertTriangle;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            className={`filter-type-chip${isActive ? ' active' : ''}`}
                                            style={isActive
                                                ? { borderColor: color, background: `${color}18`, color }
                                                : {}}
                                            onClick={() => toggleType(opt.key)}
                                        >
                                            <span
                                                className="filter-type-chip-dot"
                                                style={{ background: color }}
                                            >
                                                <Icon style={{ width: 9, height: 9, color: 'white' }} />
                                            </span>
                                            {opt.label || getAlertLabel(opt.key)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="filter-panel-divider" />

                    <div className="filter-section">
                        <div className="filter-section-label">
                            <LucideIcons.CircleDot style={{ width: 12, height: 12 }} />
                            ESTADO DE ATENCIÓN
                        </div>
                        <div className="filter-status-pills">
                            {STATUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    className={`filter-status-pill${local.status === opt.value ? ' active' : ''}`}
                                    onClick={() => setStatus(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-panel-divider" />

                    <div className="filter-section">
                        <div className="filter-section-label">
                            <LucideIcons.Calendar style={{ width: 12, height: 12 }} />
                            PERÍODO DE TIEMPO
                        </div>
                        <div className="filter-date-chips">
                            {DATE_OPTIONS.map((opt) => {
                                const isActive = local.dateRange === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        className={`filter-date-chip${isActive ? ' active' : ''}`}
                                        onClick={() => setDateRange(opt.value)}
                                    >
                                        {opt.value === 'custom' && (
                                            <LucideIcons.CalendarRange style={{ width: 11, height: 11 }} />
                                        )}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {local.dateRange === 'custom' && (
                            <div className="filter-custom-dates">
                                <div className="filter-date-field">
                                    <label>DESDE</label>
                                    <div className="filter-date-input-wrap">
                                        <LucideIcons.Calendar style={{ width: 12, height: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                                        <input
                                            type="date"
                                            value={local.customStart || ''}
                                            max={local.customEnd || new Date().toISOString().split('T')[0]}
                                            onChange={(e) =>
                                                setLocal((p) => ({ ...p, customStart: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="filter-date-field">
                                    <label>HASTA</label>
                                    <div className="filter-date-input-wrap">
                                        <LucideIcons.Calendar style={{ width: 12, height: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                                        <input
                                            type="date"
                                            value={local.customEnd || ''}
                                            min={local.customStart || ''}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) =>
                                                setLocal((p) => ({ ...p, customEnd: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-panel-footer">
                    <button className="filter-apply-btn" onClick={apply}>
                        Aplicar filtros
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Map (floating) ──────────────────────────────────────────────────────────

function MapVariant({ filters, onChange, typeOptions, typesSectionLabel, totalVisible }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { types, status, dateRange, customStart, customEnd } = filters;
    const activeCount = countActiveFilters(types, status, dateRange);
    const resolvedTypeOptions = resolveTypeOptions(typeOptions);

    const emit = useCallback((patch) => {
        onChange({ types, status, dateRange, customStart, customEnd, ...patch });
    }, [types, status, dateRange, customStart, customEnd, onChange]);

    const toggleType = useCallback((type) => {
        const next = types.includes(type)
            ? types.filter((t) => t !== type)
            : [...types, type];
        emit({ types: next });
    }, [types, emit]);

    const handleCustomDate = (field, value) => {
        const date = value ? new Date(value) : null;
        if (field === 'start') emit({ dateRange: 'custom', customStart: date });
        else emit({ dateRange: 'custom', customEnd: date });
    };

    const clearAll = () => onChange({ ...DEFAULT_FILTERS });
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="map-filter-panel">
            <button
                type="button"
                className="map-filter-header"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                aria-controls="map-filter-body"
            >
                <div className="map-filter-header-icon">
                    <SlidersHorizontal />
                </div>
                <span className="map-filter-header-label">Filtros</span>
                {activeCount > 0 && (
                    <span className="map-filter-badge">{activeCount}</span>
                )}
                <div className={`map-filter-chevron${isExpanded ? '' : ' collapsed'}`}>
                    <LucideIcons.ChevronDown />
                </div>
            </button>

            <div
                id="map-filter-body"
                className={`map-filter-body-wrap${isExpanded ? ' expanded' : ''}`}
            >
                <div className="map-filter-body">
                    <div className="map-filter-result-row">
                        <span className="map-filter-result-label">{totalVisible} alerta{totalVisible !== 1 ? 's' : ''} visibles</span>
                        {activeCount > 0 && (
                            <button type="button" className="map-filter-clear-btn" onClick={clearAll}>
                                <X /> Limpiar
                            </button>
                        )}
                    </div>

                    <div className="map-filter-section">
                        <div className="map-filter-section-title">
                            <AlertTriangle />
                            <span>{typesSectionLabel}</span>
                        </div>
                        {resolvedTypeOptions.length === 0 ? (
                            <p className="admin-muted" style={{ margin: 0, fontSize: 12 }}>
                                No hay tipos configurados en tus reportes.
                            </p>
                        ) : (
                            <div className="map-filter-type-grid">
                                {resolvedTypeOptions.map((opt) => {
                                    const Icon = LucideIcons[opt.icon] || LucideIcons.AlertTriangle;
                                    const active = types.includes(opt.key);
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            className={`map-filter-type-chip${active ? ' active' : ''}`}
                                            style={active ? { '--chip-color': opt.color } : {}}
                                            onClick={() => toggleType(opt.key)}
                                            title={opt.label}
                                        >
                                            <span
                                                className="map-filter-type-dot"
                                                style={{ background: opt.color }}
                                            >
                                                <Icon />
                                            </span>
                                            <span className="map-filter-type-label">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="map-filter-section">
                        <div className="map-filter-section-title">
                            <Circle />
                            <span>Estado</span>
                        </div>
                        <div className="map-filter-pills">
                            {STATUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    className={`map-filter-pill${status === opt.value ? ' active' : ''}`}
                                    onClick={() => emit({ status: opt.value })}
                                >
                                    {status === opt.value && opt.value !== 'all' && <CheckCircle2 />}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="map-filter-section">
                        <div className="map-filter-section-title">
                            <CalendarDays />
                            <span>Período</span>
                        </div>
                        <div className="map-filter-date-chips">
                            {DATE_OPTIONS.filter((o) => o.value !== 'custom').map((opt) => (
                                <button
                                    key={opt.value}
                                    className={`map-filter-date-chip${dateRange === opt.value ? ' active' : ''}`}
                                    onClick={() => emit({ dateRange: opt.value })}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button
                                className={`map-filter-date-chip${dateRange === 'custom' ? ' active' : ''}`}
                                onClick={() => emit({ dateRange: 'custom' })}
                            >
                                <Clock /> Personalizado
                            </button>
                        </div>

                        {dateRange === 'custom' && (
                            <div className="map-filter-custom-dates">
                                <div className="map-filter-date-field">
                                    <label>Desde</label>
                                    <input
                                        type="date"
                                        max={today}
                                        value={customStart ? customStart.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDate('start', e.target.value)}
                                    />
                                </div>
                                <div className="map-filter-date-field">
                                    <label>Hasta</label>
                                    <input
                                        type="date"
                                        max={today}
                                        min={customStart ? customStart.toISOString().split('T')[0] : ''}
                                        value={customEnd ? customEnd.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDate('end', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
