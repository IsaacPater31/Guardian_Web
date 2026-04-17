import { useState, useEffect, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, SlidersHorizontal, Circle, CheckCircle2, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { ACTIVE_ALERT_TYPES } from '../../config/alertTypes';
import { STATUS_OPTIONS, DATE_OPTIONS, countActiveFilters } from '../../config/filterOptions';

/**
 * MapFilterPanel — floating collapsible filter panel for the map.
 *
 * @param {{
 *   types: string[],
 *   status: string,
 *   dateRange: string,
 *   customStart: Date|null,
 *   customEnd: Date|null,
 *   onChange: (filters) => void,
 *   totalVisible: number,
 * }} props
 */
export default function MapFilterPanel({
    types = [],
    status = 'all',
    dateRange = 'all',
    customStart = null,
    customEnd = null,
    onChange,
    totalVisible = 0,
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const activeCount = countActiveFilters(types, status, dateRange);

    const toggleType = useCallback((type) => {
        const next = types.includes(type)
            ? types.filter((t) => t !== type)
            : [...types, type];
        onChange({ types: next, status, dateRange, customStart, customEnd });
    }, [types, status, dateRange, customStart, customEnd, onChange]);

    const setStatus = (s) => onChange({ types, status: s, dateRange, customStart, customEnd });
    const setDateRange = (d) => onChange({ types, status, dateRange: d, customStart, customEnd });

    const handleCustomDate = (field, value) => {
        const date = value ? new Date(value) : null;
        if (field === 'start') onChange({ types, status, dateRange: 'custom', customStart: date, customEnd });
        else onChange({ types, status, dateRange: 'custom', customStart, customEnd: date });
    };

    const clearAll = () => onChange({ types: [], status: 'all', dateRange: 'all', customStart: null, customEnd: null });

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="map-filter-panel">
            {/* ── Header ── */}
            <button
                className="map-filter-header"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
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

            {/* ── Body ── */}
            <div className={`map-filter-body${isExpanded ? '' : ' hidden'}`}>

                {/* Result count */}
                <div className="map-filter-result-row">
                    <span className="map-filter-result-label">{totalVisible} alerta{totalVisible !== 1 ? 's' : ''} visibles</span>
                    {activeCount > 0 && (
                        <button className="map-filter-clear-btn" onClick={clearAll}>
                            <X /> Limpiar
                        </button>
                    )}
                </div>

                {/* ── Tipo de alerta ── */}
                <div className="map-filter-section">
                    <div className="map-filter-section-title">
                        <AlertTriangle />
                        <span>Tipo de alerta</span>
                    </div>
                    <div className="map-filter-type-grid">
                        {Object.entries(ACTIVE_ALERT_TYPES).map(([key, cfg]) => {
                            const Icon   = LucideIcons[cfg.icon] || LucideIcons.AlertTriangle;
                            const active = types.includes(key);
                            return (
                                <button
                                    key={key}
                                    className={`map-filter-type-chip${active ? ' active' : ''}`}
                                    style={active ? { '--chip-color': cfg.color } : {}}
                                    onClick={() => toggleType(key)}
                                    title={cfg.labelEs}
                                >
                                    <span
                                        className="map-filter-type-dot"
                                        style={{ background: cfg.color }}
                                    >
                                        <Icon />
                                    </span>
                                    <span className="map-filter-type-label">{cfg.labelEs}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Estado ── */}
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
                                onClick={() => setStatus(opt.value)}
                            >
                                {status === opt.value && opt.value !== 'all' && <CheckCircle2 />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Fecha ── */}
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
                                onClick={() => setDateRange(opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            className={`map-filter-date-chip${dateRange === 'custom' ? ' active' : ''}`}
                            onClick={() => setDateRange('custom')}
                        >
                            <Clock /> Personalizado
                        </button>
                    </div>

                    {/* Custom date inputs */}
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
    );
}
