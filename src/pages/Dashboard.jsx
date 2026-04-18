import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Eye,
    Forward,
    Users,
    MapPin,
    TrendingUp,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { subscribeToRecentAlerts, getAlertStats } from '../services/alertService';
import { EMERGENCY_TYPES, getAlertColor, getAlertLabel } from '../data/emergencyTypes';
import AlertCard from '../components/AlertCard';
import AlertDetailModal from '../components/AlertDetailModal';

export default function Dashboard() {
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
        const unsub = subscribeToRecentAlerts((data) => {
            setAlerts(data);
            setLoading(false);

            // Compute stats from the live data
            const s = {
                total: data.length,
                byType: {},
                totalViews: 0,
                totalForwards: 0,
                withLocation: 0,
            };
            for (const a of data) {
                s.byType[a.alertType] = (s.byType[a.alertType] || 0) + 1;
                s.totalViews += a.viewedCount;
                s.totalForwards += a.forwardsCount;
                if (a.shareLocation && a.location) s.withLocation++;
            }
            setStats(s);
        });

        return unsub;
    }, []);

    // Get unique community IDs from alerts (supports multi-community alerts)
    const communityIds = new Set(alerts.flatMap((a) => a.communityIds ?? (a.communityId ? [a.communityId] : [])));

    const statCards = [
        {
            label: 'Alertas (24h)',
            value: stats?.total ?? '—',
            icon: AlertTriangle,
            color: '#FF3B30',
            bg: 'rgba(255, 59, 48, 0.08)',
        },
        {
            label: 'Vistas totales',
            value: stats?.totalViews ?? '—',
            icon: Eye,
            color: '#007AFF',
            bg: 'rgba(0, 122, 255, 0.08)',
        },
        {
            label: 'Reenvíos',
            value: stats?.totalForwards ?? '—',
            icon: Forward,
            color: '#6366F1',
            bg: 'rgba(99, 102, 241, 0.08)',
        },
        {
            label: 'Con ubicación',
            value: stats?.withLocation ?? '—',
            icon: MapPin,
            color: '#34C759',
            bg: 'rgba(52, 199, 89, 0.08)',
        },
    ];

    // Build sorted type distribution
    const typeEntries = stats?.byType
        ? Object.entries(stats.byType).sort((a, b) => b[1] - a[1])
        : [];
    const maxCount = typeEntries.length > 0 ? typeEntries[0][1] : 1;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <>
            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((s) => (
                    <div
                        key={s.label}
                        className="stat-card"
                        style={{ '--stat-accent': s.color }}
                    >
                        <div className="stat-card-header">
                            <div
                                className="stat-card-icon"
                                style={{ background: s.bg }}
                            >
                                <s.icon style={{ color: s.color }} />
                            </div>
                        </div>
                        <div className="stat-card-value">{s.value}</div>
                        <div className="stat-card-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Recent Alerts */}
                <div className="section" style={{ gridColumn: typeEntries.length > 0 ? '1' : '1 / -1' }}>
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(0, 122, 255, 0.08)' }}>
                                <AlertTriangle style={{ color: '#007AFF' }} />
                            </div>
                            <h3 className="section-title">Alertas recientes</h3>
                        </div>
                        {alerts.length > 0 && (
                            <span
                                className="section-badge"
                                style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                            >
                                {alerts.length}
                            </span>
                        )}
                    </div>
                    <div className="section-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {alerts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">
                                    <AlertTriangle />
                                </div>
                                <div className="empty-state-title">Sin alertas recientes</div>
                                <div className="empty-state-desc">
                                    No hay alertas en las últimas 24 horas.
                                </div>
                            </div>
                        ) : (
                            alerts.slice(0, 10).map((alert) => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert}
                                    onClick={setSelectedAlert}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Type Distribution */}
                {typeEntries.length > 0 && (
                    <div className="section">
                        <div className="section-header">
                            <div className="section-header-left">
                                <div className="section-icon" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                                    <TrendingUp style={{ color: '#6366F1' }} />
                                </div>
                                <h3 className="section-title">Distribución por tipo</h3>
                            </div>
                        </div>
                        <div className="section-body">
                            <div className="type-distribution">
                                {typeEntries.map(([type, count]) => (
                                    <div key={type} className="type-bar">
                                        <div
                                            className="type-bar-dot"
                                            style={{ background: getAlertColor(type) }}
                                        />
                                        <span className="type-bar-label">{getAlertLabel(type)}</span>
                                        <div className="type-bar-track">
                                            <div
                                                className="type-bar-fill"
                                                style={{
                                                    width: `${(count / maxCount) * 100}%`,
                                                    background: getAlertColor(type),
                                                }}
                                            />
                                        </div>
                                        <span className="type-bar-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedAlert && (
                <AlertDetailModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </>
    );
}
