import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Eye, Forward, Flag, EyeOff, User, X, Users } from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '@/shared/config/alertTypes';
import { getCommunityNames } from '@/features/communities/repository/communityRepository';
import { updateAlertStatus } from '@/features/alerts/repository/alertRepository';
import { getSubtypeLabel } from '@/features/alerts/utils/alertSubtype';

export default function SelectedAlertPanel({ alert, onClose, onShowDetail }) {
    const [communityNames, setCommunityNames] = useState([]);
    const [localStatus, setLocalStatus] = useState(alert?.alertStatus ?? 'pending');
    const [showAttendConfirm, setShowAttendConfirm] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState('');
    const main = getAlertLabel(alert.alertType);
    const sub = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);
    const isAttended = localStatus === 'attended';

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

    useEffect(() => {
        setLocalStatus(alert?.alertStatus ?? 'pending');
        setShowAttendConfirm(false);
        setIsUpdatingStatus(false);
        setStatusFeedback('');
    }, [alert?.id, alert?.alertStatus]);

    const handleConfirmAttend = async () => {
        if (!alert?.id || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        setStatusFeedback('');
        try {
            await updateAlertStatus(alert.id, 'attended');
            setLocalStatus('attended');
            setShowAttendConfirm(false);
            setStatusFeedback('Alerta marcada como atendida.');
        } catch (error) {
            console.error('[SelectedAlertPanel] updateAlertStatus', error);
            setStatusFeedback('No se pudo actualizar el estado.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

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

                <div style={{
                    marginBottom: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${isAttended ? 'rgba(52,199,89,0.35)' : 'rgba(255,159,10,0.35)'}`,
                    background: isAttended ? 'rgba(52,199,89,0.08)' : 'rgba(255,159,10,0.08)',
                }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: isAttended ? '#1D7A3A' : '#B26A00',
                        marginBottom: 6,
                    }}>
                        Estado operativo
                    </div>
                    <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isAttended ? '#1F7A3D' : '#B26A00',
                    }}>
                        {isAttended ? 'Atendida' : 'No atendida'}
                    </div>
                </div>

                {!isAttended && (
                    <div style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(220, 38, 38, 0.22)',
                        background: 'rgba(255, 255, 255, 0.96)',
                    }}>
                        {!showAttendConfirm ? (
                            <button
                                type="button"
                                aria-label="Marcar alerta como atendida"
                                onClick={() => setShowAttendConfirm(true)}
                                disabled={isUpdatingStatus}
                                style={{
                                    width: '100%',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    border: '1px solid #DC2626',
                                    background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                                    color: '#FFFFFF',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    fontSize: 13,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 14px rgba(220,38,38,0.24)',
                                }}
                            >
                                <LucideIcons.CheckCircle2 style={{ width: 14, height: 14 }} />
                                Marcar como atendida
                            </button>
                        ) : (
                            <div style={{
                                padding: '10px',
                                borderRadius: 8,
                                border: '1px solid rgba(220,38,38,0.3)',
                                background: 'rgba(254,226,226,0.45)',
                            }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAttendConfirm(false)}
                                        disabled={isUpdatingStatus}
                                        style={{
                                            flex: 1,
                                            border: '1px solid rgba(0,0,0,0.14)',
                                            background: '#fff',
                                            color: '#4B5563',
                                            borderRadius: 8,
                                            padding: '7px 10px',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmAttend}
                                        disabled={isUpdatingStatus}
                                        style={{
                                            flex: 1,
                                            border: '1px solid rgba(22,163,74,0.55)',
                                            background: 'rgba(34,197,94,0.2)',
                                            color: '#166534',
                                            borderRadius: 8,
                                            padding: '7px 10px',
                                            fontSize: 12,
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {isUpdatingStatus ? 'Marcando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {statusFeedback && (
                    <div style={{
                        marginBottom: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusFeedback.includes('No se pudo') ? '#C62828' : '#1F7A3D',
                    }}>
                        {statusFeedback}
                    </div>
                )}

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
                            color: 'var(--color-info)',
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
                                        color: 'var(--color-info)',
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
