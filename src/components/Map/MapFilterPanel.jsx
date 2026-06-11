import { useState, useCallback, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    X, SlidersHorizontal, Circle, CheckCircle2, Clock, CalendarDays, AlertTriangle, BellRing, ArrowUpRight,
} from 'lucide-react';
import {
    ACTIVE_ALERT_TYPES,
    AlertStatus,
    getAlertColor,
    getAlertIcon,
    getAlertLabel,
    getTimeAgo,
} from '../../config/alertTypes';
import { STATUS_OPTIONS, DATE_OPTIONS, countActiveFilters } from '../../config/filterOptions';
import { getSubtypeLabel } from '../../utils/alertSubtype';

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
 *   listAlerts?: Array,
 *   activeAlertId?: string|null,
 *   pulseAlertId?: string|null,
 *   onRecentAlertSelect?: (alert) => void,
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
    listAlerts = [],
    activeAlertId = null,
    pulseAlertId = null,
    selectedAlertId = null,
    onRecentAlertSelect,
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeView, setActiveView] = useState('recent');
    const lastPulseIdRef = useRef(null);

    useEffect(() => {
        if (!pulseAlertId || pulseAlertId === lastPulseIdRef.current) return;
        lastPulseIdRef.current = pulseAlertId;
        setActiveView('recent');
        setIsExpanded(true);
    }, [pulseAlertId]);
    const activeCount = countActiveFilters(types, status, dateRange);
    // All alerts (attended + pending); only activeAlertId (latest pending) is highlighted.

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
                    {activeView === 'filters' ? <SlidersHorizontal /> : <BellRing />}
                </div>
                <span className="map-filter-header-label">
                    {activeView === 'filters' ? 'Filtros' : 'Alertas'}
                </span>
                {activeView === 'filters' && activeCount > 0 && (
                    <span className="map-filter-badge">{activeCount}</span>
                )}
                {activeView === 'recent' && listAlerts.length > 0 && (
                    <span className="map-filter-badge">{listAlerts.length}</span>
                )}
                <div className={`map-filter-chevron${isExpanded ? '' : ' collapsed'}`}>
                    <LucideIcons.ChevronDown />
                </div>
            </button>

            {/* ── Body ── */}
            <div className={`map-filter-body-wrap${isExpanded ? ' expanded' : ''}`}>
                <div className="map-filter-body">
                    <div className="map-filter-view-toggle">
                    <button
                        className={`map-filter-view-btn${activeView === 'filters' ? ' active' : ''}`}
                        onClick={() => setActiveView('filters')}
                    >
                        <SlidersHorizontal />
                        Filtros
                    </button>
                    <button
                        className={`map-filter-view-btn${activeView === 'recent' ? ' active' : ''}`}
                        onClick={() => setActiveView('recent')}
                    >
                        <BellRing />
                        Alertas
                    </button>
                </div>

                    {activeView === 'filters' ? (
                        <>
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
                        </>
                    ) : (
                        <div className="map-recent-list">
                        {listAlerts.length === 0 && (
                            <div className="map-recent-empty">
                                <BellRing />
                                Sin alertas para mostrar.
                            </div>
                        )}
                        {listAlerts.map((alert) => {
                            const sub = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);
                            const isAttended = alert.alertStatus === AlertStatus.ATTENDED;
                            const isActive = !isAttended && alert.id === activeAlertId;
                            const isSelected = alert.id === selectedAlertId;
                            const iconName = getAlertIcon(alert.alertType);
                            const TypeIcon = LucideIcons[iconName] || LucideIcons.AlertTriangle;
                            const typeColor = getAlertColor(alert.alertType);
                            return (
                                <button
                                    key={alert.id}
                                    className={`map-recent-item${isActive ? ' map-recent-item--latest' : ''}${isAttended ? ' map-recent-item--attended' : ''}${isSelected ? ' map-recent-item--selected' : ''}`}
                                    onClick={() => onRecentAlertSelect?.(alert)}
                                >
                                    <span
                                        className={`map-recent-item-icon${isActive ? ' is-active' : ''}${isAttended ? ' is-attended' : ''}`}
                                        style={{ backgroundColor: typeColor }}
                                        aria-hidden
                                    >
                                        <TypeIcon />
                                        {isAttended ? (
                                            <span className="map-recent-item-attended-dot" />
                                        ) : null}
                                    </span>
                                    <span className="map-recent-item-main">
                                        <span className="map-recent-item-title">
                                            {getAlertLabel(alert.alertType)}
                                        </span>
                                        {sub ? (
                                            <span className="map-recent-item-sub">{sub}</span>
                                        ) : null}
                                    </span>
                                    <span className="map-recent-item-meta">
                                        <span className={isActive ? 'map-recent-item-time--active' : undefined}>
                                            {getTimeAgo(alert.timestamp)}
                                        </span>
                                        <ArrowUpRight />
                                    </span>
                                </button>
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
