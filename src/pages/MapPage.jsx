import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { subscribeToMapAlerts } from '../services/alertService';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/mapUtils';
import DynamicMarkers from '../components/Map/DynamicMarkers';
import { UserLocationMarker, LocateMeButton, AutoCenterOnUser } from '../components/Map/UserLocation';
import MapLegend from '../components/MapLegend';
import AlertDetailModal from '../components/AlertDetailModal';
import useUserGeolocation from '../hooks/useUserGeolocation';
import SelectedAlertPanel from '../components/Map/SelectedAlertPanel';
import MapAlertCountBadge from '../components/Map/MapAlertCountBadge';
import RequestLocationOnFirstInteraction from '../components/Map/RequestLocationOnFirstInteraction';

// ─── MapPage ──────────────────────────────────────────────────────────────────
export default function MapPage() {
    const [alerts, setAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const { position: userPosition, error: geoError, request: requestLocation } = useUserGeolocation();

    useEffect(() => {
        return subscribeToMapAlerts((data) => {
            setAlerts(data);
            setAlertsLoading(false);
        });
    }, []);

    return (
        <div className="map-page">
            <div className="map-container">
                <MapContainer
                    center={userPosition || DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* User's GPS position — blue pulsing dot */}
                    <RequestLocationOnFirstInteraction
                        enabled={!userPosition}
                        onRequest={requestLocation}
                    />
                    <AutoCenterOnUser position={userPosition} />
                    <UserLocationMarker position={userPosition} />

                    {/* Locate-me button — bottom right */}
                    <LocateMeButton
                        userPosition={userPosition}
                        onLocate={requestLocation}
                    />

                    {/* Alert markers with spiral de-overlap */}
                    <DynamicMarkers alerts={alerts} onMarkerClick={setSelectedAlert} />
                </MapContainer>

                {/* Alert count badge */}
                <MapLegend />
                {!alertsLoading && <MapAlertCountBadge count={alerts.length} />}
                {alertsLoading && (
                    <div className="map-loading-overlay">
                        <div className="loading-spinner" />
                    </div>
                )}

                {/* Discreet location error hint (Apple-like, non-invasive) */}
                {geoError && (
                    <div className="map-geo-hint">
                        <div className="map-geo-hint-title">Ubicación desactivada</div>
                        <div className="map-geo-hint-desc">
                            Activa los permisos de ubicación para este navegador si deseas centrar el mapa en tu posición.
                        </div>
                    </div>
                )}

                {/* If location is blocked, user can use the locate button. */}

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
