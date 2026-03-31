import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Building2, ArrowLeft, AlertTriangle, Shield, User } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getAllCommunities, getCommunityMembers } from '../services/communityService';
import { getCommunityAlerts } from '../services/alertService';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../data/emergencyTypes';
import AlertDetailModal from '../components/AlertDetailModal';

// ─── Role Helpers ─────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    admin: { label: 'Administrador', color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
    official: { label: 'Oficial', color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
    member: { label: 'Miembro', color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
};

function getRoleConfig(role) {
    return ROLE_CONFIG[role] || ROLE_CONFIG.member;
}

function getInitials(name, email) {
    if (name && name.trim()) {
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : '?';
}

function formatJoinDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({ member }) {
    const roleConf = getRoleConfig(member.role);
    const initials = getInitials(member.displayName, member.email);
    const name = member.displayName || member.email || 'Usuario';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 0',
            borderBottom: '1px solid var(--color-border)',
        }}>
            {/* Avatar */}
            <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${roleConf.color}CC, ${roleConf.color}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em',
            }}>
                {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, fontSize: 14,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {name}
                </div>
                {member.email && (
                    <div style={{
                        fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {member.email}
                    </div>
                )}
            </div>

            {/* Role badge */}
            <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: roleConf.bg, color: roleConf.color,
                flexShrink: 0, letterSpacing: '0.02em',
            }}>
                {roleConf.label}
            </span>

            {/* Join date */}
            <span style={{
                fontSize: 11, color: 'var(--color-text-tertiary)',
                flexShrink: 0, minWidth: 80, textAlign: 'right',
            }}>
                {formatJoinDate(member.joinedAt)}
            </span>
        </div>
    );
}

function AlertBubble({ alert, onClick }) {
    const color = getAlertColor(alert.alertType);
    const iconName = getAlertIcon(alert.alertType);
    const Icon = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const label = getAlertLabel(alert.alertType);

    return (
        <div
            onClick={() => onClick(alert)}
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `4px solid ${color}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px', marginBottom: 10,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                        {label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {alert.isAnonymous
                            ? 'Anónimo'
                            : alert.userName || 'Usuario'
                        } · {getTimeAgo(alert.timestamp)}
                    </div>
                </div>
            </div>
            {alert.description && (
                <p style={{
                    margin: '8px 0 0', fontSize: 13,
                    color: 'var(--color-text-secondary)', lineHeight: 1.5,
                }}>
                    {alert.description}
                </p>
            )}
        </div>
    );
}

// ─── CommunityDetailPage ──────────────────────────────────────────────────────
export default function CommunityDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [community, setCommunity] = useState(null);
    const [members, setMembers] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'members'
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);

    const load = useCallback(async () => {
        try {
            const [allComms, memberList, alertList] = await Promise.all([
                getAllCommunities(),
                getCommunityMembers(id),
                getCommunityAlerts(id),
            ]);
            const found = allComms.find(c => c.id === id);
            setCommunity(found || null);
            setMembers(memberList);
            setAlerts(alertList);
        } catch (err) {
            console.error('Error loading community detail:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Users /></div>
                <div className="empty-state-title">Comunidad no encontrada</div>
                <div className="empty-state-desc">
                    <button onClick={() => navigate('/communities')} style={{
                        marginTop: 8, background: 'none', border: 'none',
                        color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600,
                    }}>
                        ← Volver a comunidades
                    </button>
                </div>
            </div>
        );
    }

    const iconColor = community.iconColor || '#6366F1';

    const tabStyle = (key) => ({
        flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-family)', fontSize: 14, fontWeight: 600,
        borderBottom: activeTab === key
            ? `2px solid ${iconColor}`
            : '2px solid transparent',
        color: activeTab === key ? iconColor : 'var(--color-text-secondary)',
        background: 'var(--color-surface)',
        transition: 'color 0.2s, border-color 0.2s',
    });

    return (
        <>
            {/* Header card */}
            <div className="section" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => navigate('/communities')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text-secondary)', display: 'flex',
                            alignItems: 'center', gap: 4, fontSize: 13,
                            padding: '6px 0', fontFamily: 'var(--font-family)',
                        }}
                    >
                        <ArrowLeft style={{ width: 15, height: 15 }} />
                        Comunidades
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                        background: iconColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {community.isEntity
                            ? <Building2 style={{ width: 28, height: 28, color: 'white' }} />
                            : <Users style={{ width: 28, height: 28, color: 'white' }} />
                        }
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: 20, fontWeight: 800,
                            color: 'var(--color-text-primary)',
                            margin: 0, letterSpacing: '-0.02em',
                        }}>
                            {community.name}
                        </h2>
                        {community.isEntity && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                            }}>
                                Entidad oficial
                            </span>
                        )}
                        {community.description && (
                            <p style={{
                                margin: '4px 0 0', fontSize: 13,
                                color: 'var(--color-text-secondary)',
                            }}>
                                {community.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'flex', gap: 24, marginTop: 20,
                    paddingTop: 16, borderTop: '1px solid var(--color-border)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {members.length}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                            Miembros
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {alerts.length}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                            Alertas
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="section">
                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
                    <button style={tabStyle('alerts')} onClick={() => setActiveTab('alerts')}>
                        <AlertTriangle style={{ width: 14, height: 14, display: 'inline', marginRight: 6 }} />
                        Alertas ({alerts.length})
                    </button>
                    <button style={tabStyle('members')} onClick={() => setActiveTab('members')}>
                        <User style={{ width: 14, height: 14, display: 'inline', marginRight: 6 }} />
                        Miembros ({members.length})
                    </button>
                </div>

                <div className="section-body">
                    {/* ── Alerts tab ── */}
                    {activeTab === 'alerts' && (
                        alerts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><AlertTriangle /></div>
                                <div className="empty-state-title">Sin alertas</div>
                                <div className="empty-state-desc">Esta comunidad no tiene alertas registradas.</div>
                            </div>
                        ) : (
                            alerts.map(a => (
                                <AlertBubble key={a.id} alert={a} onClick={setSelectedAlert} />
                            ))
                        )
                    )}

                    {/* ── Members tab ── */}
                    {activeTab === 'members' && (
                        members.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><Users /></div>
                                <div className="empty-state-title">Sin miembros</div>
                                <div className="empty-state-desc">No se encontraron miembros en esta comunidad.</div>
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto',
                                    gap: '0 12px',
                                    padding: '4px 0 8px',
                                    borderBottom: '2px solid var(--color-border)',
                                    fontSize: 11, fontWeight: 700,
                                    color: 'var(--color-text-tertiary)',
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                }}>
                                    <span>Miembro</span>
                                    <span>Rol</span>
                                    <span>Se unió</span>
                                </div>
                                {members.map(m => (
                                    <MemberRow key={m.id} member={m} />
                                ))}
                            </div>
                        )
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
