import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, User, EyeOff, Eye, Forward, Flag, MapPin, Clock, ExternalLink } from 'lucide-react';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../data/emergencyTypes';
import { getCommunityName } from '../services/communityService';

// Leaflet mini-map rendered as a plain iframe-free map inside the modal
function MiniMap({ lat, lng, color }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // If the map was already created for this container, just update the view
        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
            return;
        }

        // Use a cancelled flag to handle the async import race condition:
        // if the component unmounts before the import resolves, we skip init.
        let cancelled = false;

        import('leaflet').then((L) => {
            if (cancelled || !containerRef.current) return;

            // Guard: Leaflet sets _leaflet_id on the container after init.
            // If it's already set another instance owns this node — skip.
            if (containerRef.current._leaflet_id) return;

            const map = L.default.map(containerRef.current, {
                center: [lat, lng],
                zoom: 15,
                zoomControl: false,
                scrollWheelZoom: false,
                dragging: false,
                doubleClickZoom: false,
                attributionControl: false,
            });

            L.default.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            const icon = L.default.divIcon({
                className: '',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:${color};border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
        "></div>`,
            });

            L.default.marker([lat, lng], { icon }).addTo(map);
            mapRef.current = map;

            // Invalidate size in case the container was not visible during init
            requestAnimationFrame(() => {
                if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
            });
        });

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [lat, lng, color]);

    return (
        <div style={{ position: 'relative' }}>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                }}
            />
            {/* Open in Maps link */}
            <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(29,29,31,0.85)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    zIndex: 500,
                }}
            >
                <ExternalLink style={{ width: 10, height: 10 }} />
                Abrir mapa
            </a>
        </div>
    );
}

export default function AlertDetailModal({ alert, onClose }) {
    const [communityName, setCommunityName] = useState(null);

    useEffect(() => {
        if (alert?.communityId) {
            getCommunityName(alert.communityId).then(setCommunityName);
        }
    }, [alert?.communityId]);

    if (!alert) return null;

    const color = getAlertColor(alert.alertType);
    const iconName = getAlertIcon(alert.alertType);
    const Icon = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const label = getAlertLabel(alert.alertType);
    const timeAgo = getTimeAgo(alert.timestamp);

    const timestamp = alert.timestamp?.toDate
        ? alert.timestamp.toDate()
        : new Date(alert.timestamp);

    const hasLocation = alert.shareLocation && alert.location;
    const isAttended  = alert.alertStatus === 'attended';

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content">
                {/* ── Header ── */}
                <div className="modal-header" style={{ background: color }}>
                    <div className="modal-header-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <Icon />
                    </div>
                    <div className="modal-header-info">
                        <div className="modal-header-type">{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className="modal-header-time">{timeAgo}</div>
                            {/* Badge de estado */}
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'white',
                                    background: isAttended
                                        ? 'rgba(52, 199, 89, 0.85)'
                                        : 'rgba(255, 255, 255, 0.25)',
                                    backdropFilter: 'blur(4px)',
                                    border: isAttended
                                        ? '1px solid rgba(52,199,89,0.6)'
                                        : '1px solid rgba(255,255,255,0.3)',
                                }}
                            >
                                {isAttended
                                    ? <LucideIcons.CheckCircle2 style={{ width: 11, height: 11 }} />
                                    : <LucideIcons.Clock style={{ width: 11, height: 11 }} />
                                }
                                {isAttended ? 'Atendida' : 'No atendida'}
                            </span>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="modal-body">

                    {/* Stats Row */}
                    <div className="modal-section">
                        <div className="modal-stats">
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#007AFF' }}>{alert.viewedCount}</div>
                                <div className="modal-stat-label">Vistas</div>
                            </div>
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#6366F1' }}>{alert.forwardsCount}</div>
                                <div className="modal-stat-label">Reenvíos</div>
                            </div>
                            <div className="modal-stat">
                                <div className="modal-stat-value" style={{ color: '#FF3B30' }}>{alert.reportsCount}</div>
                                <div className="modal-stat-label">Reportes</div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Map — shown if location available */}
                    {hasLocation && (
                        <div className="modal-section">
                            <div className="modal-section-label">Ubicación</div>
                            <MiniMap
                                lat={alert.location.latitude}
                                lng={alert.location.longitude}
                                color={color}
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

                    {/* User */}
                    <div className="modal-section">
                        <div className="modal-section-label">Reportado por</div>
                        <div className="modal-section-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {alert.isAnonymous ? (
                                <>
                                    <EyeOff style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
                                    <span>Reporte anónimo</span>
                                </>
                            ) : (
                                <>
                                    <User style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
                                    <span>{alert.userName || 'Usuario desconocido'}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {alert.description && (
                        <div className="modal-section">
                            <div className="modal-section-label">Descripción</div>
                            <div className="modal-section-value">{alert.description}</div>
                        </div>
                    )}

                    {/* Community — name instead of ID */}
                    {alert.communityId && (
                        <div className="modal-section">
                            <div className="modal-section-label">Comunidad</div>
                            <div className="modal-section-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LucideIcons.Users style={{ width: 16, height: 16, color: 'var(--color-accent)' }} />
                                <span>{communityName ?? '…'}</span>
                            </div>
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="modal-section">
                        <div className="modal-section-label">Fecha y hora</div>
                        <div className="modal-section-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
                            <span>
                                {timestamp.toLocaleDateString('es-CO', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                })}{' — '}
                                {timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    {/* Alert Type */}
                    <div className="modal-section">
                        <div className="modal-section-label">Tipo</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="tag" style={{
                                background: `${color}15`, color, padding: '4px 12px', fontSize: '13px',
                            }}>
                                {alert.alertType}
                            </span>
                            <span className="tag tag-type" style={{ padding: '4px 12px', fontSize: '13px' }}>
                                {alert.type?.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Images */}
                    {alert.imageBase64 && alert.imageBase64.length > 0 && (
                        <div className="modal-section">
                            <div className="modal-section-label">Imágenes adjuntas</div>
                            <div className="modal-images">
                                {alert.imageBase64.map((img, idx) => (
                                    <div className="modal-image" key={idx}>
                                        <img src={`data:image/jpeg;base64,${img}`} alt={`Imagen ${idx + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
