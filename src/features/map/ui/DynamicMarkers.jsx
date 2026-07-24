import { useCallback, useEffect, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { computeOffsets } from '@/features/map/utils/mapUtils';
import { createAlertIcon } from '@/features/map/utils/markerIcons';
import { AlertStatus } from '@/shared/config/alertTypes';
import { resolveAlertTypePresentation } from '@/features/alerts/utils/alertTypePresentation';

/**
 * DynamicMarkers — recalculates spiral-offset marker positions on every
 * zoomend / moveend so markers never overlap regardless of zoom level.
 *
 * @param {{
 * alerts: Array,
 * onMarkerClick: Function,
 * highlightedAlertId?: string|null,
 * selectedAlertId?: string|null,
 * }} props
 */
export default function DynamicMarkers({
    alerts,
    onMarkerClick,
    highlightedAlertId = null,
    selectedAlertId = null,
}) {
    const map = useMap();
    const [markers, setMarkers] = useState([]);

    const recalc = useCallback(() => {
        setMarkers(computeOffsets(alerts, map));
    }, [alerts, map]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- marker layout depends on map size/zoom
        recalc();
    }, [recalc]);
    useMapEvents({ zoomend: recalc, moveend: recalc });

    return (
        <>
            {markers.map(({ alert, lat, lng, hasOffset }) => {
                const isAttended = alert.alertStatus === AlertStatus.ATTENDED;
                const isActive = !isAttended && alert.id === highlightedAlertId;
                const isSelected = alert.id === selectedAlertId;
                const { color } = resolveAlertTypePresentation(alert);
                const zIndexOffset = isSelected
                    ? 1800
                    : isActive
                        ? 1500
                        : isAttended
                            ? -300
                            : 0;

                return (
                    <Marker
                        key={alert.id}
                        position={[lat, lng]}
                        icon={createAlertIcon(alert.alertType, hasOffset, {
                            isActive,
                            isSelected,
                            isAttended,
                            color,
                        })}
                        zIndexOffset={zIndexOffset}
                        eventHandlers={{ click: () => onMarkerClick(alert) }}
                    />
                );
            })}
        </>
    );
}
