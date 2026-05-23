import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, MapPin, Clock, ExternalLink, CheckCircle2, Clock3, Users } from 'lucide-react';
import {
    getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo, AlertStatus,
} from '../config/alertTypes';
import { getCommunityNames } from '../services/communityService';
import { getSubtypeLabel } from '../utils/alertSubtype';

/** Detalle de alerta en español (producto). */
const es = (copy) => copy;

// ─── Leaflet mini-map ─────────────────────────────────────────────────────────
function MiniMap({ lat, lng, color, openMapLabel }) {
    const containerRef = useRef(null);
    const mapRef       = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
            return;
        }

        let cancelled = false;

        import('leaflet').then((L) => {
            if (cancelled || !containerRef.current) return;
            if (containerRef.current._leaflet_id) return;

            const map = L.default.map(containerRef.current, {
                center: [lat, lng], zoom: 15,
                zoomControl: false, scrollWheelZoom: false,
                dragging: false, doubleClickZoom: false, attributionControl: false,
            });

            L.default.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            const icon = L.default.divIcon({
                className: '',
                iconSize:  [28, 28],
                iconAnchor:[14, 14],
                html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);"></div>`,
            });

            L.default.marker([lat, lng], { icon }).addTo(map);
            mapRef.current = map;

            requestAnimationFrame(() => {
                if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
            });
        });

        return () => {
            cancelled = true;
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    }, [lat, lng, color]);

    return (
        <div style={{ position: 'relative' }}>
            <div
                ref={containerRef}
                style={{
                    width: '100%', height: 160,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                }}
            />
            <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
                target="_blank" rel="noopener noreferrer"
                style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(29,29,31,0.82)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4, zIndex: 500,
                }}
            >
                <ExternalLink style={{ width: 10, height: 10 }} />
                {openMapLabel}
            </a>
        </div>
    );
}

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

    if (!alert) return null;

    const color     = getAlertColor(alert.alertType);
    const iconName  = getAlertIcon(alert.alertType);
    const Icon      = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const mainLabel = getAlertLabel(alert.alertType);
    const subLabel  = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);
    const timeAgo   = getTimeAgo(alert.timestamp);
    const isAttended= alert.alertStatus === AlertStatus.ATTENDED;
    const reporterName = alert.isAnonymous
        ? es('Anónimo')
        : (alert.userName || '').trim() || es('Usuario desconocido');
    const headline = subLabel ? `${mainLabel} → ${subLabel}` : mainLabel;

    const timestamp = alert.timestamp?.toDate
        ? alert.timestamp.toDate()
        : new Date(alert.timestamp);

    const hasLocation = alert.shareLocation && alert.location;
    const dateLocale = 'es-CO';

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

                    {/* Mini Map */}
                    {hasLocation && (
                        <div className="modal-section">
                            <div className="modal-section-label">{es('Ubicación')}</div>
                            <MiniMap
                                lat={alert.location.latitude}
                                lng={alert.location.longitude}
                                color={color}
                                openMapLabel={es('Abrir mapa')}
                            />
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginTop: 8, fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)',
                            }}>
                                <MapPin style={{ width: 12, height: 12, color: '#34C759' }} />
                                {alert.location.latitude?.toFixed(6)}, {alert.location.longitude?.toFixed(6)}
                            </div>
                        </div>
                    )}

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
