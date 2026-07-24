/**
 * markerIcons.js — Leaflet DivIcon factory for alert markers.
 *
 * Visual states (Apple HIG-inspired):
 *   - Active (latest pending): larger, red pulse ring (#FF3B30)
 *   - Selected: blue focus ring (#007AFF)
 *   - Attended: green ring + check (#34C759), slightly muted
 *   - Default pending: type color, subtle shadow
 */

import L from 'leaflet';
import { getAlertColor, normalizeAlertType } from '@/shared/config/alertTypes';
import { MARKER_PX } from '@/features/map/utils/mapUtils';

export { MARKER_PX };
const APPLE_RED = '#FF3B30';
const APPLE_GREEN = '#34C759';
const APPLE_BLUE = '#007AFF';

const FALLBACK_SVG = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';

const SVG_PATHS = Object.freeze({
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
    HOME_HELP:      '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    POLICE:         '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    SECURITY_BREACH:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    ENVIRONMENTAL:  '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    ROAD_EMERGENCY: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    HARASSMENT:     '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-1.42-1.42"/>',
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

const MARKER_STYLES = `
    @keyframes guardian-marker-active-pulse {
        0%, 100% { transform: scale(1); opacity: 0.92; }
        50% { transform: scale(1.12); opacity: 1; }
    }
    @keyframes guardian-marker-active-ring {
        0% { transform: scale(0.88); opacity: 0.75; }
        100% { transform: scale(1.55); opacity: 0; }
    }
    @keyframes guardian-marker-selected-ring {
        0% { transform: scale(0.9); opacity: 0.7; }
        100% { transform: scale(1.45); opacity: 0; }
    }
`;

/**
 * @param {string}  alertType
 * @param {boolean} hasOffset
 * @param {{ isActive?: boolean, isSelected?: boolean, isAttended?: boolean }} [options]
 */
export function createAlertIcon(alertType, hasOffset, options = {}) {
    const {
        isActive = false,
        isSelected = false,
        isAttended = false,
        color: colorOverride = null,
    } = options;

    const color = colorOverride || getAlertColor(alertType);
    const canon = normalizeAlertType(alertType);
    const svgPath = SVG_PATHS[canon] ?? SVG_PATHS[alertType] ?? FALLBACK_SVG;

    const markerPx = isActive ? 44 : isSelected ? 40 : MARKER_PX;
    const iconSize = isActive ? 17 : 15;

    let border = '2px solid rgba(255,255,255,0.95)';
    if (hasOffset) border = '2.5px solid #FFD600';
    if (isAttended) border = `2.5px solid ${APPLE_GREEN}`;
    if (isActive) border = `3px solid ${APPLE_RED}`;
    if (isSelected) border = `3px solid ${APPLE_BLUE}`;

    let boxShadow = `0 2px 10px rgba(0,0,0,0.28), 0 0 0 2px ${color}22`;
    if (isAttended) {
        boxShadow = `0 2px 8px rgba(52,199,89,0.22), 0 0 0 2px rgba(52,199,89,0.35)`;
    }
    if (isActive) {
        boxShadow = `0 10px 28px rgba(255,59,48,0.45), 0 0 0 4px rgba(255,59,48,0.55), 0 0 24px rgba(255,59,48,0.35)`;
    }
    if (isSelected) {
        boxShadow = `0 14px 32px rgba(0,122,255,0.42), 0 0 0 4px rgba(0,122,255,0.75)`;
    }

    const filter = isAttended && !isActive && !isSelected
        ? 'saturate(0.72) brightness(0.96)'
        : 'none';

    const anim = isSelected
        ? 'guardian-marker-active-pulse 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
        : isActive
            ? 'guardian-marker-active-pulse 1.25s ease-in-out infinite'
            : 'none';

    const rings = isActive
        ? `<span style="position:absolute;inset:-8px;border-radius:50%;border:2.5px solid ${APPLE_RED};animation:guardian-marker-active-ring 1.25s ease-out infinite;"></span>
           <span style="position:absolute;inset:-16px;border-radius:50%;border:2px solid rgba(255,59,48,0.45);animation:guardian-marker-active-ring 1.8s ease-out infinite;"></span>`
        : isSelected
            ? `<span style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${APPLE_BLUE};animation:guardian-marker-selected-ring 1.1s ease-out infinite;"></span>`
            : '';

    const attendedBadge = isAttended
        ? `<span style="position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:50%;background:${APPLE_GREEN};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
           </span>`
        : '';

    return L.divIcon({
        className: '',
        iconSize: [markerPx + (isActive ? 20 : 8), markerPx + (isActive ? 20 : 8)],
        iconAnchor: [(markerPx + (isActive ? 20 : 8)) / 2, (markerPx + (isActive ? 20 : 8)) / 2],
        html: `<div style="width:${markerPx + (isActive ? 20 : 8)}px;height:${markerPx + (isActive ? 20 : 8)}px;display:flex;align-items:center;justify-content:center;position:relative;">
            ${rings}
            <div style="
                width:${markerPx}px;height:${markerPx}px;border-radius:50%;
                background:${color};
                border:${border};
                box-shadow:${boxShadow};
                display:flex;align-items:center;justify-content:center;
                cursor:pointer;
                position:relative;
                filter:${filter};
                animation:${anim};
                transition:transform 220ms ease, box-shadow 220ms ease;
            ">
                ${attendedBadge}
                <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24"
                    fill="none" stroke="white" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round">
                    ${svgPath}
                </svg>
            </div>
        </div>
        <style>${MARKER_STYLES}</style>`,
    });
}

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
