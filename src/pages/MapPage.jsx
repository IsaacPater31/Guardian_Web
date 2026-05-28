import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { subscribeToMapAlertsFiltered } from '../services/alertService';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/mapUtils';
import DynamicMarkers from '../components/Map/DynamicMarkers';
import { UserLocationMarker, LocateMeButton, AutoCenterOnUser } from '../components/Map/UserLocation';
import AlertDetailModal from '../components/AlertDetailModal';
import useUserGeolocation from '../hooks/useUserGeolocation';
import SelectedAlertPanel from '../components/Map/SelectedAlertPanel';
import MapAlertCountBadge from '../components/Map/MapAlertCountBadge';
import RequestLocationOnFirstInteraction from '../components/Map/RequestLocationOnFirstInteraction';
import MapFilterPanel from '../components/Map/MapFilterPanel';
import { DEFAULT_FILTERS } from '../config/filterOptions';

function MapFocusController({ focusAlert }) {
    const map = useMap();
    const lastFocusKeyRef = useRef(null);

    useEffect(() => {
        if (!focusAlert?.id || !focusAlert?.location) return;
        const focusKey = `${focusAlert.id}-${focusAlert.__focusKey ?? 'default'}`;
        if (lastFocusKeyRef.current === focusKey) return;

        const lat = Number(focusAlert.location.latitude);
        const lng = Number(focusAlert.location.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        lastFocusKeyRef.current = focusKey;
        const nextZoom = Math.max(map.getZoom(), 15);
        map.flyTo([lat, lng], nextZoom, {
            animate: true,
            duration: 0.75,
            easeLinearity: 0.22,
        });
    }, [focusAlert, map]);

    return null;
}


// ─── MapPage ──────────────────────────────────────────────────────────────────
export default function MapPage() {
    const [alerts, setAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [latestContextAlertId, setLatestContextAlertId] = useState(null);
    const [timedPriorityAlertId, setTimedPriorityAlertId] = useState(null);
    const [focusedAlert, setFocusedAlert] = useState(null);
    const { position: userPosition, error: geoError, request: requestLocation } = useUserGeolocation();

    // Keep a ref to the current unsubscribe fn so we can cancel it when filters change
    const unsubRef = useRef(null);

    // Re-subscribe every time filters change
    useEffect(() => {
        // Cancel previous subscription
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- map subscription loading gate
        setAlertsLoading(true);

        const unsub = subscribeToMapAlertsFiltered(filters, (data, meta = {}) => {
            setAlerts(data);
            setAlertsLoading(false);
            const fallbackLatestId = meta.latestContextAlertId ?? data[0]?.id ?? null;
            setLatestContextAlertId(fallbackLatestId);

            const changedIds = Array.isArray(meta.changedIds) ? meta.changedIds : [];
            const newestChangedId = data.find((a) => changedIds.includes(a.id))?.id ?? null;

            if (newestChangedId) {
                setTimedPriorityAlertId(newestChangedId);
            } else if (fallbackLatestId) {
                // Ensure there is always one highlighted marker even without fresh changes.
                setTimedPriorityAlertId((prev) => prev || fallbackLatestId);
            }
        });

        unsubRef.current = unsub;

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [filters]);

    useEffect(() => {
        if (!timedPriorityAlertId) return undefined;
        const timeout = setTimeout(() => {
            setTimedPriorityAlertId(null);
        }, 20000);
        return () => clearTimeout(timeout);
    }, [timedPriorityAlertId]);

    const highlightedMarkerId = timedPriorityAlertId || latestContextAlertId || alerts[0]?.id || null;

    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
        // If the currently selected alert is no longer in the filtered set, deselect it
        setSelectedAlert((prev) => {
            if (!prev) return prev;
            return prev; // will naturally disappear if not in markers anymore
        });
    }, []);

    const handleRecentAlertSelect = useCallback((alert) => {
        if (!alert) return;
        setSelectedAlert(alert);
        setFocusedAlert({ ...alert, __focusKey: Date.now() });
    }, []);

    const handleMarkerClick = useCallback((alert) => {
        setSelectedAlert(alert);
        setFocusedAlert({ ...alert, __focusKey: Date.now() });
    }, []);

    return (
        <div className="map-page">
            <div className="map-container">
                <MapContainer
                    center={userPosition || DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    minZoom={2}
                    maxZoom={20}
                    worldCopyJump={false}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        minZoom={2}
                        maxZoom={20}
                        noWrap={true}
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
                    <DynamicMarkers
                        alerts={alerts}
                        onMarkerClick={handleMarkerClick}
                        highlightedAlertId={highlightedMarkerId}
                        selectedAlertId={selectedAlert?.id || null}
                    />
                    <MapFocusController focusAlert={focusedAlert} />
                </MapContainer>

                {/* ── Filter Panel (replaces old MapLegend) ── */}
                <MapFilterPanel
                    types={filters.types}
                    status={filters.status}
                    dateRange={filters.dateRange}
                    customStart={filters.customStart}
                    customEnd={filters.customEnd}
                    onChange={handleFiltersChange}
                    totalVisible={alerts.length}
                    recentAlerts={alerts}
                    highlightedAlertId={highlightedMarkerId}
                    selectedAlertId={selectedAlert?.id || null}
                    onRecentAlertSelect={handleRecentAlertSelect}
                />

                {/* Alert count badge */}
                {!alertsLoading && <MapAlertCountBadge count={alerts.length} />}
                {alertsLoading && (
                    <div className="map-loading-overlay">
                        <div className="loading-spinner" />
                    </div>
                )}

                {/* Discreet location error hint */}
                {geoError && (
                    <div className="map-geo-hint">
                        <div className="map-geo-hint-title">Ubicación desactivada</div>
                        <div className="map-geo-hint-desc">
                            Activa los permisos de ubicación para este navegador si deseas centrar el mapa en tu posición.
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
