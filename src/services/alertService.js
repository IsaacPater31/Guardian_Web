/**
 * alertService.js — Firestore data-access layer for alerts.
 *
 * Responsibilities (Single Responsibility per function):
 *   - Parse raw Firestore documents into typed alert objects.
 *   - Build and execute Firestore queries.
 *   - Apply client-side post-filters (type, status).
 *
 * Query strategy (no composite indexes):
 *   The project only has single-field indexes (timestamp DESC, community_id ASC).
 *   Combining alertType == X  +  timestamp >= Y  +  orderBy(timestamp) would
 *   require a composite index. Therefore:
 *     • Server-side : timestamp range only.
 *     • Client-side : alertType and alertStatus filtering.
 *
 * All hardcoded values (collection names, field names, limits) are imported
 * from the config layer — never written inline here.
 */

import {
    collection, query, where, orderBy,
    onSnapshot, Timestamp, getDocs, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Collections }                from '../config/collections';
import { AlertFields, AlertStatus, QUERY_CONFIG } from '../config/alertTypes';
import { resolveFilterDates }         from '../utils/dateRangeUtils';

// ─── Document parser ──────────────────────────────────────────────────────────

/**
 * Transform a raw Firestore DocumentSnapshot into a plain alert JS object.
 * This is the only place that knows about Firestore field names.
 *
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {AlertObject}
 */
function parseAlert(doc) {
    const d = doc.data();
    // ── community_ids normalisation: support both legacy and new format ─────
    const rawCommunityIds = d[AlertFields.communityIds];  // new: array
    const rawCommunityId  = d[AlertFields.communityId];   // legacy: string

    let communityIds;
    if (Array.isArray(rawCommunityIds) && rawCommunityIds.length > 0) {
        communityIds = rawCommunityIds;
    } else if (rawCommunityId) {
        communityIds = [rawCommunityId]; // <- wrap legacy single-string into array
    } else {
        communityIds = [];
    }

    // Same rule as Guardian `AlertModel.fromFirestore`: legacy quick alerts stored HEALTH → URGENCY.
    let alertType = d[AlertFields.alertType] || '';
    const flowType = d[AlertFields.type] || '';
    if (flowType === 'quick' && alertType === 'HEALTH') {
        alertType = 'URGENCY';
    }

    return {
        id:           doc.id,
        type:         flowType,
        alertType,
        description:  d[AlertFields.description]   ?? null,
        subtype:      d[AlertFields.subtype]       ?? null,
        customDetail: d[AlertFields.customDetail]  ?? null,
        timestamp:    d[AlertFields.timestamp]     ?? null,
        isAnonymous:  d[AlertFields.isAnonymous]   ?? false,
        shareLocation:d[AlertFields.shareLocation] ?? false,
        location:     d[AlertFields.location]      ?? null,
        userId:       d[AlertFields.userId]        ?? null,
        userEmail:    d[AlertFields.userEmail]      ?? null,
        userName:     d[AlertFields.userName]       ?? null,
        imageBase64:  d[AlertFields.imageBase64]   ?? null,
        viewedCount:  d[AlertFields.viewedCount]   ?? 0,
        viewedBy:     d[AlertFields.viewedBy]      ?? [],
        communityIds,                               // new array (normalised)
        communityId:  communityIds[0] ?? null,      // convenience: first ID (may be null)
        forwardsCount:d[AlertFields.forwardsCount] ?? 0,
        reportsCount: d[AlertFields.reportsCount]  ?? 0,
        reportedBy:   d[AlertFields.reportedBy]    ?? [],
        alertStatus:  d[AlertFields.alertStatus]   ?? AlertStatus.PENDING,
    };
}

// ─── Query builder helpers ────────────────────────────────────────────────────

/** @returns {import('firebase/firestore').CollectionReference} */
const alertsCol = () => collection(db, Collections.ALERTS);

/**
 * Build timestamp constraints from resolved dates.
 * Returns an array of Firestore where() clauses (may be empty).
 *
 * @param {Date|null} start
 * @param {Date|null} end
 * @returns {import('firebase/firestore').QueryConstraint[]}
 */
function timestampConstraints(start, end) {
    const constraints = [];
    if (start) constraints.push(where(AlertFields.timestamp, '>=', Timestamp.fromDate(start)));
    if (end)   constraints.push(where(AlertFields.timestamp, '<=', Timestamp.fromDate(end)));
    return constraints;
}

/**
 * Apply client-side type and status post-filters to an array of alerts.
 *
 * @param {AlertObject[]} alerts
 * @param {string[]} types
 * @param {string}   status  — 'all' | 'pending' | 'attended'
 * @returns {AlertObject[]}
 */
function applyClientFilters(alerts, types, status) {
    let result = alerts;
    if (types.length > 0) {
        result = result.filter((a) => types.includes(a.alertType));
    }
    if (status !== 'all') {
        const target = status === AlertStatus.ATTENDED
            ? AlertStatus.ATTENDED
            : AlertStatus.PENDING;
        result = result.filter((a) =>
            status === AlertStatus.ATTENDED
                ? a.alertStatus === target
                : a.alertStatus !== AlertStatus.ATTENDED
        );
    }
    return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * One-shot fetch of alerts from the last N hours (configured in QUERY_CONFIG),
 * capped by QUERY_CONFIG.recentAlertsLimit (newest first).
 *
 * @returns {Promise<AlertObject[]>}
 */
export async function getRecentAlerts() {
    const since = new Date();
    since.setHours(since.getHours() - QUERY_CONFIG.recentWindowHours);

    const q = query(
        alertsCol(),
        where(AlertFields.timestamp, '>', Timestamp.fromDate(since)),
        orderBy(AlertFields.timestamp, 'desc'),
        limit(QUERY_CONFIG.recentAlertsLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(parseAlert);
}

/**
 * One-shot fetch of alerts that have a location (for initial map load).
 *
 * @returns {Promise<AlertObject[]>}
 */
export async function getMapAlerts() {
    const q = query(
        alertsCol(),
        orderBy(AlertFields.timestamp, 'desc'),
        limit(QUERY_CONFIG.mapFetchLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(parseAlert)
        .filter((a) => a.shareLocation && a.location);
}

/**
 * Real-time subscription to recent alerts (last N hours), capped by
 * QUERY_CONFIG.recentAlertsLimit. Used by the Dashboard feed.
 *
 * @param {(alerts: AlertObject[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToRecentAlerts(callback) {
    const since = new Date();
    since.setHours(since.getHours() - QUERY_CONFIG.recentWindowHours);

    const q = query(
        alertsCol(),
        where(AlertFields.timestamp, '>', Timestamp.fromDate(since)),
        orderBy(AlertFields.timestamp, 'desc'),
        limit(QUERY_CONFIG.recentAlertsLimit)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(parseAlert));
    });
}

/**
 * Real-time subscription to all map-visible alerts (no date filter).
 * Used when the map opens without any active filters.
 *
 * @param {(alerts: AlertObject[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToMapAlerts(callback) {
    const q = query(
        alertsCol(),
        orderBy(AlertFields.timestamp, 'desc'),
        limit(QUERY_CONFIG.mapFetchLimit)
    );

    return onSnapshot(q, (snapshot) => {
        callback(
            snapshot.docs
                .map(parseAlert)
                .filter((a) => a.shareLocation && a.location)
        );
    });
}

/**
 * Real-time subscription to map alerts WITH active filters.
 *
 * Server-side: timestamp range (single-field index — no composite index needed).
 * Client-side: alertType list and alertStatus.
 *
 * @param {{
 *   types:       string[],
 *   status:      string,
 *   dateRange:   string,
 *   customStart: Date|string|null,
 *   customEnd:   Date|string|null,
 * }} filters
 * @param {(alerts: AlertObject[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToMapAlertsFiltered(filters, callback) {
    const { types = [], status = 'all' } = filters;
    const { start, end } = resolveFilterDates(filters);

    const constraints = [
        ...timestampConstraints(start, end),
        orderBy(AlertFields.timestamp, 'desc'),
        ...(!start && !end ? [limit(QUERY_CONFIG.mapFetchLimit)] : []),
    ];

    return onSnapshot(
        query(alertsCol(), ...constraints),
        (snapshot) => {
            const base = snapshot.docs
                .map(parseAlert)
                .filter((a) => a.shareLocation && a.location);
            callback(applyClientFilters(base, types, status));
        },
        (error) => {
            console.error('[subscribeToMapAlertsFiltered]', error.message);
            callback([]);
        }
    );
}

/**
 * Real-time subscription to ALL alerts WITH active filters (Alerts page).
 * Same query strategy as subscribeToMapAlertsFiltered but without the
 * shareLocation restriction.
 *
 * @param {{
 *   types:       string[],
 *   status:      string,
 *   dateRange:   string,
 *   customStart: Date|string|null,
 *   customEnd:   Date|string|null,
 * }} filters
 * @param {(alerts: AlertObject[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToAlertsFiltered(filters, callback) {
    const { types = [], status = 'all' } = filters;
    const { start, end } = resolveFilterDates(filters);

    const constraints = [
        ...timestampConstraints(start, end),
        orderBy(AlertFields.timestamp, 'desc'),
        ...(!start && !end ? [limit(QUERY_CONFIG.alertsFetchLimit)] : []),
    ];

    return onSnapshot(
        query(alertsCol(), ...constraints),
        (snapshot) => {
            const base = snapshot.docs.map(parseAlert);
            callback(applyClientFilters(base, types, status));
        },
        (error) => {
            console.error('[subscribeToAlertsFiltered]', error.message);
            callback([]);
        }
    );
}

/**
 * One-shot fetch of the most recent alerts for a specific community.
 *
 * @param {string} communityId
 * @returns {Promise<AlertObject[]>}
 */
export async function getCommunityAlerts(communityId) {
    const q = query(
        alertsCol(),
        where(AlertFields.communityIds, 'array-contains', communityId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(parseAlert)
        .sort((a, b) => {
            const tA = a.timestamp?.toDate?.() ?? new Date(0);
            const tB = b.timestamp?.toDate?.() ?? new Date(0);
            return tB - tA;
        })
        .slice(0, QUERY_CONFIG.communityAlertsLimit);
}

/**
 * Compute aggregated statistics from recent alerts.
 * Derived from the same subscribeToRecentAlerts window.
 *
 * @returns {Promise<{
 *   total: number,
 *   byType: Record<string, number>,
 *   totalViews: number,
 *   totalForwards: number,
 *   totalReports: number,
 *   withLocation: number,
 * }>}
 */
export async function getAlertStats() {
    const alerts = await getRecentAlerts();

    return alerts.reduce(
        (acc, a) => {
            acc.total++;
            acc.byType[a.alertType] = (acc.byType[a.alertType] ?? 0) + 1;
            acc.totalViews    += a.viewedCount;
            acc.totalForwards += a.forwardsCount;
            acc.totalReports  += a.reportsCount;
            if (a.shareLocation && a.location) acc.withLocation++;
            return acc;
        },
        { total: 0, byType: {}, totalViews: 0, totalForwards: 0, totalReports: 0, withLocation: 0 }
    );
}
