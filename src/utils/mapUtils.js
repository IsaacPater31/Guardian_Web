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
 * @returns {Array<{ alert, lat, lng, hasOffset, offsetLevel }>}
 */
export function computeOffsets(alerts) {
    const OVERLAP_THRESHOLD_M = 50;
    const OFFSET_DISTANCE_DEG = 0.0001;
    const result = [];

    for (const alert of alerts) {
        if (!alert.location) continue;
        const baseLat = alert.location.latitude ?? alert.location.lat;
        const baseLng = alert.location.longitude ?? alert.location.lng;
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) continue;

        let lat = baseLat;
        let lng = baseLng;
        let offsetLevel = 0;

        for (const existing of result) {
            if (haversineM(baseLat, baseLng, existing.lat, existing.lng) < OVERLAP_THRESHOLD_M) {
                offsetLevel += 1;
                const angle = (offsetLevel * 2 * Math.PI) / 8;
                const radius = OFFSET_DISTANCE_DEG * offsetLevel;
                lat = baseLat + radius * Math.cos(angle);
                lng = baseLng + radius * Math.sin(angle);
            }
        }

        result.push({
            alert,
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
