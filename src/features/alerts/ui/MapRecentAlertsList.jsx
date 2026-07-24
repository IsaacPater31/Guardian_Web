import * as LucideIcons from 'lucide-react';
import { BellRing, ArrowUpRight } from 'lucide-react';
import { AlertStatus, getTimeAgo } from '@/shared/config/alertTypes';
import { getSubtypeLabel } from '@/features/alerts/utils/alertSubtype';
import { resolveAlertTypePresentation } from '@/features/alerts/utils/alertTypePresentation';

/**
 * Recent alerts list for the map filter panel (Alertas tab).
 * Presentational only — selection/focus stay in the page controller (ETC).
 * Type label/color come from alert snapshot so deleted entity types still render.
 */
export default function MapRecentAlertsList({
    alerts = [],
    activeAlertId = null,
    selectedAlertId = null,
    onSelect,
}) {
    if (alerts.length === 0) {
        return (
            <div className="map-recent-list">
                <div className="map-recent-empty">
                    <BellRing />
                    Sin alertas para mostrar.
                </div>
            </div>
        );
    }

    return (
        <div className="map-recent-list">
            {alerts.map((alert) => {
                const { label, color, icon } = resolveAlertTypePresentation(alert);
                const sub = getSubtypeLabel(
                    alert.alertType,
                    alert.subtype,
                    alert.customDetail,
                    true,
                );
                const isAttended = alert.alertStatus === AlertStatus.ATTENDED;
                const isActive = !isAttended && alert.id === activeAlertId;
                const isSelected = alert.id === selectedAlertId;
                const TypeIcon = LucideIcons[icon] || LucideIcons.AlertTriangle;

                return (
                    <button
                        key={alert.id}
                        type="button"
                        className={`map-recent-item${isActive ? ' map-recent-item--latest' : ''}${isAttended ? ' map-recent-item--attended' : ''}${isSelected ? ' map-recent-item--selected' : ''}`}
                        onClick={() => onSelect?.(alert)}
                    >
                        <span
                            className={`map-recent-item-icon${isActive ? ' is-active' : ''}${isAttended ? ' is-attended' : ''}`}
                            style={{ backgroundColor: color }}
                            aria-hidden
                        >
                            <TypeIcon />
                            {isAttended ? (
                                <span className="map-recent-item-attended-dot" />
                            ) : null}
                        </span>
                        <span className="map-recent-item-main">
                            <span className="map-recent-item-title">{label}</span>
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
    );
}
