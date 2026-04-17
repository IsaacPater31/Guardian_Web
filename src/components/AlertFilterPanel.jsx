import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ACTIVE_ALERT_TYPES, getAlertColor, getAlertLabel } from '../config/alertTypes';
import { STATUS_OPTIONS, DATE_OPTIONS, DEFAULT_FILTERS, countActiveFilters } from '../config/filterOptions';

// Re-export for consumers that use EMPTY_FILTERS from this module
export { DEFAULT_FILTERS as EMPTY_FILTERS };

// Active type keys derived from config — no hardcoding
const ACTIVE_TYPE_KEYS = Object.keys(ACTIVE_ALERT_TYPES);

/** Signature-compatible wrapper so callers that pass the full filters object still work. */
export function countActiveFiltersCompat(filters) {
    return countActiveFilters(filters.types, filters.status, filters.dateRange);
}


// ─── Componente principal ────────────────────────────────────────────────────

export default function AlertFilterPanel({ filters, onChange, onClose }) {
    const [local, setLocal] = useState({ ...filters });

    const toggleType = (type) => {
        setLocal((prev) => ({
            ...prev,
            types: prev.types.includes(type)
                ? prev.types.filter((t) => t !== type)
                : [...prev.types, type],
        }));
    };

    const setStatus = (status) => setLocal((prev) => ({ ...prev, status }));

    const setDateRange = (dateRange) =>
        setLocal((prev) => ({
            ...prev,
            dateRange,
            ...(dateRange !== 'custom' ? { customStart: null, customEnd: null } : {}),
        }));

    const clearAll = () => setLocal({ ...EMPTY_FILTERS });

    const apply = () => {
        onChange(local);
        onClose();
    };

    const activeCount = countActiveFiltersCompat(local);
    const hasFilters  = activeCount > 0;

    const fmtDate = (iso) => {
        if (!iso) return 'Seleccionar';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="filter-panel-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()}>

                {/* ── Header ── */}
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

                {/* ── Scrollable content ── */}
                <div className="filter-panel-body">

                    {/* Tipos de alerta */}
                    <div className="filter-section">
                        <div className="filter-section-label">
                            <LucideIcons.Tag style={{ width: 12, height: 12 }} />
                            TIPO DE ALERTA
                        </div>
                        <div className="filter-type-grid">
                            {ACTIVE_TYPE_KEYS.map((type) => {
                                const isActive = local.types.includes(type);
                                const color    = getAlertColor(type);
                                const iconName = ACTIVE_ALERT_TYPES[type]?.icon;
                                const Icon     = LucideIcons[iconName] || LucideIcons.AlertTriangle;
                                return (
                                    <button
                                        key={type}
                                        className={`filter-type-chip${isActive ? ' active' : ''}`}
                                        style={isActive
                                            ? { borderColor: color, background: `${color}18`, color }
                                            : {}}
                                        onClick={() => toggleType(type)}
                                    >
                                        <span
                                            className="filter-type-chip-dot"
                                            style={{ background: color }}
                                        >
                                            <Icon style={{ width: 9, height: 9, color: 'white' }} />
                                        </span>
                                        {getAlertLabel(type)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="filter-panel-divider" />

                    {/* Estado de atención */}
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

                    {/* Período de tiempo */}
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

                        {/* Selectores de fecha personalizada */}
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

                {/* ── Footer — Aplicar ── */}
                <div className="filter-panel-footer">
                    <button className="filter-apply-btn" onClick={apply}>
                        Aplicar filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
