import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { Navigation2 } from 'lucide-react';
import { createUserLocationIcon } from '../../utils/markerIcons';
import { DEFAULT_ZOOM } from '../../utils/mapUtils';

/**
 * UserLocationMarker — renders a pulsing blue dot at the user's GPS position.
 * Must be rendered inside <MapContainer>.
 *
 * @param {{ position: [number, number] | null }} props
 */
export function UserLocationMarker({ position }) {
    if (!position) return null;
    return (
        <Marker
            position={position}
            icon={createUserLocationIcon()}
            zIndexOffset={1000}
        />
    );
}

/**
 * AutoCenterOnUser — centers the map once when GPS becomes available.
 */
export function AutoCenterOnUser({ position }) {
    const map = useMap();
    const [centered, setCentered] = useState(false);

    useEffect(() => {
        if (!position || centered) return;
        // First center must be instant to avoid "jump from Bogotá" perception.
        map.setView(position, DEFAULT_ZOOM, { animate: false });
        setCentered(true);
    }, [position, centered, map]);

    return null;
}

/**
 * LocateMeButton — fixed button (bottom-right) that flies the map to the
 * user's last known GPS position.
 * Must be rendered inside <MapContainer>.
 *
 * @param {{ userPosition: [number, number] | null, onLocate: Function }} props
 */
export function LocateMeButton({ userPosition, onLocate }) {
    const map = useMap();

    function handleClick() {
        if (userPosition) {
            map.flyTo(userPosition, DEFAULT_ZOOM, { duration: 1.2 });
        } else {
            onLocate?.(); // re-request geolocation
        }
    }

    return (
        <div style={{
            position: 'absolute',
            bottom: 'var(--space-8, 32px)',
            right: 'var(--space-4, 16px)',
            zIndex: 500,
        }}>
            <button
                title={userPosition ? 'Centrar en mi ubicación' : 'Obtener mi ubicación'}
                onClick={handleClick}
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(13,27,62,0.92)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    color: userPosition ? '#007AFF' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    transition: 'color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Navigation2 style={{ width: 18, height: 18 }} />
            </button>
        </div>
    );
}
