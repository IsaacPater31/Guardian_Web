import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, UserMinus, UserPlus, Users } from 'lucide-react';
import { getAllCommunities, getCommunityMembers } from '../services/communityService';
import {
    adminAddCommunityMember,
    adminRemoveMember,
    adminUpdateMemberRole,
} from '../services/adminCrudService';
import { isOfficialEntityCommunity } from '../utils/communityVisibility';

const ROLES = [
    { value: 'member', label: 'Miembro' },
    { value: 'admin', label: 'Administrador' },
];

/**
 * Detalle de comunidad: gestión de miembros (CRUD) para el panel administrativo.
 */
export default function CommunityDetailPage() {
    const { id: communityId } = useParams();
    const [communityName, setCommunityName] = useState('');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUid, setNewUid] = useState('');
    const [newRole, setNewRole] = useState('member');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!communityId) return;
        setLoading(true);
        try {
            const all = await getAllCommunities();
            const c = all.find((x) => x.id === communityId);
            if (c && isOfficialEntityCommunity(c)) {
                setCommunityName('');
                setMembers([]);
                return;
            }
            setCommunityName(c?.name || communityId);
            const m = await getCommunityMembers(communityId);
            setMembers(m);
        } catch (e) {
            console.error(e);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [communityId]);

    useEffect(() => {
        load();
    }, [load]);

    async function addMember(e) {
        e.preventDefault();
        const uid = newUid.trim();
        if (!uid || !communityId) return;
        setBusy(true);
        try {
            await adminAddCommunityMember(communityId, uid, newRole);
            setNewUid('');
            await load();
        } catch (err) {
            alert(err?.message || 'No se pudo agregar');
        } finally {
            setBusy(false);
        }
    }

    async function removeMemberRow(memberDocId) {
        if (!window.confirm('¿Quitar a esta persona de la comunidad?')) return;
        setBusy(true);
        try {
            await adminRemoveMember(memberDocId);
            await load();
        } catch (err) {
            alert(err?.message || 'Error');
        } finally {
            setBusy(false);
        }
    }

    async function changeRole(memberId, role) {
        setBusy(true);
        try {
            await adminUpdateMemberRole(memberId, role);
            await load();
        } catch (err) {
            alert(err?.message || 'Error');
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!communityName) {
        return (
            <>
                <Link to="/communities" className="admin-back" style={{ marginBottom: 'var(--space-4)' }}>
                    <ArrowLeft size={18} /> Comunidades
                </Link>
                <p className="admin-muted">Esta comunidad no está disponible.</p>
            </>
        );
    }

    return (
        <>
            <Link to="/communities" className="admin-back" style={{ marginBottom: 'var(--space-4)' }}>
                <ArrowLeft size={18} /> Comunidades
            </Link>

            <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="section-header">
                    <div className="section-header-left">
                        <div
                            className="section-icon"
                            style={{ background: 'rgba(63, 81, 181, 0.1)' }}
                        >
                            <Users size={18} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <h2 className="section-title">{communityName}</h2>
                            <p className="section-subtitle">Gestión de miembros y roles</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.12)' }}>
                            <UserPlus size={18} style={{ color: '#34C759' }} />
                        </div>
                        <div>
                            <h3 className="section-title">Agregar miembro</h3>
                            <p className="section-subtitle">UID de Firebase y rol en esta comunidad</p>
                        </div>
                    </div>
                </div>
                <div className="section-body">
                    <form onSubmit={addMember} className="admin-add-form">
                        <input
                            className="login-input"
                            placeholder="UID de Firebase del usuario"
                            value={newUid}
                            onChange={(e) => setNewUid(e.target.value)}
                        />
                        <select
                            className="login-input admin-select"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                        >
                            {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="admin-btn-primary" disabled={busy}>
                            <UserPlus size={18} /> Añadir
                        </button>
                    </form>
                </div>
            </section>

            <section className="section section--dash">
                <div className="section-header">
                    <div className="section-header-left">
                        <div className="section-icon" style={{ background: 'rgba(0, 0, 0, 0.04)' }}>
                            <Users size={18} style={{ color: 'var(--color-text-secondary)' }} />
                        </div>
                        <div>
                            <h3 className="section-title">Miembros</h3>
                            <p className="section-subtitle">
                                {members.length === 0 ? 'Aún no hay personas en esta comunidad' : `${members.length} registrados`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="section-body section-body--table">
                    {members.length === 0 ? (
                        <p className="admin-muted admin-empty-inset">No hay miembros.</p>
                    ) : (
                        <div className="admin-table-scroll">
                            <table className="admin-table admin-table--users admin-table-wide">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Correo</th>
                                        <th>UID</th>
                                        <th>Rol</th>
                                        <th className="admin-th-actions"> </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((m) => (
                                        <tr key={m.id}>
                                            <td>{m.displayName || '—'}</td>
                                            <td className="admin-mono">{m.email || '—'}</td>
                                            <td className="admin-mono admin-uid">{m.userId || '—'}</td>
                                            <td>
                                                <select
                                                    className="login-input admin-select-inline"
                                                    value={m.role === 'official' ? 'member' : m.role}
                                                    onChange={(e) => changeRole(m.id, e.target.value)}
                                                    disabled={busy}
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r.value} value={r.value}>
                                                            {r.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn danger"
                                                    title="Quitar"
                                                    onClick={() => removeMemberRow(m.id)}
                                                    disabled={busy}
                                                >
                                                    <UserMinus size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
