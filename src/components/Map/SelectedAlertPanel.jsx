import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Eye, Forward, Flag, EyeOff, User, X, Users } from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../../data/emergencyTypes';
import { getCommunityNames } from '../../services/communityService';
import { getSubtypeLabel } from '../../utils/alertSubtype';

export default function SelectedAlertPanel({ alert, onClose, onShowDetail }) {
    const [communityNames, setCommunityNames] = useState([]);
    const main = getAlertLabel(alert.alertType);
    const sub = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);

    useEffect(() => {
        let cancelled = false;
        let emptyTimeout;
        if (alert?.communityIds?.length > 0) {
            getCommunityNames(alert.communityIds).then((names) => {
                if (!cancelled) setCommunityNames(names);
            });
        } else {
            emptyTimeout = setTimeout(() => {
                if (!cancelled) setCommunityNames([]);
            }, 0);
        }
        return () => {
            cancelled = true;
            if (emptyTimeout) clearTimeout(emptyTimeout);
        };
    }, [alert?.communityIds]);

    const Icon = LucideIcons[getAlertIcon(alert.alertType)] || LucideIcons.AlertTriangle;

    return (
        <div className="map-alert-panel">
            <div className="map-alert-panel-header" style={{ background: getAlertColor(alert.alertType) }}>
                <div className="map-alert-panel-header-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <Icon />
                </div>
                <div className="map-alert-panel-header-info">
                    <div className="map-alert-panel-header-type" style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{main}</div>
                        {sub ? (
                            <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.95, marginTop: 4 }}>
                                <span style={{ opacity: 0.85 }}>→ </span>
                                {sub}
                            </div>
                        ) : null}
                    </div>
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

                {communityNames.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 8,
                            color: '#007AFF',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            <Users style={{ width: 13, height: 13 }} />
                            Comunidades ({communityNames.length})
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {communityNames.map(({ id, name }) => (
                                <span
                                    key={id}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: '#007AFF',
                                        background: 'rgba(0,122,255,0.08)',
                                        border: '1px solid rgba(0,122,255,0.25)',
                                    }}
                                >
                                    <Users style={{ width: 10, height: 10 }} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

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
