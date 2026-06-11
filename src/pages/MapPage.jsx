import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
    subscribeToMapAlertsFiltered,
    sortAlertsNewestFirst,
    sortPendingAlertsNewestFirst,
    findNewestPendingAmongChanges,
} from '../services/alertService';
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
import { ACTIVE_ALERT_FEEDBACK_MS } from '../config/alertTypes';

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
    const [selectedAlertId, setSelectedAlertId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [timedPriorityAlertId, setTimedPriorityAlertId] = useState(null);
    const [focusedAlert, setFocusedAlert] = useState(null);
    const { position: userPosition, error: geoError, request: requestLocation } = useUserGeolocation();

    const unsubRef = useRef(null);
    const isInitialSnapshotRef = useRef(true);
    const lastAutoFocusIdRef = useRef(null);

    // Re-subscribe every time filters change
    useEffect(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        isInitialSnapshotRef.current = true;
        lastAutoFocusIdRef.current = null;

        // eslint-disable-next-line react-hooks/set-state-in-effect -- map subscription loading gate
        setAlertsLoading(true);

        const unsub = subscribeToMapAlertsFiltered(filters, (data, meta = {}) => {
            setAlerts(data);
            setAlertsLoading(false);

            if (isInitialSnapshotRef.current) {
                isInitialSnapshotRef.current = false;
                return;
            }

            const changedIds = Array.isArray(meta.changedIds) ? meta.changedIds : [];
            const newestChanged = findNewestPendingAmongChanges(data, changedIds);
            if (!newestChanged?.id) return;

            const nextActiveId = sortPendingAlertsNewestFirst(data)[0]?.id ?? null;
            if (newestChanged.id !== nextActiveId) return;

            setTimedPriorityAlertId(newestChanged.id);

            if (
                newestChanged.id !== lastAutoFocusIdRef.current &&
                newestChanged.shareLocation &&
                newestChanged.location
            ) {
                lastAutoFocusIdRef.current = newestChanged.id;
                setSelectedAlertId(newestChanged.id);
                setFocusedAlert({ ...newestChanged, __focusKey: Date.now() });
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
        }, ACTIVE_ALERT_FEEDBACK_MS);
        return () => clearTimeout(timeout);
    }, [timedPriorityAlertId]);

    const listAlerts = useMemo(
        () => sortAlertsNewestFirst(alerts),
        [alerts]
    );

    const pendingAlerts = useMemo(
        () => sortPendingAlertsNewestFirst(alerts),
        [alerts]
    );

    /** Latest non-attended alert — only this one is highlighted as active. */
    const activeAlertId = pendingAlerts[0]?.id ?? null;
    const selectedAlert = useMemo(
        () => alerts.find((a) => a.id === selectedAlertId) || null,
        [alerts, selectedAlertId]
    );

    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    const handleRecentAlertSelect = useCallback((alert) => {
        if (!alert) return;
        if (selectedAlertId === alert.id) {
            setSelectedAlertId(null);
            setFocusedAlert(null);
            return;
        }
        setSelectedAlertId(alert.id);
        setFocusedAlert({ ...alert, __focusKey: Date.now() });
    }, [selectedAlertId]);

    const handleMarkerClick = useCallback((alert) => {
        if (selectedAlertId === alert.id) {
            setSelectedAlertId(null);
            setFocusedAlert(null);
            return;
        }
        setSelectedAlertId(alert.id);
        setFocusedAlert({ ...alert, __focusKey: Date.now() });
    }, [selectedAlertId]);

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
                        highlightedAlertId={activeAlertId}
                        selectedAlertId={selectedAlertId}
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
                    listAlerts={listAlerts}
                    activeAlertId={activeAlertId}
                    pulseAlertId={
                        timedPriorityAlertId && timedPriorityAlertId === activeAlertId
                            ? timedPriorityAlertId
                            : null
                    }
                    selectedAlertId={selectedAlertId}
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
                        onClose={() => setSelectedAlertId(null)}
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
