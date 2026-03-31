import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import * as LucideIcons from 'lucide-react';
import { subscribeToMapAlerts } from '../services/alertService';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../data/emergencyTypes';
import { computeSmartCenter, DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/mapUtils';
import DynamicMarkers from '../components/Map/DynamicMarkers';
import SmartCenter from '../components/Map/SmartCenter';
import { UserLocationMarker, LocateMeButton } from '../components/Map/UserLocation';
import MapLegend from '../components/MapLegend';
import AlertDetailModal from '../components/AlertDetailModal';
import { Eye, Forward, Flag, MapPin, EyeOff, User, X } from 'lucide-react';

// ─── Geolocation hook ─────────────────────────────────────────────────────────
function useGeolocation() {
    const [position, setPosition] = useState(null);
    const [error, setError] = useState(null);

    function request() {
        if (!navigator.geolocation) {
            setError('Geolocalización no soportada');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
            (err) => setError(err.message),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    useEffect(() => { request(); }, []);

    return { position, error, request };
}

// ─── MapPage ──────────────────────────────────────────────────────────────────
export default function MapPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [smartCenter, setSmartCenter] = useState(null);
    const { position: userPosition, request: requestLocation } = useGeolocation();

    useEffect(() => {
        return subscribeToMapAlerts((data) => {
            setAlerts(data);
            setLoading(false);
            if (data.length > 0) setSmartCenter(computeSmartCenter(data));
        });
    }, []);

    // Prefer user position; fall back to smart center
    const initialCenter = userPosition || smartCenter;

    return (
        <div className="map-page">
            <div className="map-container">
                {loading ? (
                    <div className="loading-container" style={{ height: '100%' }}>
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Auto-fly to user location or smart center once on load */}
                        {initialCenter && <SmartCenter center={initialCenter} />}

                        {/* User's GPS position — blue pulsing dot */}
                        <UserLocationMarker position={userPosition} />

                        {/* Locate-me button — bottom right */}
                        <LocateMeButton
                            userPosition={userPosition}
                            onLocate={requestLocation}
                        />

                        {/* Alert markers with spiral de-overlap */}
                        <DynamicMarkers alerts={alerts} onMarkerClick={setSelectedAlert} />
                    </MapContainer>
                )}

                {/* Alert count badge */}
                <MapLegend />
                {!loading && (
                    <div style={{
                        position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)',
                        zIndex: 400, display: 'flex', alignItems: 'center', gap: 8,
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            background: 'rgba(13,27,62,0.88)', backdropFilter: 'blur(12px)',
                            color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-sm)', fontWeight: 600,
                            boxShadow: 'var(--shadow-md)',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <MapPin style={{ width: 14, height: 14 }} />
                            {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} en el mapa
                        </div>
                    </div>
                )}

                {/* Selected alert side panel */}
                {selectedAlert && (
                    <SelectedAlertPanel
                        alert={selectedAlert}
                        onClose={() => setSelectedAlert(null)}
                        onShowDetail={() => setShowModal(true)}
                    />
                )}
            </div>

            {showModal && selectedAlert && (
                <AlertDetailModal alert={selectedAlert} onClose={() => setShowModal(false)} />
            )}
        </div>
    );
}

// ─── Selected Alert Panel (sub-component, local only) ─────────────────────────
function SelectedAlertPanel({ alert, onClose, onShowDetail }) {
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
                    <span className="tag tag-forwards"><Forward /> {alert.forwardsCount} reenvíos</span>
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
