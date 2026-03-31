import * as LucideIcons from 'lucide-react';
import { Eye, Forward, Flag, EyeOff, User, X } from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../../data/emergencyTypes';

export default function SelectedAlertPanel({ alert, onClose, onShowDetail }) {
    const Icon = LucideIcons[getAlertIcon(alert.alertType)] || LucideIcons.AlertTriangle;

    return (
        <div className="map-alert-panel">
            <div className="map-alert-panel-header" style={{ background: getAlertColor(alert.alertType) }}>
                <div className="map-alert-panel-header-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <Icon />
                </div>
                <div className="map-alert-panel-header-info">
                    <div className="map-alert-panel-header-type">{getAlertLabel(alert.alertType)}</div>
                    <div className="map-alert-panel-header-time">{getTimeAgo(alert.timestamp)}</div>
                </div>
                <button className="map-alert-panel-close" onClick={onClose}><X /></button>
            </div>

            <div className="map-alert-panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {alert.isAnonymous ? (
                        <>
                            <EyeOff style={{ width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Reporte anónimo</span>
                        </>
                    ) : (
                        <>
                            <User style={{ width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                {alert.userName || 'Usuario desconocido'}
                            </span>
                        </>
                    )}
                </div>

                {alert.description && (
                    <p style={{ fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12, lineHeight: 1.5 }}>
                        {alert.description}
                    </p>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span className="tag tag-views"><Eye /> {alert.viewedCount} vistas</span>
                    <span className="tag tag-forwards"><Forward /> {alert.forwardsCount} reenvios</span>
                    {alert.reportsCount > 0 && (
                        <span className="tag tag-reports"><Flag /> {alert.reportsCount} reportes</span>
                    )}
                </div>

                <button onClick={onShowDetail} style={{
                    marginTop: 16, width: '100%', padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                }}>
                    Ver detalle completo
                </button>
            </div>
        </div>
    );
}
