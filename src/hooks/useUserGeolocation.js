import { useCallback, useEffect, useRef, useState } from 'react';

function asLatLng(pos) {
    return [pos.coords.latitude, pos.coords.longitude];
}

const LAST_POS_KEY = 'guardian:lastUserPosition';

function readLastPosition() {
    try {
        const raw = localStorage.getItem(LAST_POS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const lat = Number(parsed?.lat);
        const lng = Number(parsed?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
    } catch {
        return null;
    }
}

function writeLastPosition([lat, lng]) {
    try {
        localStorage.setItem(LAST_POS_KEY, JSON.stringify({ lat, lng, ts: Date.now() }));
    } catch {
        // ignore
    }
}

export default function useUserGeolocation() {
    const [position, setPosition] = useState(() => readLastPosition());
    const [error, setError] = useState(null);
    const highAccuracyPending = useRef(false);

    const request = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocalización no soportada');
            return;
        }

        // Fast-first: allow cached/quick GPS for immediate centering.
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const ll = asLatLng(pos);
                setPosition(ll);
                writeLastPosition(ll);
                setError(null);
            },
            () => {
                // Silent: we still attempt high-accuracy as a second pass.
            },
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 3500 }
        );

        if (highAccuracyPending.current) return;
        highAccuracyPending.current = true;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const ll = asLatLng(pos);
                setPosition(ll);
                writeLastPosition(ll);
                setError(null);
                highAccuracyPending.current = false;
            },
            (err) => {
                setError(err.message);
                highAccuracyPending.current = false;
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }, []);

    // Volvemos a solicitar ubicación automáticamente al montar para que
    // el mapa se centre rápido en la ubicación actual (asumiendo que
    // el navegador ya permite geolocalización para el sitio).
    useEffect(() => {
        request();
    }, [request]);

    return { position, error, request };
}
