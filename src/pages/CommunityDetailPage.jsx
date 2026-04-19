import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Building2, ArrowLeft, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getAllCommunities, getCommunityMembers } from '../services/communityService';
import { getCommunityAlerts } from '../services/alertService';
import { getAlertColor, getAlertIcon, getAlertLabel, getTimeAgo } from '../data/emergencyTypes';
import AlertDetailModal from '../components/AlertDetailModal';
import { getSubtypeLabel } from '../utils/alertSubtype';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    admin:    { label: 'Admin',    color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
    official: { label: 'Oficial',  color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
    member:   { label: 'Miembro',  color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
};
function getRoleConf(role) { return ROLE_CONFIG[role] || ROLE_CONFIG.member; }

function getInitials(name, email) {
    if (name?.trim()) {
        const p = name.trim().split(' ');
        return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
    }
    return email?.[0]?.toUpperCase() ?? '?';
}

function fmtDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ value, label, color = 'var(--color-text-primary)' }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '14px 24px', background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)', minWidth: 90,
        }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        </div>
    );
}

// ─── Alert Row (premium card) ─────────────────────────────────────────────────
function AlertRow({ alert, onClick }) {
    const color = getAlertColor(alert.alertType);
    const iconName = getAlertIcon(alert.alertType);
    const Icon = LucideIcons[iconName] || LucideIcons.AlertTriangle;
    const main = getAlertLabel(alert.alertType);
    const sub = getSubtypeLabel(alert.alertType, alert.subtype, alert.customDetail, true);

    return (
        <div
            onClick={() => onClick(alert)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            {/* Icon badge */}
            <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon style={{ width: 19, height: 19, color }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                            display: 'block', fontWeight: 700, fontSize: 14.5,
                            color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
                        }}>{main}</span>
                        {sub ? (
                            <span style={{
                                display: 'block', fontSize: 12, fontWeight: 700,
                                color: 'var(--color-text-primary)', marginTop: 4,
                            }}>
                                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700 }}>→ </span>
                                {sub}
                            </span>
                        ) : null}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{getTimeAgo(alert.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 999,
                        background: alert.isAnonymous ? 'rgba(0,0,0,0.06)' : 'rgba(52,199,89,0.12)',
                        color: alert.isAnonymous ? 'var(--color-text-secondary)' : '#1a7f37',
                        border: `1px solid ${alert.isAnonymous ? 'var(--color-border)' : 'rgba(52,199,89,0.35)'}`,
                    }}>
                        {alert.isAnonymous ? 'Anónima' : 'Identificada'}
                    </span>
                </div>
                {alert.description ? (
                    <p style={{
                        fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '6px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{alert.description}</p>
                ) : (
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '6px 0 0', fontStyle: 'italic' }}>
                        {alert.isAnonymous ? 'Reporte anónimo' : (alert.userName || 'Usuario')}
                    </p>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <ChevronRight style={{ width: 15, height: 15, color: 'var(--color-text-tertiary)' }} />
            </div>
        </div>
    );
}

// ─── Member Row ────────────────────────────────────────────────────────────────
function MemberRow({ member, iconColor, compact = false }) {
    const rc = getRoleConf(member.role);
    const resolvedName = member.displayName || member.fullName || member.name || member.username || member.email || 'Miembro';
    const initials = getInitials(resolvedName, member.email);
    const name = resolvedName;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 20px',
            borderBottom: '1px solid var(--color-border)',
            transition: 'background var(--transition-fast)',
        }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            {/* Avatar */}
            <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${iconColor}CC 0%, ${iconColor}66 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em',
                boxShadow: `0 2px 8px ${iconColor}40`,
            }}>
                {initials}
            </div>

            {/* Name + email */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, fontSize: 13.5, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{name}</div>
                {member.email && (
                    <div style={{
                        fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{member.email}</div>
                )}
            </div>

            {/* Role + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: rc.bg, color: rc.color,
                    letterSpacing: '0.02em',
                }}>{rc.label}</span>
                {!compact && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', minWidth: 80, textAlign: 'right' }}>
                        {fmtDate(member.joinedAt)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc }) {
    const IconComponent = icon;
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '56px 24px', gap: 12,
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'var(--color-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <IconComponent style={{ width: 26, height: 26, color: 'var(--color-text-tertiary)' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>{title}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', maxWidth: 280 }}>{desc}</span>
        </div>
    );
}

// ─── CommunityDetailPage ───────────────────────────────────────────────────────
export default function CommunityDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [community, setCommunity] = useState(null);
    const [members, setMembers] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activeTab, setActiveTab] = useState('alerts');
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isCompact, setIsCompact] = useState(window.matchMedia('(max-width: 480px)').matches);
    const alertsScrollRef = useRef(null);
    const displayAlerts = useMemo(
        () => [...alerts].sort((a, b) => {
            const tA = a.timestamp?.toDate?.() ?? new Date(0);
            const tB = b.timestamp?.toDate?.() ?? new Date(0);
            return tA - tB;
        }),
        [alerts],
    );

    const load = useCallback(async () => {
        try {
            const [allComms, memberList, alertList] = await Promise.all([
                getAllCommunities(),
                getCommunityMembers(id),
                getCommunityAlerts(id),
            ]);
            setCommunity(allComms.find(c => c.id === id) || null);
            setMembers(memberList);
            setAlerts(alertList);
        } catch (err) {
            console.error('Error loading community:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (activeTab !== 'alerts') return;
        const el = alertsScrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [activeTab, displayAlerts]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 480px)');
        const handler = (e) => setIsCompact(e.matches);
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, []);

    if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;

    if (!community) return (
        <EmptyState icon={Users} title="Comunidad no encontrada" desc="El enlace puede haber cambiado." />
    );

    const iconColor = community.iconColor || '#6366F1';

    // ── Tab underline helper ──
    const tabBtn = (key, label, count) => {
        const active = activeTab === key;
        return (
            <button onClick={() => setActiveTab(key)} style={{
                padding: '14px 20px', border: 'none', background: 'transparent',
                fontFamily: 'var(--font-family)', fontSize: 13.5, fontWeight: active ? 700 : 500,
                color: active ? iconColor : 'var(--color-text-tertiary)',
                borderBottom: active ? `2px solid ${iconColor}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                {label}
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px',
                    borderRadius: 'var(--radius-full)',
                    background: active ? `${iconColor}18` : 'var(--color-bg)',
                    color: active ? iconColor : 'var(--color-text-tertiary)',
                    transition: 'all var(--transition-fast)',
                }}>{count}</span>
            </button>
        );
    };

    return (
        <>
            {/* ── Hero Header Card ── */}
            <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                marginBottom: 'var(--space-4)',
                boxShadow: 'none',
            }}>
                {/* Colored top stripe */}
                <div style={{
                    height: 6,
                    background: `linear-gradient(90deg, ${iconColor}, ${iconColor}88)`,
                }} />

                {/* Header body */}
                <div style={{ padding: '20px 24px' }}>
                    {/* Back link */}
                    <button onClick={() => navigate('/communities')} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-text-tertiary)', fontSize: 12.5, fontWeight: 500,
                        fontFamily: 'var(--font-family)', marginBottom: 18,
                        padding: 0, letterSpacing: '-0.01em',
                    }}>
                        <ArrowLeft style={{ width: 14, height: 14 }} />
                        Comunidades
                    </button>

                    {/* Identity row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isCompact ? 12 : 16 }}>
                        {/* Community icon */}
                        <div style={{
                            width: isCompact ? 48 : 60, height: isCompact ? 48 : 60, borderRadius: isCompact ? 14 : 18, flexShrink: 0,
                            background: iconColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {community.isEntity
                                ? <Building2 style={{ width: isCompact ? 22 : 28, height: isCompact ? 22 : 28, color: 'white' }} />
                                : <Users style={{ width: isCompact ? 22 : 28, height: isCompact ? 22 : 28, color: 'white' }} />
                            }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <h1 style={{
                                    fontSize: isCompact ? 18 : 22, fontWeight: 800, color: 'var(--color-text-primary)',
                                    letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2,
                                }}>{community.name}</h1>
                                {community.isEntity && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        fontSize: 11, fontWeight: 700, padding: '3px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                                    }}>
                                        <ShieldCheck style={{ width: 11, height: 11 }} />
                                        Entidad oficial
                                    </span>
                                )}
                            </div>
                            {community.description && (
                                <p style={{
                                    margin: '6px 0 0', fontSize: isCompact ? 12.5 : 13.5,
                                    color: 'var(--color-text-secondary)', lineHeight: 1.5,
                                }}>{community.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Stat pills row */}
                    <div style={{
                        display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap',
                    }}>
                        <StatPill value={members.length} label="Miembros" color={iconColor} />
                        <StatPill value={alerts.length} label="Alertas" color="var(--color-text-primary)" />
                    </div>
                </div>
            </div>

            {/* ── Tabbed Content Card ── */}
            <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'none',
            }}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border)',
                    paddingLeft: isCompact ? 0 : 4,
                    overflowX: isCompact ? 'auto' : 'visible',
                }}>
                    {tabBtn('alerts', 'Alertas', alerts.length)}
                    {tabBtn('members', 'Miembros', members.length)}
                </div>

                {/* ── Alerts tab ── */}
                {activeTab === 'alerts' && (
                    alerts.length === 0
                        ? <EmptyState icon={AlertTriangle} title="Sin alertas" desc="Esta comunidad aún no tiene alertas registradas." />
                        : (
                            <div
                                ref={alertsScrollRef}
                                style={{
                                    maxHeight: 'min(560px, 58vh)',
                                    overflowY: 'auto',
                                    scrollBehavior: 'auto',
                                }}
                            >
                                {displayAlerts.map(a => (
                                    <AlertRow key={a.id} alert={a} onClick={setSelectedAlert} />
                                ))}
                            </div>
                        )
                )}

                {/* ── Members tab ── */}
                {activeTab === 'members' && (
                    members.length === 0
                        ? <EmptyState icon={Users} title="Sin miembros" desc="No se encontraron miembros en esta comunidad." />
                        : (
                            <>
                                {/* Column headers */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isCompact ? '1fr auto' : '1fr auto auto',
                                    alignItems: 'center',
                                    padding: '10px 20px',
                                    background: 'var(--color-bg)',
                                    borderBottom: '1px solid var(--color-border)',
                                    fontSize: 10.5, fontWeight: 700,
                                    color: 'var(--color-text-tertiary)',
                                    textTransform: 'uppercase', letterSpacing: '0.07em',
                                    gap: '0 12px',
                                }}>
                                    <span>Miembro</span>
                                    <span>Rol</span>
                                    {!isCompact && <span style={{ minWidth: 80, textAlign: 'right' }}>Se unió</span>}
                                </div>
                                {members.map(m => <MemberRow key={m.id} member={m} iconColor={iconColor} compact={isCompact} />)}
                            </>
                        )
                )}
            </div>

            {selectedAlert && (
                <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
            )}
        </>
    );
}
