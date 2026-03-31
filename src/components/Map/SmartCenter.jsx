import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { DEFAULT_ZOOM } from '../../utils/mapUtils';

/**
 * SmartCenter — flies the map to the densest alert cluster exactly once,
 * when the center prop first becomes available.
 *
 * Must be rendered inside <MapContainer>.
 *
 * @param {{ center: [number, number] | null }} props
 */
export default function SmartCenter({ center }) {
    const map = useMap();
    const done = useRef(false);

    useEffect(() => {
        if (center && !done.current) {
            done.current = true;
            map.flyTo(center, DEFAULT_ZOOM, { duration: 1.4, easeLinearity: 0.25 });
        }
    }, [center, map]);

    return null;
}
