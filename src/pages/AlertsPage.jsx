import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { subscribeToRecentAlerts } from '../services/alertService';
import { EMERGENCY_TYPES, getAlertColor, getAlertLabel } from '../data/emergencyTypes';
import AlertCard from '../components/AlertCard';
import AlertDetailModal from '../components/AlertDetailModal';
import { Filter } from 'lucide-react';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => {
        const unsub = subscribeToRecentAlerts((data) => {
            setAlerts(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    // Filter alerts
    const filteredAlerts = activeFilter === 'ALL'
        ? alerts
        : alerts.filter((a) => a.alertType === activeFilter);

    // Get types that exist in current data
    const existingTypes = [...new Set(alerts.map((a) => a.alertType))];

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <>
            {/* Filter Bar */}
            <div className="filter-bar">
                <Filter style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
                <button
                    className={`filter-chip${activeFilter === 'ALL' ? ' active' : ''}`}
                    style={activeFilter === 'ALL' ? { background: 'var(--color-sidebar)', color: 'white' } : {}}
                    onClick={() => setActiveFilter('ALL')}
                >
                    Todas ({alerts.length})
                </button>
                {existingTypes.map((type) => {
                    const color = getAlertColor(type);
                    const count = alerts.filter((a) => a.alertType === type).length;
                    return (
                        <button
                            key={type}
                            className={`filter-chip${activeFilter === type ? ' active' : ''}`}
                            style={activeFilter === type ? { background: color } : {}}
                            onClick={() => setActiveFilter(type)}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: activeFilter === type ? 'white' : color,
                                    display: 'inline-block',
                                }}
                            />
                            {getAlertLabel(type)} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Alerts List */}
            <div className="section">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(255, 59, 48, 0.08)' }}>
                            <LucideIcons.AlertTriangle style={{ color: '#FF3B30' }} />
                        </div>
                        <h3 className="section-title">
                            {activeFilter === 'ALL' ? 'Todas las alertas' : getAlertLabel(activeFilter)}
                        </h3>
                    </div>
                    <span
                        className="section-badge"
                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}
                    >
                        {filteredAlerts.length}
                    </span>
                </div>
                <div className="section-body">
                    {filteredAlerts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <LucideIcons.CheckCircle />
                            </div>
                            <div className="empty-state-title">Sin alertas</div>
                            <div className="empty-state-desc">
                                No hay alertas que coincidan con el filtro seleccionado.
                            </div>
                        </div>
                    ) : (
                        filteredAlerts.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onClick={setSelectedAlert}
                            />
                        ))
                    )}
                </div>
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
