import { useCallback, useEffect, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { computeOffsets } from '../../utils/mapUtils';
import { createAlertIcon } from '../../utils/markerIcons';

/**
 * DynamicMarkers — recalculates spiral-offset marker positions on every
 * zoomend / moveend so markers never overlap regardless of zoom level.
 *
 * @param {{
 * alerts: Array,
 * onMarkerClick: Function,
 * highlightedAlertId?: string|null,
 * updatedAlertIds?: string[],
 * }} props
 */
export default function DynamicMarkers({
    alerts,
    onMarkerClick,
    highlightedAlertId = null,
    updatedAlertIds = [],
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
            {markers.map(({ alert, lat, lng, hasOffset }) => (
                <Marker
                    key={alert.id}
                    position={[lat, lng]}
                    icon={createAlertIcon(alert.alertType, hasOffset, {
                        isHighlighted: alert.id === highlightedAlertId,
                        isUpdated: updatedAlertIds.includes(alert.id),
                    })}
                    eventHandlers={{ click: () => onMarkerClick(alert) }}
                />
            ))}
        </>
    );
}
