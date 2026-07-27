import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
    subscribeToMapAlertsFiltered,
    sortAlertsNewestFirst,
    sortPendingAlertsNewestFirst,
    findNewestPendingAmongChanges,
} from '@/features/alerts/repository/alertRepository';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/features/map/utils/mapUtils';
import DynamicMarkers from '@/features/map/ui/DynamicMarkers';
import { UserLocationMarker, LocateMeButton, AutoCenterOnUser } from '@/features/map/ui/UserLocation';
import AlertDetailModal from '@/features/alerts/ui/AlertDetailModal';
import useUserGeolocation from '@/features/map/utils/useUserGeolocation';
import SelectedAlertPanel from '@/features/map/ui/SelectedAlertPanel';
import MapAlertCountBadge from '@/features/map/ui/MapAlertCountBadge';
import RequestLocationOnFirstInteraction from '@/features/map/ui/RequestLocationOnFirstInteraction';
import MapFilterPanel from '@/features/map/ui/MapFilterPanel';
import MapCommunityFilterBar from '@/features/map/ui/MapCommunityFilterBar';
import { DEFAULT_FILTERS } from '@/shared/config/filterOptions';
import { ACTIVE_ALERT_FEEDBACK_MS } from '@/shared/config/alertTypes';
import { getAllCommunities, getMemberAliasMap } from '@/features/communities/repository/communityRepository';
import { filterAlertsByCommunities } from '@/features/alerts/utils/alertScope';
import { resolveSenderLabelForAlert } from '@/shared/utils/memberDisplayLabel';

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
    const [rawAlerts, setRawAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [selectedAlertId, setSelectedAlertId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [timedPriorityAlertId, setTimedPriorityAlertId] = useState(null);
    const [focusedAlert, setFocusedAlert] = useState(null);
    const [communities, setCommunities] = useState([]);
    /** null = all; [] = none; [ids] = subset */
    const [selectedCommunityIds, setSelectedCommunityIds] = useState(null);
    const [aliasMaps, setAliasMaps] = useState({});
    const { position: userPosition, error: geoError, request: requestLocation } = useUserGeolocation();

    const unsubRef = useRef(null);
    const isInitialSnapshotRef = useRef(true);
    const lastAutoFocusIdRef = useRef(null);
    const selectedCommunityIdsRef = useRef(selectedCommunityIds);
    selectedCommunityIdsRef.current = selectedCommunityIds;

    useEffect(() => {
        let cancelled = false;
        getAllCommunities()
            .then((list) => {
                if (cancelled) return;
                const mapped = (list || [])
                    .map((c) => ({ id: c.id, name: c.name || 'Comunidad' }))
                    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
                setCommunities(mapped);
            })
            .catch((err) => {
                console.error('[MapPage] getAllCommunities', err);
            });
        return () => { cancelled = true; };
    }, []);

    // Type / status / date → Firestore only (community is client AND via useMemo)
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
            setRawAlerts(data);
            setAlertsLoading(false);

            if (isInitialSnapshotRef.current) {
                isInitialSnapshotRef.current = false;
                return;
            }

            const communityFilter = selectedCommunityIdsRef.current;
            const scoped = communityFilter == null
                ? data
                : filterAlertsByCommunities(data, communityFilter);

            const changedIds = Array.isArray(meta.changedIds) ? meta.changedIds : [];
            const newestChanged = findNewestPendingAmongChanges(scoped, changedIds);
            if (!newestChanged?.id) return;

            const nextActiveId = sortPendingAlertsNewestFirst(scoped)[0]?.id ?? null;
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

    const alerts = useMemo(() => {
        if (selectedCommunityIds == null) return rawAlerts;
        return filterAlertsByCommunities(rawAlerts, selectedCommunityIds);
    }, [rawAlerts, selectedCommunityIds]);

    const effectiveCommunityIds = useMemo(() => {
        if (selectedCommunityIds == null) {
            return communities.map((c) => c.id).filter(Boolean);
        }
        return selectedCommunityIds;
    }, [selectedCommunityIds, communities]);

    useEffect(() => {
        const ids = (effectiveCommunityIds || []).filter(Boolean);
        if (!ids.length) {
            setAliasMaps({});
            return undefined;
        }
        let cancelled = false;
        Promise.all(ids.map(async (id) => [id, await getMemberAliasMap(id)]))
            .then((entries) => {
                if (cancelled) return;
                setAliasMaps(Object.fromEntries(entries));
            })
            .catch((err) => {
                console.warn('[MapPage] alias maps', err);
                if (!cancelled) setAliasMaps({});
            });
        return () => { cancelled = true; };
    }, [effectiveCommunityIds]);

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
        <div className="map-page has-community-filter">
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

                <MapCommunityFilterBar
                    communities={communities}
                    selectedIds={selectedCommunityIds}
                    onChange={setSelectedCommunityIds}
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
                        senderLabel={resolveSenderLabelForAlert(selectedAlert, aliasMaps)}
                    />
                )}
            </div>

            {showModal && selectedAlert && (
                <AlertDetailModal
                    alert={selectedAlert}
                    onClose={() => setShowModal(false)}
                    senderLabel={resolveSenderLabelForAlert(selectedAlert, aliasMaps)}
                />
            )}
        </div>
    );
}
