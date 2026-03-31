import { useCallback, useEffect, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { computeOffsets } from '../../utils/mapUtils';
import { createAlertIcon } from '../../utils/markerIcons';

/**
 * DynamicMarkers — recalculates spiral-offset marker positions on every
 * zoomend / moveend so markers never overlap regardless of zoom level.
 *
 * @param {{ alerts: Array, onMarkerClick: Function }} props
 */
export default function DynamicMarkers({ alerts, onMarkerClick }) {
    const map = useMap();
    const [markers, setMarkers] = useState([]);

    const recalc = useCallback(() => {
        setMarkers(computeOffsets(alerts, map));
    }, [alerts, map]);

    useEffect(() => { recalc(); }, [recalc]);
    useMapEvents({ zoomend: recalc, moveend: recalc });

    return (
        <>
            {markers.map(({ alert, lat, lng, hasOffset }) => (
                <Marker
                    key={alert.id}
                    position={[lat, lng]}
                    icon={createAlertIcon(alert.alertType, hasOffset)}
                    eventHandlers={{ click: () => onMarkerClick(alert) }}
                />
            ))}
        </>
    );
}
