import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
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
    };
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
 * Get map alerts (last 7 days with location).
 */
export async function getMapAlerts() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
        collection(db, 'alerts'),
        where('timestamp', '>', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('timestamp', 'desc')
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
 * Subscribe to real-time map alerts (last 7 days with location).
 */
export function subscribeToMapAlerts(callback) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
        collection(db, 'alerts'),
        where('timestamp', '>', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs
            .map(parseAlert)
            .filter((alert) => alert.shareLocation && alert.location);
        callback(alerts);
    });
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
