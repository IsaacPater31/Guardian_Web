/**
 * mapUtils.js — Pure geographic & clustering utilities (no React, no Leaflet DOM).
 * Single Responsibility: math and grouping logic for map markers.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_CENTER = [4.7110, -74.0721]; // Bogotá
export const DEFAULT_ZOOM = 13;
export const GEO_THRESHOLD_M = 100;  // alerts ≤100 m apart = same location
export const MARKER_PX = 36;         // icon diameter in pixels
export const SPIRAL_GAP_PX = 6;      // gap between markers in spiral

/**
 * Haversine distance in metres between two lat/lng pairs.
 */
export function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const dφ = (lat2 - lat1) * Math.PI / 180;
    const dλ = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Apply Flutter-like geographic offsets:
 * - detect overlap by real distance (meters)
 * - apply a small lat/lng offset ring
 * This keeps separation visually stable across zoom levels.
 *
 * @param {Array} alerts
 * @param {Object|null} map
 * @returns {Array<{ alert, lat, lng, hasOffset, offsetLevel }>}
 */
export function computeOffsets(alerts, map = null) {
    const OVERLAP_THRESHOLD_M = 50;
    const BASE_OFFSET_DISTANCE_DEG = 0.00008;
    const MAX_OFFSET_LEVEL = 5;
    const zoom = typeof map?.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM;
    const zoomFactor = Math.min(1.7, Math.max(0.8, 0.8 + ((zoom - 11) * 0.09)));
    const offsetStepDeg = BASE_OFFSET_DISTANCE_DEG * zoomFactor;
    const result = [];
    const stableAlerts = [...alerts].sort((a, b) => {
        const at = a?.timestamp?.toDate?.()?.getTime?.() ?? a?.timestamp?.getTime?.() ?? 0;
        const bt = b?.timestamp?.toDate?.()?.getTime?.() ?? b?.timestamp?.getTime?.() ?? 0;
        if (at !== bt) return bt - at;
        return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
    });

    for (const alert of stableAlerts) {
        if (!alert.location) continue;
        const baseLat = alert.location.latitude ?? alert.location.lat;
        const baseLng = alert.location.longitude ?? alert.location.lng;
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) continue;

        let lat = baseLat;
        let lng = baseLng;
        let offsetLevel = 0;
        let overlapCount = 0;

        for (const existing of result) {
            if (haversineM(baseLat, baseLng, existing.baseLat, existing.baseLng) < OVERLAP_THRESHOLD_M) {
                overlapCount += 1;
            }
        }

        if (overlapCount > 0) {
            const slotCount = zoom >= 17 ? 14 : (zoom >= 15 ? 12 : 10);
            const ring = Math.min(MAX_OFFSET_LEVEL, Math.floor((overlapCount - 1) / slotCount) + 1);
            const slot = (overlapCount - 1) % slotCount;
            const angle = (2 * Math.PI * slot) / slotCount;

            // Add a mild zoom boost so close-up markers are clearly distinguishable.
            const closeBoost = zoom >= 18 ? 1.5 : (zoom >= 16 ? 1.3 : 1.1);
            const radius = offsetStepDeg * ring * closeBoost;

            lat = baseLat + radius * Math.cos(angle);
            lng = baseLng + radius * Math.sin(angle);
            offsetLevel = ring;
        }

        result.push({
            alert,
            baseLat,
            baseLng,
            lat,
            lng,
            hasOffset: offsetLevel > 0,
            offsetLevel,
        });
    }

    return result;
}

/**
 * Find the centre of the densest geographic cluster to auto-fly to.
 *
 * @param {Array} alerts
 * @returns {[number, number]|null}
 */
export function computeSmartCenter(alerts) {
    const withLoc = alerts.filter(a => a.location);
    if (!withLoc.length) return null;

    const cells = {};
    for (const a of withLoc) {
        const key = `${Math.round(a.location.latitude / 0.01)}_${Math.round(a.location.longitude / 0.01)}`;
        if (!cells[key]) cells[key] = [];
        cells[key].push(a);
    }

    const hotCell = Object.values(cells).reduce(
        (best, c) => (c.length > best.length ? c : best),
        []
    );
    const cluster = hotCell.length ? hotCell : withLoc;

    return [
        cluster.reduce((s, a) => s + a.location.latitude, 0) / cluster.length,
        cluster.reduce((s, a) => s + a.location.longitude, 0) / cluster.length,
    ];
}
