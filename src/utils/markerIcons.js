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
import { getAlertColor, normalizeAlertType } from '../config/alertTypes';

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
    // Canónico (Guardian móvil)
    HEALTH:         '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>',
    casa:           '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    policial:       '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    FIRE:           '<path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/>',
    seguridad:      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    ACCOMPANIMENT:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ambiental:      '<path d="M6 16.326A7 7 0 0 1 8 2.001"/><path d="M8 2v2"/><path d="M8 22v-2"/><path d="M16 16.326A7 7 0 0 0 14 2.001"/><path d="M14 2v2"/><path d="M14 22v-2"/><path d="M9.5 10.5 12 8l2.5 2.5"/>',
    vial:           '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.414 10H5.586L4.5 12.1A2 2 0 0 0 3 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    acoso:          '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-1.42-1.42"/>',
    URGENCY:        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',

    // Alias legacy (marcadores sin normalizar)
    HOME_HELP:      '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    POLICE:         '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    SECURITY_BREACH:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    ENVIRONMENTAL:  '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    ROAD_EMERGENCY: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    HARASSMENT:     '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-1.42-1.42"/>',

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
 * @param {{ isHighlighted?: boolean }} [options]
 * @returns {L.DivIcon}
 */
export function createAlertIcon(alertType, hasOffset, options = {}) {
    const { isHighlighted = false } = options;
    const color = getAlertColor(alertType);
    const canon = normalizeAlertType(alertType);
    const svgPath = SVG_PATHS[canon] ?? SVG_PATHS[alertType] ?? FALLBACK_SVG;
    const markerPx = MARKER_PX;
    const border  = hasOffset
        ? '2.5px solid #FFD600'
        : '2px solid rgba(255,255,255,0.9)';
    const glow = isHighlighted
        ? `0 18px 40px rgba(10, 16, 28, 0.56),0 0 0 4px ${color}99,0 0 40px ${color}88`
        : `0 2px 10px rgba(0,0,0,0.3),0 0 0 2px ${color}24`;

    return L.divIcon({
        className: '',
        iconSize:   [markerPx, markerPx],
        iconAnchor: [markerPx / 2, markerPx / 2],
        html: `<div style="
            width:${markerPx}px;height:${markerPx}px;border-radius:50%;
            background:${color};
            border:${border};
            box-shadow:${glow};
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
            position:relative;
            transition: box-shadow 260ms ease, transform 260ms ease;
            transform:none;
            ${isHighlighted ? 'animation: marker-highlight-noc 0.82s cubic-bezier(0.4, 0, 0.2, 1) infinite;' : ''}
        ">
            ${isHighlighted
        ? `<span style="
                    position:absolute;
                    inset:-10px;
                    border-radius:50%;
                    border:2px solid ${color}C8;
                    animation: marker-focus-ring-core 0.82s ease-out infinite;
                "></span>
                <span style="
                    position:absolute;
                    inset:-18px;
                    border-radius:50%;
                    border:2px solid ${color}78;
                    animation: marker-focus-ring-outer 1.25s ease-out infinite;
                "></span>
                <span style="
                    position:absolute;
                    inset:-2px;
                    border-radius:50%;
                    background: radial-gradient(circle, transparent 38%, ${color}78 68%, transparent 100%);
                    animation: marker-core-flash 0.82s ease-in-out infinite;
                "></span>
                <span style="
                    position:absolute;
                    right:-4px;
                    top:-4px;
                    width:9px;
                    height:9px;
                    border-radius:50%;
                    background:#ff3b30;
                    box-shadow:0 0 0 3px rgba(255,59,48,0.25),0 0 14px rgba(255,59,48,0.8);
                    animation: marker-priority-beacon 0.82s steps(2, end) infinite;
                "></span>`
        : ''}
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
                ${svgPath}
            </svg>
        </div>
        <style>
            @keyframes marker-focus-ring-core {
                0% { transform: scale(0.94); opacity: 0.86; }
                100% { transform: scale(1.34); opacity: 0; }
            }
            @keyframes marker-focus-ring-outer {
                0% { transform: scale(0.9); opacity: 0.56; }
                100% { transform: scale(1.56); opacity: 0; }
            }
            @keyframes marker-core-flash {
                0%, 100% { opacity: 0.48; filter: brightness(1); }
                50% { opacity: 1; filter: brightness(1.35); }
            }
            @keyframes marker-priority-beacon {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.25; }
            }
            @keyframes marker-highlight-noc {
                0%, 100% { filter: saturate(1.08) brightness(1); transform: scale(1); }
                50% { filter: saturate(1.45) brightness(1.24); transform: scale(1.12); }
            }
        </style>`,
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
