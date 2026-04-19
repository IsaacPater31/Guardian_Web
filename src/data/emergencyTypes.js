/**
 * emergencyTypes.js — Backward-compatible re-export shim.
 *
 * The authoritative source for alert type configuration has moved to:
 *   src/config/alertTypes.js
 *
 * This file re-exports everything under the old names so existing imports
 * across the codebase continue to work without modification.
 *
 * @deprecated Import directly from 'config/alertTypes' in new code.
 */

export {
    ALERT_TYPES       as EMERGENCY_TYPES,
    ACTIVE_ALERT_TYPES as ACTIVE_EMERGENCY_TYPES,
    getAlertColor,
    getAlertIcon,
    getAlertLabel,
    getAlertLabelEn,
    getTimeAgo,
} from '../config/alertTypes';
