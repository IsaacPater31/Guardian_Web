import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
    limit,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * AlertService — mirrors Flutter AlertRepository
 * Reads alerts from the 'alerts' Firestore collection.
 */

/**
 * Parse a Firestore document into an alert object.
 */
function parseAlert(doc) {
    const data = doc.data();
    return {
        id: doc.id,
        type: data.type || '',
        alertType: data.alertType || '',
        description: data.description || null,
        timestamp: data.timestamp,
        isAnonymous: data.isAnonymous || false,
        shareLocation: data.shareLocation || false,
        location: data.location || null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        imageBase64: data.imageBase64 || null,
        viewedCount: data.viewedCount || 0,
        viewedBy: data.viewedBy || [],
        communityId: data.community_id || null,
        forwardsCount: data.forwards_count || 0,
        reportsCount: data.reports_count || 0,
        reportedBy: data.reported_by || [],
        alertStatus: data.alert_status || 'pending',
    };
}

/** Build a Date range [start, end] from a preset key. */
function getDateRange(range) {
    const now = new Date();
    let start = null;
    let end = null;

    if (range === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (range === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
        end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    } else if (range === 'week') {
        // Current week (Monday – today)
        const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end = now;
    } else if (range === '7days') {
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = now;
    } else if (range === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = now;
    }

    return { start, end };
}

/**
 * Get recent alerts (last 24 hours), one-time fetch.
 */
export async function getRecentAlerts() {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const q = query(
        collection(db, 'alerts'),
        where('timestamp', '>', Timestamp.fromDate(yesterday)),
        orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(parseAlert);
}

/**
 * Get map alerts (recent with location).
 */
export async function getMapAlerts() {
    const q = query(
        collection(db, 'alerts'),
        orderBy('timestamp', 'desc'),
        limit(1000)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(parseAlert)
        .filter((alert) => alert.shareLocation && alert.location);
}

/**
 * Subscribe to real-time recent alerts (last 24 hours).
 * Returns an unsubscribe function.
 */
export function subscribeToRecentAlerts(callback) {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const q = query(
        collection(db, 'alerts'),
        where('timestamp', '>', Timestamp.fromDate(yesterday)),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(parseAlert);
        callback(alerts);
    });
}

/**
 * Subscribe to real-time map alerts (recent with location).
 */
export function subscribeToMapAlerts(callback) {
    const q = query(
        collection(db, 'alerts'),
        orderBy('timestamp', 'desc'),
        limit(1000)
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs
            .map(parseAlert)
            .filter((alert) => alert.shareLocation && alert.location);
        callback(alerts);
    });
}

/**
 * Subscribe to real-time map alerts WITH FILTERS.
 *
 * Mirrors Flutter AlertRepository.getMapAlertsStreamFiltered strategy exactly:
 *   - Single type  → where(alertType == X) + timestamp range server-side.
 *   - Multi types  → timestamp range server-side ONLY; types filtered client-side.
 *     (avoids composite index requirement — `in` + orderBy on different field
 *     requires a composite index in Firestore).
 *   - No type      → timestamp range (or recent window) server-side.
 *   - Status       → always client-side.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToMapAlertsFiltered(filters, callback) {
    const { types = [], status = 'all', dateRange = 'all', customStart = null, customEnd = null } = filters;

    const hasTypes  = types.length > 0;
    const hasDate   = dateRange !== 'all';
    const hasStatus = status !== 'all';

    // Resolve date window — only when the user explicitly picks a date filter
    let start = null;
    let end   = null;

    if (hasDate) {
        if (dateRange === 'custom') {
            start = customStart instanceof Date ? customStart : (customStart ? new Date(customStart) : null);
            end   = customEnd   instanceof Date ? customEnd   : (customEnd   ? new Date(customEnd)   : null);
        } else {
            ({ start, end } = getDateRange(dateRange));
        }
    }

    // ─── Server-side query: ONLY timestamp (single-field index, no composite needed) ───
    // alertType is ALWAYS filtered client-side to avoid composite index requirements.
    const constraints = [orderBy('timestamp', 'desc')];

    if (start) constraints.unshift(where('timestamp', '>=', Timestamp.fromDate(start)));
    if (end)   constraints.unshift(where('timestamp', '<=', Timestamp.fromDate(end)));

    // When no date restriction, cap the fetch to avoid reading the full collection
    if (!start && !end) constraints.push(limit(1000));

    const q = query(collection(db, 'alerts'), ...constraints);

    return onSnapshot(
        q,
        (snapshot) => {
            let alerts = snapshot.docs
                .map(parseAlert)
                .filter((a) => a.shareLocation && a.location);

            // Client-side: type filter (all cases)
            if (hasTypes) {
                alerts = alerts.filter((a) => types.includes(a.alertType));
            }

            // Client-side: status filter
            if (hasStatus) {
                alerts = alerts.filter((a) =>
                    status === 'attended'
                        ? a.alertStatus === 'attended'
                        : a.alertStatus !== 'attended'
                );
            }

            callback(alerts);
        },
        (error) => {
            console.error('[subscribeToMapAlertsFiltered] Firestore error:', error.message);
            callback([]);
        }
    );
}

/**
 * Subscribe to real-time alerts WITH FILTERS (Alerts page — no shareLocation filter).
 *
 * Mirrors the exact same query strategy as subscribeToMapAlertsFiltered:
 * - Single type  → equality on alertType + timestamp range server-side.
 * - Multi types  → timestamp range server-side ONLY; type filter client-side.
 * - Status       → always client-side.
 *
 * customStart/customEnd are ISO date strings ('YYYY-MM-DD') from the date inputs.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToAlertsFiltered(filters, callback) {
    const {
        types = [],
        status = 'all',
        dateRange = 'all',
        customStart = null,
        customEnd = null,
    } = filters;

    const hasTypes  = types.length > 0;
    const hasDate   = dateRange !== 'all';
    const hasStatus = status !== 'all';

    // Resolve date window — only when the user explicitly picks a date filter
    let start = null;
    let end   = null;

    if (hasDate) {
        if (dateRange === 'custom') {
            start = customStart ? new Date(customStart + 'T00:00:00') : null;
            end   = customEnd   ? new Date(customEnd   + 'T23:59:59') : null;
        } else {
            ({ start, end } = getDateRange(dateRange));
        }
    }

    // ─── Server-side query: ONLY timestamp (single-field index, no composite needed) ───
    // alertType is ALWAYS filtered client-side to avoid composite index requirements.
    const constraints = [orderBy('timestamp', 'desc')];

    if (start) constraints.unshift(where('timestamp', '>=', Timestamp.fromDate(start)));
    if (end)   constraints.unshift(where('timestamp', '<=', Timestamp.fromDate(end)));

    // When no date restriction, cap the fetch to avoid reading the full collection
    if (!start && !end) constraints.push(limit(500));

    const q = query(collection(db, 'alerts'), ...constraints);

    return onSnapshot(
        q,
        (snapshot) => {
            let alerts = snapshot.docs.map(parseAlert);

            // Client-side: type filter (all cases)
            if (hasTypes) {
                alerts = alerts.filter((a) => types.includes(a.alertType));
            }

            // Client-side: status filter
            if (hasStatus) {
                alerts = alerts.filter((a) =>
                    status === 'attended'
                        ? a.alertStatus === 'attended'
                        : a.alertStatus !== 'attended'
                );
            }

            callback(alerts);
        },
        (error) => {
            console.error('[subscribeToAlertsFiltered] Firestore error:', error.message);
            callback([]);
        }
    );
}

/**
 * Get alerts for a specific community.
 */
export async function getCommunityAlerts(communityId) {
    const q = query(
        collection(db, 'alerts'),
        where('community_id', '==', communityId)
    );

    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map(parseAlert);
    alerts.sort((a, b) => {
        const tA = a.timestamp?.toDate?.() || new Date(0);
        const tB = b.timestamp?.toDate?.() || new Date(0);
        return tB - tA;
    });
    return alerts.slice(0, 50);
}

/**
 * Get aggregated statistics.
 */
export async function getAlertStats() {
    const alerts = await getRecentAlerts();
    const stats = {
        total: alerts.length,
        byType: {},
        totalViews: 0,
        totalForwards: 0,
        totalReports: 0,
        withLocation: 0,
    };

    for (const alert of alerts) {
        stats.byType[alert.alertType] = (stats.byType[alert.alertType] || 0) + 1;
        stats.totalViews += alert.viewedCount;
        stats.totalForwards += alert.forwardsCount;
        stats.totalReports += alert.reportsCount;
        if (alert.shareLocation && alert.location) stats.withLocation++;
    }

    return stats;
}
