import * as LucideIcons from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo, AlertStatus } from '../config/alertTypes';
import { MapPin, EyeOff, Eye, Forward, Flag, CheckCircle2, Clock3 } from 'lucide-react';

export default function AlertCard({ alert, onClick }) {
    const color      = getAlertColor(alert.alertType);
    const iconName   = getAlertIcon(alert.alertType);
    const Icon       = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const label      = getAlertLabel(alert.alertType);
    const timeAgo    = getTimeAgo(alert.timestamp);
    const isAttended = alert.alertStatus === AlertStatus.ATTENDED;

    // Apple semantic colors
    const statusColor = isAttended ? '#34C759' : '#FF9F0A';
    const StatusIcon  = isAttended ? CheckCircle2 : Clock3;

    return (
        <div className="alert-card" onClick={() => onClick?.(alert)}>
            {/* Icon column */}
            <div className="alert-card-icon" style={{ backgroundColor: color, position: 'relative' }}>
                <Icon />
                {/* Attended dot — subtle secondary indicator */}
                {isAttended && <span className="alert-card-attended-dot" title="Atendida" />}
            </div>

            {/* Content */}
            <div className="alert-card-content">
                <div className="alert-card-top">
                    <span className="alert-card-type">{label}</span>
                    <span className="alert-card-time">{timeAgo}</span>
                </div>

                {alert.description && (
                    <p className="alert-card-desc">{alert.description}</p>
                )}

                <div className="alert-card-tags">

                    {/* ── Status badge — always first, Apple-style pill ──────── */}
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
                    {alert.isAnonymous && (
                        <span className="tag tag-anonymous">
                            <EyeOff /> Anónimo
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
                    <span className="tag tag-type">
                        {alert.type?.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
}
