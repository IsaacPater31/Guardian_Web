import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, Clock, CheckCircle2, Clock3, Users } from 'lucide-react';
import {
    getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo, AlertStatus,
} from '@/shared/config/alertTypes';
import { getCommunityNames } from '@/features/communities/repository/communityRepository';
import { updateAlertStatus } from '@/features/alerts/repository/alertRepository';
import { getSubtypeLabel } from '@/features/alerts/utils/alertSubtype';

/** Detalle de alerta en español (producto). */
const es = (copy) => copy;

// ─── Info row — reutilizable ──────────────────────────────────────────────────
function InfoRow({ icon, iconColor = 'var(--color-text-tertiary)', label, children, accent }) {
    const IconComponent = icon;
    return (
        <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '12px 14px',
            background: accent ? `${accent}08` : 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${accent ? `${accent}20` : 'var(--color-border)'}`,
        }}>
            <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: accent ? `${accent}15` : 'var(--color-bg)',
                border: `1px solid ${accent ? `${accent}25` : 'var(--color-border)'}`,
            }}>
                <IconComponent style={{ width: 14, height: 14, color: accent || iconColor }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em',
                    color: accent ? `${accent}AA` : 'var(--color-text-tertiary)',
                    marginBottom: 3, textTransform: 'uppercase',
                }}>
                    {label}
                </div>
                <div style={{
                    fontSize: 'var(--font-size-sm)', fontWeight: 500,
                    color: accent || 'var(--color-text-primary)',
                    lineHeight: 1.4,
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function AlertDetailModal({ alert, onClose }) {
    const [communityNames, setCommunityNames] = useState([]);
    const [localStatus, setLocalStatus] = useState(alert?.alertStatus ?? AlertStatus.PENDING);
    const [showAttendConfirm, setShowAttendConfirm] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState('');

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
        setLocalStatus(alert?.alertStatus ?? AlertStatus.PENDING);
        setShowAttendConfirm(false);
        setIsUpdatingStatus(false);
        setStatusFeedback('');
    }, [alert?.id, alert?.alertStatus]);

    if (!alert) return null;

    const color     = getAlertColor(alert.alertType, alert);
    const iconName  = getAlertIcon(alert.alertType, alert);
    const Icon      = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const mainLabel = getAlertLabel(alert.alertType, alert);
    const subLabel  = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);
    const timeAgo   = getTimeAgo(alert.timestamp);
    const isAttended= localStatus === AlertStatus.ATTENDED;
    const reporterName = alert.isAnonymous
        ? es('Anónimo')
        : (alert.userName || '').trim() || es('Usuario desconocido');
    const headline = subLabel ? `${mainLabel} → ${subLabel}` : mainLabel;

    const timestamp = alert.timestamp?.toDate
        ? alert.timestamp.toDate()
        : new Date(alert.timestamp);

    const dateLocale = 'es-CO';

    const handleConfirmAttend = async () => {
        if (!alert?.id || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        setStatusFeedback('');
        try {
            await updateAlertStatus(alert.id, AlertStatus.ATTENDED);
            setLocalStatus(AlertStatus.ATTENDED);
            setShowAttendConfirm(false);
            setStatusFeedback(es('Alerta marcada como atendida.'));
        } catch (error) {
            console.error('[AlertDetailModal] updateAlertStatus', error);
            setStatusFeedback(es('No se pudo actualizar el estado. Intenta nuevamente.'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content">

                {/* ── Header ── */}
                <div className="modal-header" style={{ background: color }}>
                    <div className="modal-header-icon" style={{ background: 'rgba(255,255,255,0.22)' }}>
                        <Icon />
                    </div>
                    <div className="modal-header-info">
                        <div className="modal-header-type" style={{ lineHeight: 1.22 }}>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>{reporterName}</div>
                            <div style={{
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                marginTop: 6,
                                color: 'rgba(255,255,255,0.94)',
                                letterSpacing: '0.01em',
                            }}>
                                {headline}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                            <span className="modal-header-time">{timeAgo}</span>
                            <span style={{
                                display:     'inline-flex',
                                alignItems:  'center',
                                gap:         4,
                                padding:     '3px 10px',
                                borderRadius:'20px',
                                fontSize:    '11px',
                                fontWeight:  700,
                                color:       'white',
                                background:  isAttended
                                    ? 'rgba(52,199,89,0.35)'
                                    : 'rgba(255,255,255,0.18)',
                                border:      `1.5px solid ${isAttended ? 'rgba(52,199,89,0.6)' : 'rgba(255,255,255,0.35)'}`,
                            }}>
                                {isAttended
                                    ? <CheckCircle2 style={{ width: 11, height: 11 }} />
                                    : <Clock3       style={{ width: 11, height: 11 }} />
                                }
                                {isAttended ? es('Atendida') : es('No atendida')}
                            </span>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}><X /></button>
                </div>

                {/* ── Body ── */}
                <div className="modal-body">

                    {/* Status card — Apple-style prominent info card */}
                    <div className="modal-section">
                        <div style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          14,
                            padding:      '14px 16px',
                            borderRadius: 'var(--radius-lg)',
                            background:   isAttended ? '#34C75910' : '#FF9F0A10',
                            border:       `1.5px solid ${isAttended ? '#34C75930' : '#FF9F0A30'}`,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                background: isAttended ? '#34C75920' : '#FF9F0A20',
                            }}>
                                {isAttended
                                    ? <LucideIcons.CheckCircle2 style={{ width: 20, height: 20, color: '#34C759' }} />
                                    : <LucideIcons.ClockAlert   style={{ width: 20, height: 20, color: '#FF9F0A' }} />
                                }
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                                    color: isAttended ? '#34C759AA' : '#FF9F0AAA',
                                    textTransform: 'uppercase', marginBottom: 3,
                                }}>
                                    {es('Estado de la alerta')}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: isAttended ? '#34C759' : '#FF9F0A' }}>
                                    {isAttended ? es('Atendida') : es('No atendida')}
                                </div>
                                <div style={{
                                    fontSize: '12px', color: isAttended ? '#34C759AA' : '#FF9F0AAA',
                                    marginTop: 2, lineHeight: 1.3,
                                }}>
                                    {isAttended
                                        ? es('Esta alerta fue marcada como atendida.')
                                        : es('Esta alerta está pendiente de atención.')}
                                </div>
                                {!isAttended && (
                                    <div style={{ marginTop: 10 }}>
                                        {!showAttendConfirm ? (
                                            <div style={{
                                                marginTop: 2,
                                                paddingTop: 10,
                                                borderTop: '1px solid rgba(255,159,10,0.26)',
                                            }}>
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
                                                    {es('Marcar como atendida')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{
                                                marginTop: 2,
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
                                                        {es('Cancelar')}
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
                                                        {isUpdatingStatus ? es('Marcando...') : es('Confirmar')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {statusFeedback && (
                                    <div style={{
                                        marginTop: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: statusFeedback.includes('No se pudo') ? '#C62828' : '#1F7A3D',
                                    }}>
                                        {statusFeedback}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Comunidades */}
                    {communityNames.length > 0 && (
                        <div className="modal-section">
                            <div style={{
                                display:      'flex',
                                alignItems:   'center',
                                gap:          10,
                                marginBottom: 10,
                            }}>
                                <span style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                    background: '#007AFF18', border: '1px solid #007AFF25',
                                }}>
                                    <Users style={{ width: 14, height: 14, color: '#007AFF' }} />
                                </span>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', color: '#007AFFAA', textTransform: 'uppercase' }}>
                                        {es('Comunidades')}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#007AFF' }}>
                                        {communityNames.length}{' '}
                                        {communityNames.length === 1 ? es('comunidad') : es('comunidades')}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {communityNames.map(({ id, name }) => (
                                    <span key={id} style={{
                                        display:     'inline-flex',
                                        alignItems:  'center',
                                        gap:         5,
                                        padding:     '5px 12px',
                                        borderRadius:'20px',
                                        fontSize:    '12px',
                                        fontWeight:  600,
                                        color:       '#007AFF',
                                        background:  '#007AFF12',
                                        border:      '1.5px solid #007AFF33',
                                    }}>
                                        <Users style={{ width: 11, height: 11 }} />
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fecha y hora */}
                    <div className="modal-section">
                        <InfoRow icon={Clock} label={es('Fecha y hora')}>
                            {timestamp.toLocaleDateString(dateLocale, {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                            {' — '}
                            {timestamp.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </InfoRow>
                    </div>

                    {/* Mensaje */}
                    {alert.description ? (
                        <div className="modal-section">
                            <InfoRow icon={LucideIcons.MessageSquareText} label={es('Mensaje')}>
                                {alert.description}
                            </InfoRow>
                        </div>
                    ) : null}

                    {/* Stats Row */}
                    <div className="modal-section">
                        <div className="modal-stats">
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#007AFF' }}>{alert.viewedCount}</div>
                                <div className="modal-stat-label">{es('Vistas')}</div>
                            </div>
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#6366F1' }}>{alert.forwardsCount}</div>
                                <div className="modal-stat-label">{es('Reenvíos')}</div>
                            </div>
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#FF3B30' }}>{alert.reportsCount}</div>
                                <div className="modal-stat-label">{es('Reportes')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Imágenes */}
                    {alert.imageBase64 && alert.imageBase64.length > 0 && (
                        <div className="modal-section">
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--color-text-tertiary)',
                                textTransform: 'uppercase',
                                marginBottom: 10,
                            }}>
                                {es('Imágenes')}
                            </div>
                            <div style={{
                                display: 'grid',
                                gap: 10,
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            }}>
                                {alert.imageBase64.map((img, idx) => (
                                    <a
                                        key={`img-${idx}`}
                                        href={`data:image/jpeg;base64,${img}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-bg-secondary)',
                                            aspectRatio: '1 / 1',
                                        }}
                                    >
                                        <img
                                            src={`data:image/jpeg;base64,${img}`}
                                            alt={`${es('Adjunto')} ${idx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audio */}
                    {alert.audioBase64 && (
                        <div className="modal-section">
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--color-text-tertiary)',
                                textTransform: 'uppercase',
                                marginBottom: 10,
                            }}>
                                {es('Audio')}
                            </div>
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                            }}>
                                <audio
                                    controls
                                    preload="none"
                                    style={{ width: '100%' }}
                                    src={`data:audio/mp4;base64,${alert.audioBase64}`}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
