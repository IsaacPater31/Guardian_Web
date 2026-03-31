import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Building2, Calendar, ChevronRight } from 'lucide-react';
import { getAllCommunities, getCommunityMemberCount } from '../services/communityService';

export default function CommunitiesPage() {
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [memberCounts, setMemberCounts] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        loadCommunities();
    }, []);

    async function loadCommunities() {
        try {
            const data = await getAllCommunities();
            setCommunities(data);
            setLoading(false);

            // Load member counts in background
            const counts = {};
            for (const c of data) {
                try {
                    counts[c.id] = await getCommunityMemberCount(c.id);
                } catch {
                    counts[c.id] = 0;
                }
            }
            setMemberCounts(counts);
        } catch (e) {
            console.error('Error loading communities:', e);
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    // Separate entities from regular communities
    const entities = communities.filter((c) => c.isEntity);
    const regularCommunities = communities.filter((c) => !c.isEntity);

    return (
        <>
            {/* Entities Section */}
            {entities.length > 0 && (
                <>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: 'var(--space-4)',
                    }}>
                        <Building2 style={{ width: 18, height: 18, color: 'var(--color-text-tertiary)' }} />
                        <h3 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                        }}>
                            Entidades Oficiales
                        </h3>
                        <span style={{
                            padding: '2px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366F1',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 700,
                        }}>
                            {entities.length}
                        </span>
                    </div>
                    <div className="communities-grid" style={{ marginBottom: 'var(--space-8)' }}>
                        {entities.map((c) => (
                            <CommunityCard key={c.id} community={c} memberCount={memberCounts[c.id]} onClick={() => navigate(`/communities/${c.id}`)} />
                        ))}
                    </div>
                </>
            )}

            {/* Regular Communities */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: 'var(--space-4)',
            }}>
                <Users style={{ width: 18, height: 18, color: 'var(--color-text-tertiary)' }} />
                <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                }}>
                    Comunidades
                </h3>
                <span style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(52, 199, 89, 0.1)',
                    color: '#34C759',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 700,
                }}>
                    {regularCommunities.length}
                </span>
            </div>

            {regularCommunities.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Users />
                    </div>
                    <div className="empty-state-title">Sin comunidades</div>
                    <div className="empty-state-desc">
                        Aún no hay comunidades registradas.
                    </div>
                </div>
            ) : (
                <div className="communities-grid">
                    {regularCommunities.map((c) => (
                        <CommunityCard key={c.id} community={c} memberCount={memberCounts[c.id]} onClick={() => navigate(`/communities/${c.id}`)} />
                    ))}
                </div>
            )}
        </>
    );
}

function CommunityCard({ community, memberCount, onClick }) {
    const iconColor = community.iconColor || '#6366F1';
    const createdDate = community.createdAt?.toDate
        ? community.createdAt.toDate()
        : new Date(community.createdAt);

    return (
        <div className="community-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="community-card-header">
                <div
                    className="community-card-icon"
                    style={{ background: iconColor }}
                >
                    {community.isEntity ? (
                        <Building2 style={{ width: 22, height: 22, color: 'white' }} />
                    ) : (
                        <Users style={{ width: 22, height: 22, color: 'white' }} />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <div className="community-card-name">{community.name}</div>
                    {community.isEntity && (
                        <span style={{
                            fontSize: 'var(--font-size-xs)',
                            color: '#6366F1',
                            fontWeight: 600,
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '1px 8px',
                            borderRadius: 'var(--radius-full)',
                        }}>
                            Entidad oficial
                        </span>
                    )}
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
            </div>
            {community.description && (
                <p className="community-card-desc">{community.description}</p>
            )}
            <div className="community-card-footer">
                <Users style={{ width: 14, height: 14 }} />
                <span>{memberCount ?? '—'} miembros</span>
                <span style={{ margin: '0 4px' }}>·</span>
                <Calendar style={{ width: 14, height: 14 }} />
                <span>
                    {createdDate.toLocaleDateString('es-CO', {
                        month: 'short',
                        year: 'numeric',
                    })}
                </span>
            </div>
        </div>
    );
}
