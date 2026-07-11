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
    doc, updateDoc, startAfter,
} from 'firebase/firestore';
import { ALERTS_LIST_PAGE_SIZE } from '../config/adminPagination';

import { db } from '../firebase';
import { Collections }                from '../config/collections';
import {
    AlertFields,
    AlertStatus,
    QUERY_CONFIG,
    normalizeAlertType,
    normalizeFilterTypes,
} from '../config/alertTypes';
import { resolveFilterDates }         from '../utils/dateRangeUtils';

// ─── Document parser ──────────────────────────────────────────────────────────

/**
 * Transform a raw Firestore DocumentSnapshot into a plain alert JS object.
 * This is the only place that knows about Firestore field names.
 *
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {AlertObject}
 */
/** Exported for admin analytics — single parser for Firestore alert docs. */
export function parseAlert(doc) {
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

    // Paridad Guardian `AlertModel.fromFirestore` + `AlertTypeNormalize`.
    const flowType = d[AlertFields.type] || '';
    const subtype = d[AlertFields.subtype] ?? d.subType ?? d.sub_type ?? null;
    const customDetail = d[AlertFields.customDetail] ?? d.customDetail ?? d.custom_detail ?? null;
    const alertType = normalizeAlertType(d[AlertFields.alertType] || '', flowType);

    return {
        id:           doc.id,
        type:         flowType,
        alertType,
        alertTypeLabel: d.alertTypeLabel ?? d.alert_type_label ?? null,
        alertTypeColor: d.alertTypeColor ?? d.alert_type_color ?? null,
        alertTypeIconCodePoint:
            d.alertTypeIconCodePoint ?? d.alert_type_icon_code_point ?? null,
        description:  d[AlertFields.description]   ?? null,
        subtype,
        customDetail,
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

/** Firestore `where` por `alertType` — solo claves canónicas (casa, vial, …). */
function firestoreTypeConstraints(canonicalTypes) {
    if (!canonicalTypes?.length) return [];
    const expandedTypes = new Set(canonicalTypes);
    // Mobile quick alerts may persist as HEALTH but normalize to URGENCY in web.
    if (expandedTypes.has('URGENCY')) expandedTypes.add('HEALTH');
    // Keep compatibility with mixed datasets where urgency may already be URGENCY.
    if (expandedTypes.has('HEALTH')) expandedTypes.add('URGENCY');
    const queryTypes = [...expandedTypes];
    if (queryTypes.length === 1) {
        return [where(AlertFields.alertType, '==', queryTypes[0])];
    }
    if (queryTypes.length <= 10) {
        return [where(AlertFields.alertType, 'in', queryTypes)];
    }
    return [];
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
    const canonicalTypes = normalizeFilterTypes(types);
    if (canonicalTypes.length > 0) {
        result = result.filter((a) => canonicalTypes.includes(a.alertType));
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

/**
 * Resolve alert timestamp (Firestore Timestamp | Date | number) to millis.
 *
 * @param {AlertObject} alert
 * @returns {number}
 */
function alertTimeMs(alert) {
    const raw = alert?.timestamp;
    if (!raw) return 0;
    if (typeof raw.toDate === 'function') return raw.toDate().getTime();
    if (raw instanceof Date) return raw.getTime();
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

/** All alerts, newest first (map side panel list). */
export function sortAlertsNewestFirst(alerts) {
    return (alerts ?? [])
        .slice()
        .sort((a, b) => alertTimeMs(b) - alertTimeMs(a));
}

/** Pending alerts, newest first. */
export function sortPendingAlertsNewestFirst(alerts) {
    return (alerts ?? [])
        .filter((a) => a.alertStatus !== AlertStatus.ATTENDED)
        .slice()
        .sort((a, b) => alertTimeMs(b) - alertTimeMs(a));
}

/**
 * Newest pending alert among Firestore docChanges (added/modified).
 * @param {AlertObject[]} alerts
 * @param {string[]} changedIds
 * @returns {AlertObject|null}
 */
export function findNewestPendingAmongChanges(alerts, changedIds) {
    if (!Array.isArray(changedIds) || changedIds.length === 0) return null;
    const idSet = new Set(changedIds);
    const pool = (alerts ?? []).filter(
        (a) => idSet.has(a.id) && a.alertStatus !== AlertStatus.ATTENDED
    );
    if (pool.length === 0) return null;
    return pool.reduce(
        (latest, current) =>
            alertTimeMs(current) > alertTimeMs(latest) ? current : latest,
        pool[0]
    );
}

/** True when [alert] is the latest non-attended alert in the feed. */
export function isActivePendingAlert(alert, latestPendingAlertId) {
    if (!alert?.id || !latestPendingAlertId) return false;
    if (alert.alertStatus === AlertStatus.ATTENDED) return false;
    return alert.id === latestPendingAlertId;
}

/** Latest pending (not attended) alert id — the active community alert. */
export function resolveLatestPendingAlertId(alerts) {
    const pending = (alerts ?? []).filter(
        (a) => a.alertStatus !== AlertStatus.ATTENDED
    );
    if (pending.length === 0) return null;
    return pending.reduce(
        (latest, current) =>
            alertTimeMs(current) > alertTimeMs(latest) ? current : latest,
        pending[0]
    ).id;
}

/**
 * Suscripción con filtros; intenta `alertType` en servidor (nombres canónicos).
 * Si falla el índice compuesto, reintenta sin filtro de tipo y filtra en cliente.
 *
 * @param {object} filters
 * @param {(alerts: AlertObject[]) => void} callback
 * @param {{ mapOnly?: boolean, fetchLimit?: number }} options
 */
function subscribeAlertsFiltered(filters, callback, options = {}) {
    const { types = [], status = 'all' } = filters;
    const canonicalTypes = normalizeFilterTypes(types);
    const { start, end } = resolveFilterDates(filters);
    const fetchLimit = options.fetchLimit ?? QUERY_CONFIG.alertsFetchLimit;
    let unsub = () => {};
    let serverTypeFilterFailed = false;

    const buildQuery = (useServerTypeFilter) => {
        const constraints = [
            ...timestampConstraints(start, end),
            ...(useServerTypeFilter ? firestoreTypeConstraints(canonicalTypes) : []),
            orderBy(AlertFields.timestamp, 'desc'),
        ];
        if (!start && !end && !useServerTypeFilter) {
            constraints.push(limit(fetchLimit));
        }
        return query(alertsCol(), ...constraints);
    };

    const attach = (useServerTypeFilter) => {
        unsub();
        unsub = onSnapshot(
            buildQuery(useServerTypeFilter),
            (snapshot) => {
                let base = snapshot.docs.map(parseAlert);
                if (options.mapOnly) {
                    base = base.filter((a) => a.shareLocation && a.location);
                }
                const filtered = applyClientFilters(base, types, status);
                const latestContextAlertId = resolveLatestPendingAlertId(filtered);
                const changedIds = snapshot
                    .docChanges()
                    .filter((change) => change.type === 'added' || change.type === 'modified')
                    .map((change) => change.doc.id);

                callback(filtered, { latestContextAlertId, changedIds });
            },
            (error) => {
                if (useServerTypeFilter && canonicalTypes.length > 0 && !serverTypeFilterFailed) {
                    serverTypeFilterFailed = true;
                    console.warn(
                        '[alertService] Server alertType filter failed; using client-side type filter',
                        error.message
                    );
                    attach(false);
                    return;
                }
                console.error('[alertService] subscribeAlertsFiltered', error.message);
                callback([], { latestContextAlertId: null, changedIds: [] });
            }
        );
    };

    attach(canonicalTypes.length > 0);
    return () => unsub();
}

const ALERTS_PAGE_MAX_SCAN_BATCHES = 10;

function alertMatchesClientFilters(alert, types, status) {
    return applyClientFilters([alert], types, status).length > 0;
}

/**
 * Una página de alertas alineada con los filtros activos.
 * Si hace falta filtrar en cliente (estado / tipo), avanza en lotes hasta
 * completar la página o agotar resultados.
 *
 * @param {object} filters — mismos filtros que {@link subscribeToAlertsFiltered}
 * @param {{ pageSize?: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot | null }} [opts]
 * @returns {Promise<{ items: AlertObject[], lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null, hasMore: boolean }>}
 */
async function fetchAlertsPageOnce(filters, useServerTypeFilter, pageSize, cursor) {
    const { types = [], status = 'all' } = filters;
    const canonicalTypes = normalizeFilterTypes(types);
    const { start, end } = resolveFilterDates(filters);

    const needsClientFilter =
        status !== 'all' || (canonicalTypes.length > 0 && !useServerTypeFilter);

    const buildConstraints = (afterCursor) => {
        const constraints = [
            ...timestampConstraints(start, end),
            ...(useServerTypeFilter ? firestoreTypeConstraints(canonicalTypes) : []),
            orderBy(AlertFields.timestamp, 'desc'),
        ];
        if (afterCursor) constraints.push(startAfter(afterCursor));
        return constraints;
    };

    if (!needsClientFilter) {
        const constraints = buildConstraints(cursor);
        constraints.push(limit(pageSize));
        const snapshot = await getDocs(query(alertsCol(), ...constraints));
        const items = snapshot.docs.map(parseAlert);
        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
        return {
            items,
            lastDoc,
            hasMore: snapshot.docs.length === pageSize,
        };
    }

    const displayed = [];
    let scanCursor = cursor;
    let lastDocForPagination = cursor;
    let hasMoreInDb = true;
    let stoppedMidBatch = false;

    for (
        let batch = 0;
        batch < ALERTS_PAGE_MAX_SCAN_BATCHES && displayed.length < pageSize && hasMoreInDb;
        batch += 1
    ) {
        const constraints = buildConstraints(scanCursor);
        constraints.push(limit(pageSize));
        const snapshot = await getDocs(query(alertsCol(), ...constraints));

        if (snapshot.empty) {
            hasMoreInDb = false;
            break;
        }

        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 1) {
            const docSnap = docs[i];
            const alert = parseAlert(docSnap);
            if (!alertMatchesClientFilters(alert, types, status)) continue;

            displayed.push(alert);
            lastDocForPagination = docSnap;

            if (displayed.length >= pageSize) {
                stoppedMidBatch = i < docs.length - 1;
                break;
            }
        }

        scanCursor = docs[docs.length - 1];
        if (docs.length < pageSize) hasMoreInDb = false;
    }

    return {
        items: displayed,
        lastDoc: displayed.length > 0 ? lastDocForPagination : scanCursor,
        hasMore: displayed.length === pageSize && (stoppedMidBatch || hasMoreInDb),
    };
}

export async function fetchAlertsPage(
    filters,
    { pageSize = ALERTS_LIST_PAGE_SIZE, cursor = null } = {},
) {
    const canonicalTypes = normalizeFilterTypes(filters?.types);
    try {
        if (canonicalTypes.length > 0) {
            return await fetchAlertsPageOnce(filters, true, pageSize, cursor);
        }
        return await fetchAlertsPageOnce(filters, false, pageSize, cursor);
    } catch (error) {
        if (canonicalTypes.length > 0) {
            console.warn('[alertService] fetchAlertsPage fallback:', error.message);
            return fetchAlertsPageOnce(filters, false, pageSize, cursor);
        }
        throw error;
    }
}

/**
 * Id de la última alerta pendiente (ventana acotada) para el indicador «activa».
 * @param {number} [scanLimit=40]
 * @returns {Promise<string|null>}
 */
export async function fetchActivePendingAlertId(scanLimit = 40) {
    const snapshot = await getDocs(
        query(alertsCol(), orderBy(AlertFields.timestamp, 'desc'), limit(scanLimit)),
    );
    return resolveLatestPendingAlertId(snapshot.docs.map(parseAlert));
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
    return subscribeAlertsFiltered(filters, callback, {
        mapOnly: true,
        fetchLimit: QUERY_CONFIG.mapFetchLimit,
    });
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
    return subscribeAlertsFiltered(filters, callback, {
        mapOnly: false,
        fetchLimit: QUERY_CONFIG.alertsFetchLimit,
    });
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
        .sort((a, b) => alertTimeMs(b) - alertTimeMs(a))
        .slice(0, QUERY_CONFIG.communityAlertsLimit);
}

/**
 * Real-time subscription to alerts for a specific community.
 * @param {string} communityId
 * @param {(alerts: AlertObject[]) => void} callback
 * @returns {() => void}
 */
export function subscribeToCommunityAlerts(communityId, callback) {
    const q = query(
        alertsCol(),
        where(AlertFields.communityIds, 'array-contains', communityId),
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const alerts = snapshot.docs
                .map(parseAlert)
                .sort((a, b) => alertTimeMs(b) - alertTimeMs(a))
                .slice(0, QUERY_CONFIG.communityAlertsLimit);
            callback(alerts);
        },
        (error) => {
            console.error('[alertService] subscribeToCommunityAlerts', error.message);
            callback([]);
        },
    );
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

/**
 * Alertas en un rango de fechas (panel admin / analítica).
 * Si falla la consulta compuesta, reintenta solo con límite inferior.
 */
/**
 * Marca una alerta como atendida (solo ida; no se puede volver a pending desde web).
 * @param {string} alertId
 * @param {'attended'|string} status — solo se acepta `attended` / AlertStatus.ATTENDED
 */
export async function updateAlertStatus(alertId, status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized !== AlertStatus.ATTENDED && normalized !== 'attended') {
        throw new Error('Desde el panel web solo se puede marcar una alerta como atendida.');
    }
    if (!alertId) {
        throw new Error('Falta el id de la alerta');
    }
    const ref = doc(db, Collections.ALERTS, alertId);
    await updateDoc(ref, { [AlertFields.alertStatus]: AlertStatus.ATTENDED });
}

export async function fetchAlertsInDateRange(start, end, maxDocs = 2000) {
    const tryQuery = async (constraints) => {
        const q = query(alertsCol(), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(parseAlert);
    };

    try {
        return await tryQuery([
            where(AlertFields.timestamp, '>=', Timestamp.fromDate(start)),
            where(AlertFields.timestamp, '<=', Timestamp.fromDate(end)),
            orderBy(AlertFields.timestamp, 'desc'),
            limit(maxDocs),
        ]);
    } catch (e) {
        console.warn('[fetchAlertsInDateRange] fallback:', e?.message);
        return tryQuery([
            where(AlertFields.timestamp, '>=', Timestamp.fromDate(start)),
            orderBy(AlertFields.timestamp, 'desc'),
            limit(maxDocs),
        ]).then((alerts) =>
            alerts.filter((a) => {
                const t = a.timestamp?.toDate?.() ?? new Date(0);
                return t <= end;
            })
        );
    }
}

/**
 * Real-time subscription for alerts in an arbitrary date range.
 * Compatible with Spark: uses only client Firestore listeners.
 *
 * @param {Date} start
 * @param {Date} end
 * @param {(alerts: AlertObject[], meta: { latestContextAlertId: string|null, changedIds: string[] }) => void} callback
 * @param {number} [maxDocs=2000]
 * @returns {() => void}
 */
export function subscribeToAlertsInDateRange(start, end, callback, maxDocs = 2000) {
    const build = ({ withUpperBound }) => {
        const constraints = [
            where(AlertFields.timestamp, '>=', Timestamp.fromDate(start)),
            orderBy(AlertFields.timestamp, 'desc'),
            limit(maxDocs),
        ];
        if (withUpperBound) {
            constraints.splice(1, 0, where(AlertFields.timestamp, '<=', Timestamp.fromDate(end)));
        }
        return query(alertsCol(), ...constraints);
    };

    let unsub = () => {};
    let fallbackApplied = false;

    const attach = (withUpperBound) => {
        unsub();
        unsub = onSnapshot(
            build({ withUpperBound }),
            (snapshot) => {
                let alerts = snapshot.docs.map(parseAlert);
                if (!withUpperBound) {
                    alerts = alerts.filter((a) => alertTimeMs(a) <= end.getTime());
                }
                const latestContextAlertId = resolveLatestPendingAlertId(alerts);
                const changedIds = snapshot
                    .docChanges()
                    .filter((change) => change.type === 'added' || change.type === 'modified')
                    .map((change) => change.doc.id);
                callback(alerts, { latestContextAlertId, changedIds });
            },
            (error) => {
                if (withUpperBound && !fallbackApplied) {
                    fallbackApplied = true;
                    console.warn('[alertService] subscribeToAlertsInDateRange fallback:', error.message);
                    attach(false);
                    return;
                }
                console.error('[alertService] subscribeToAlertsInDateRange', error.message);
                callback([], { latestContextAlertId: null, changedIds: [] });
            }
        );
    };

    attach(true);
    return () => unsub();
}
