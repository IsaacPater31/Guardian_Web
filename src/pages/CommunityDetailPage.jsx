import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { getAllCommunities, getCommunityMembers } from '../services/communityService';
import {
    adminAddCommunityMember,
    adminRemoveMember,
    adminUpdateMemberRole,
} from '../services/adminCrudService';
import { adminCreateOfficialUser } from '../services/adminUserProvisionService';
import { isOfficialEntityCommunity } from '../utils/communityVisibility';

const BASE_ROLES = [
    { value: 'member', label: 'Miembro' },
    { value: 'admin', label: 'Administrador' },
];

// El rol "oficial" solo aplica en entidades: junto con admin, son quienes
// reciben los reportes enviados a la entidad.
const ENTITY_ROLES = [
    { value: 'member', label: 'Miembro' },
    { value: 'official', label: 'Oficial' },
    { value: 'admin', label: 'Administrador' },
];

const emptyOfficialForm = {
    displayName: '',
    email: '',
    password: '',
};

/**
 * Detalle de comunidad: gestión de miembros (CRUD) para el panel administrativo.
 */
export default function CommunityDetailPage() {
    const { id: communityId } = useParams();
    const [communityName, setCommunityName] = useState('');
    const [isEntity, setIsEntity] = useState(false);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUid, setNewUid] = useState('');
    const [newRole, setNewRole] = useState('member');
    const [busy, setBusy] = useState(false);
    const [officialForm, setOfficialForm] = useState({ ...emptyOfficialForm });
    const [officialErr, setOfficialErr] = useState('');
    const [officialOk, setOfficialOk] = useState('');

    const roles = isEntity ? ENTITY_ROLES : BASE_ROLES;

    const load = useCallback(async () => {
        if (!communityId) return;
        setLoading(true);
        try {
            const all = await getAllCommunities();
            const c = all.find((x) => x.id === communityId);
            setCommunityName(c?.name || communityId);
            setIsEntity(c ? isOfficialEntityCommunity(c) : false);
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

    async function createOfficial(e) {
        e.preventDefault();
        setOfficialErr('');
        setOfficialOk('');
        setBusy(true);
        try {
            const uid = await adminCreateOfficialUser({
                email: officialForm.email,
                password: officialForm.password,
                displayName: officialForm.displayName,
                communityId,
            });
            setOfficialOk(`Usuario oficial creado (UID: ${uid}).`);
            setOfficialForm({ ...emptyOfficialForm });
            await load();
        } catch (err) {
            setOfficialErr(err?.message || 'No se pudo crear el usuario oficial');
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
                            <h2 className="section-title">
                                {isEntity ? `Reporte ${communityName}` : communityName}
                            </h2>
                            <p className="section-subtitle">
                                {isEntity
                                    ? 'Entidad de reportes — gestión de miembros, oficiales y roles'
                                    : 'Gestión de miembros y roles'}
                            </p>
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
                            {roles.map((r) => (
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

            {isEntity && (
                <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
                    <div className="section-header">
                        <div className="section-header-left">
                            <div className="section-icon" style={{ background: 'rgba(13, 27, 62, 0.1)' }}>
                                <ShieldCheck size={18} style={{ color: '#0d1b3e' }} />
                            </div>
                            <div>
                                <h3 className="section-title">Crear usuario oficial</h3>
                                <p className="section-subtitle">
                                    Crea la cuenta en Firebase Auth y la vincula a esta entidad con
                                    rol Oficial (recibe los reportes). Tu sesión de administrador no
                                    se ve afectada.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="section-body">
                        <form onSubmit={createOfficial} className="admin-add-form">
                            <input
                                className="login-input"
                                placeholder="Nombre completo"
                                value={officialForm.displayName}
                                onChange={(e) =>
                                    setOfficialForm((f) => ({ ...f, displayName: e.target.value }))
                                }
                                required
                            />
                            <input
                                className="login-input"
                                type="email"
                                placeholder="Correo"
                                value={officialForm.email}
                                onChange={(e) =>
                                    setOfficialForm((f) => ({ ...f, email: e.target.value }))
                                }
                                required
                            />
                            <input
                                className="login-input"
                                type="password"
                                placeholder="Contraseña inicial"
                                value={officialForm.password}
                                onChange={(e) =>
                                    setOfficialForm((f) => ({ ...f, password: e.target.value }))
                                }
                                minLength={6}
                                required
                            />
                            <button type="submit" className="admin-btn-primary" disabled={busy}>
                                <ShieldCheck size={18} /> Crear oficial
                            </button>
                        </form>
                        {officialErr && (
                            <div className="login-error" style={{ marginTop: 'var(--space-2)' }}>
                                {officialErr}
                            </div>
                        )}
                        {officialOk && (
                            <p className="admin-muted" style={{ marginTop: 'var(--space-2)' }}>
                                {officialOk}
                            </p>
                        )}
                    </div>
                </section>
            )}

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
                                                    value={
                                                        !isEntity && m.role === 'official'
                                                            ? 'member'
                                                            : m.role
                                                    }
                                                    onChange={(e) => changeRole(m.id, e.target.value)}
                                                    disabled={busy}
                                                >
                                                    {roles.map((r) => (
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
