import * as LucideIcons from 'lucide-react';
import {
    getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo, AlertStatus,
} from '@/shared/config/alertTypes';
import { MapPin, EyeOff, Eye, Forward, Flag, CheckCircle2, Clock3 } from 'lucide-react';
import { getSubtypeLabel } from '@/features/alerts/utils/alertSubtype';

export default function AlertCard({
    alert,
    onClick,
    isActive = false,
}) {
    const color      = getAlertColor(alert.alertType, alert);
    const iconName   = getAlertIcon(alert.alertType, alert);
    const Icon       = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const main       = getAlertLabel(alert.alertType, alert);
    const sub        = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);
    const timeAgo    = getTimeAgo(alert.timestamp);
    const isAttended = alert.alertStatus === AlertStatus.ATTENDED;
    const identifiedLabel = (alert.userName || alert.userEmail || '').trim() || 'Usuario identificado';

    /* AA-safe hexes (also used as `${statusColor}14` alpha backgrounds). */
    const statusColor = isAttended ? '#2E7D32' : '#B45309';
    const StatusIcon  = isAttended ? CheckCircle2 : Clock3;

    return (
        <div
            className={`alert-card${isActive ? ' alert-card--latest' : ''}${isAttended ? ' alert-card--attended' : ''}`}
            onClick={() => onClick?.(alert)}
        >
            <div className="alert-card-icon" style={{ backgroundColor: color, position: 'relative' }}>
                <Icon />
                {isAttended && <span className="alert-card-attended-dot" title="Atendida" />}
            </div>

            <div className="alert-card-content">
                <div className="alert-card-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="alert-card-type" style={{ lineHeight: 1.25 }}>{main}</div>
                        {sub ? (
                            <div style={{
                                fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4,
                                letterSpacing: '-0.01em',
                            }}>
                                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700 }}>→ </span>
                                {sub}
                            </div>
                        ) : null}
                    </div>
                    <div className="alert-card-time-wrap">
                        <span className="alert-card-time">{timeAgo}</span>
                    </div>
                </div>

                {alert.description && (
                    <p className="alert-card-desc">{alert.description}</p>
                )}

                <div className="alert-card-tags">
                    <span style={{
                        display:     'inline-flex',
                        alignItems:  'center',
                        gap:         4,
                        padding:     '3px 9px',
                        borderRadius:'20px',
                        fontSize:    '11px',
                        fontWeight:  700,
                        color:       statusColor,
                        background:  `${statusColor}14`,
                        border:      `1.5px solid ${statusColor}44`,
                        letterSpacing: '0.02em',
                        flexShrink:  0,
                    }}>
                        <StatusIcon style={{ width: 10, height: 10 }} />
                        {isAttended ? 'Atendida' : 'No atendida'}
                    </span>

                    {alert.shareLocation && alert.location && (
                        <span className="tag tag-location">
                            <MapPin /> Ubicación
                        </span>
                    )}
                    {alert.isAnonymous ? (
                        <span className="tag tag-anonymous">
                            <EyeOff /> Anónima
                        </span>
                    ) : (
                        <span className="tag" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(52,199,89,0.12)', color: '#1a7f37',
                            border: '1px solid rgba(52,199,89,0.35)',
                        }}>
                            <Eye style={{ width: 10, height: 10 }} />
                            {identifiedLabel}
                        </span>
                    )}
                    {alert.viewedCount > 0 && (
                        <span className="tag tag-views">
                            <Eye /> {alert.viewedCount}
                        </span>
                    )}
                    {alert.forwardsCount > 0 && (
                        <span className="tag tag-forwards">
                            <Forward /> {alert.forwardsCount}
                        </span>
                    )}
                    {alert.reportsCount > 0 && (
                        <span className="tag tag-reports">
                            <Flag /> {alert.reportsCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
