/**
 * markerIcons.js — Leaflet DivIcon factory for alert markers.
 *
 * Single Responsibility: build Leaflet icon HTML from an alertType key.
 * All type metadata (color, SVG path) comes from config/alertTypes — no
 * hardcoded data lives in this file.
 *
 * SVG paths are now co-located with each type definition in alertTypes.js.
 * If a type has no svgPath defined, a generic warning icon is used.
 */

import L from 'leaflet';
import { getAlertColor } from '../config/alertTypes';

export const MARKER_PX = 36;

// Generic fallback SVG path (warning triangle)
const FALLBACK_SVG = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';

/**
 * SVG inner path fragments keyed by alertType.
 *
 * Kept here (not in alertTypes.js) because these are Leaflet/SVG rendering
 * concerns, not business-logic concerns — separation of layers.
 * New types added to alertTypes.js should have a matching entry here.
 */
const SVG_PATHS = Object.freeze({
    // Active types
    HEALTH:         '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>',
    HOME_HELP:      '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    POLICE:         '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    FIRE:           '<path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/>',
    ACCOMPANIMENT:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ENVIRONMENTAL:  '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    ROAD_EMERGENCY: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    HARASSMENT:     '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
    URGENCY:        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',

    // Legacy types
    ROBBERY:                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="2" y1="2" x2="22" y2="22"/>',
    EMERGENCY:                  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    UNSAFETY:                   FALLBACK_SVG,
    ACCIDENT:                   '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    'PHYSICAL RISK':            '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5.14 19.5-.86-2.36a2 2 0 0 1 1.42-2.56l5.3-1.32"/>',
    'PUBLIC SERVICES EMERGENCY':'<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/>',
    'VIAL EMERGENCY':           '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    ASSISTANCE:                 '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'STREET ESCORT':            '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
});

/**
 * Create a Leaflet DivIcon for a given alert type.
 *
 * @param {string}  alertType
 * @param {boolean} hasOffset  — true if the marker was displaced from its geo-centre
 * @returns {L.DivIcon}
 */
export function createAlertIcon(alertType, hasOffset) {
    const color   = getAlertColor(alertType);
    const svgPath = SVG_PATHS[alertType] ?? FALLBACK_SVG;
    const border  = hasOffset
        ? '2.5px solid #FFD600'
        : '2px solid rgba(255,255,255,0.9)';

    return L.divIcon({
        className: '',
        iconSize:   [MARKER_PX, MARKER_PX],
        iconAnchor: [MARKER_PX / 2, MARKER_PX / 2],
        html: `<div style="
            width:${MARKER_PX}px;height:${MARKER_PX}px;border-radius:50%;
            background:${color};
            border:${border};
            box-shadow:0 2px 10px rgba(0,0,0,0.3),0 0 0 3px ${color}28;
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
                ${svgPath}
            </svg>
        </div>`,
    });
}

/**
 * Create a Leaflet DivIcon for the user's current GPS position.
 *
 * @returns {L.DivIcon}
 */
export function createUserLocationIcon() {
    return L.divIcon({
        className: '',
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
        html: `<div style="
            width:20px;height:20px;border-radius:50%;
            background:#007AFF;
            border:3px solid white;
            box-shadow:0 0 0 4px rgba(0,122,255,0.25), 0 2px 8px rgba(0,0,0,0.3);
            animation:pulse-blue 2s infinite;
        "></div>
        <style>
            @keyframes pulse-blue {
                0%   { box-shadow: 0 0 0 4px rgba(0,122,255,0.25), 0 2px 8px rgba(0,0,0,0.3); }
                50%  { box-shadow: 0 0 0 10px rgba(0,122,255,0.08), 0 2px 8px rgba(0,0,0,0.3); }
                100% { box-shadow: 0 0 0 4px rgba(0,122,255,0.25), 0 2px 8px rgba(0,0,0,0.3); }
            }
        </style>`,
    });
}
