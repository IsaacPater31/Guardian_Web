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
 * Group alerts by geographic proximity then assign non-overlapping pixel
 * positions via a golden-angle spiral.
 *
 * @param {Array} alerts  - Alert objects with a `location` field.
 * @param {Object|null} map - Leaflet map instance (null → no offset, just raw coords).
 * @returns {Array<{ alert, lat, lng, hasOffset, offsetLevel }>}
 */
export function computeOffsets(alerts, map) {
    if (!map) {
        return alerts
            .filter(a => a.location)
            .map(a => ({
                alert: a,
                lat: a.location.latitude ?? a.location.lat,
                lng: a.location.longitude ?? a.location.lng,
                hasOffset: false,
                offsetLevel: 0,
            }));
    }

    // Step 1: geographic grouping
    const groups = [];
    for (const alert of alerts) {
        if (!alert.location) continue;
        const lat = alert.location.latitude ?? alert.location.lat;
        const lng = alert.location.longitude ?? alert.location.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        let matched = false;
        for (const g of groups) {
            if (haversineM(lat, lng, g.cLat, g.cLng) <= GEO_THRESHOLD_M) {
                g.alerts.push(alert);
                g.cLat = g.alerts.reduce((s, a) => s + (a.location.latitude ?? a.location.lat), 0) / g.alerts.length;
                g.cLng = g.alerts.reduce((s, a) => s + (a.location.longitude ?? a.location.lng), 0) / g.alerts.length;
                matched = true;
                break;
            }
        }
        if (!matched) groups.push({ cLat: lat, cLng: lng, alerts: [alert] });
    }

    // Step 2: assign spiral pixel positions, checking all placed markers
    // Uses plain {x,y} objects — no Leaflet L.point import needed
    const result = [];
    const placed = []; // { x, y } screen pixels of every finalised marker
    const STEP = MARKER_PX + SPIRAL_GAP_PX;

    for (const group of groups) {
        const centerPt = map.latLngToContainerPoint([group.cLat, group.cLng]);

        for (let i = 0; i < group.alerts.length; i++) {
            const alert = group.alerts[i];
            let finalPt = { x: centerPt.x, y: centerPt.y };
            let iteration = 0;

            for (let step = 0; step < 200; step++) {
                const angle = step * 2.3998; // golden angle ~137.5°
                const r = step === 0 ? 0 : STEP * Math.sqrt(step);
                const candidate = {
                    x: centerPt.x + r * Math.cos(angle),
                    y: centerPt.y + r * Math.sin(angle),
                };

                const clear = placed.every(p => {
                    const dist = Math.sqrt((candidate.x - p.x) ** 2 + (candidate.y - p.y) ** 2);
                    return dist >= MARKER_PX;
                });

                if (clear) {
                    finalPt = candidate;
                    iteration = step;
                    break;
                }
            }

            placed.push({ x: finalPt.x, y: finalPt.y });
            const finalLL = map.containerPointToLatLng(finalPt);

            result.push({
                alert,
                lat: finalLL.lat,
                lng: finalLL.lng,
                hasOffset: iteration > 0,
                offsetLevel: iteration,
            });
        }
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
