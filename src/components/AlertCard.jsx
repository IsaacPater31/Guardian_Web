import * as LucideIcons from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../data/emergencyTypes';
import {
    MapPin,
    EyeOff,
    Eye,
    Forward,
    Flag,
} from 'lucide-react';

export default function AlertCard({ alert, onClick }) {
    const color = getAlertColor(alert.alertType);
    const iconName = getAlertIcon(alert.alertType);
    const Icon = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const label = getAlertLabel(alert.alertType);
    const timeAgo = getTimeAgo(alert.timestamp);
    const isAttended = alert.alertStatus === 'attended';

    return (
        <div className="alert-card" onClick={() => onClick?.(alert)}>
            <div
                className="alert-card-icon"
                style={{ backgroundColor: color }}
            >
                <Icon />
                {/* Indicador de atendida (punto verde) */}
                {isAttended && (
                    <span className="alert-card-attended-dot" title="Atendida" />
                )}
            </div>
            <div className="alert-card-content">
                <div className="alert-card-top">
                    <span className="alert-card-type">{label}</span>
                    <span className="alert-card-time">{timeAgo}</span>
                </div>
                {alert.description && (
                    <p className="alert-card-desc">{alert.description}</p>
                )}
                <div className="alert-card-tags">
                    {/* Badge de estado — siempre visible */}
                    {isAttended ? (
                        <span className="tag tag-attended">
                            <LucideIcons.CheckCircle2 style={{ width: 11, height: 11 }} />
                            Atendida
                        </span>
                    ) : (
                        <span className="tag tag-pending">
                            <LucideIcons.Clock style={{ width: 11, height: 11 }} />
                            No atendida
                        </span>
                    )}
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
