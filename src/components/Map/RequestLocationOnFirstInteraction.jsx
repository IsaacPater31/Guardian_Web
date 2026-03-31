import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';

/**
 * Requests geolocation permissions on the user's first interaction with the map.
 * This avoids silent failures on mobile browsers that require a user gesture.
 */
export default function RequestLocationOnFirstInteraction({ enabled, onRequest }) {
    const requested = useRef(false);

    useMapEvents({
        click: () => {
            if (!enabled || requested.current) return;
            requested.current = true;
            onRequest?.();
        },
        dragstart: () => {
            if (!enabled || requested.current) return;
            requested.current = true;
            onRequest?.();
        },
    });

    // Reset if toggled off/on (rare but keeps behavior sane)
    useEffect(() => {
        if (!enabled) requested.current = false;
    }, [enabled]);

    return null;
}

