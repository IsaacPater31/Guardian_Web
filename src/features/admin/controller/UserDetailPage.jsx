import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    Ban,
    CircleCheck,
    Save,
    User,
    UserMinus,
} from 'lucide-react';
import {
    getUserById,
    adminUpdateUserProfile,
    adminSuspendUser,
    adminUnsuspendUser,
} from '@/features/admin/service/userAdminService';
import { listCommunitiesForUser } from '@/features/admin/repository/adminDirectoryRepository';
import {
    adminRemoveMember,
    adminUpdateMemberRole,
} from '@/features/communities/service/communityWriteService';
import { roleSelectOptions } from '@/shared/validators/roles';

function formatDate(val) {
    if (val == null) return '—';
    try {
        const d = typeof val?.toDate === 'function' ? val.toDate() : val instanceof Date ? val : null;
        if (!d || Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

export default function UserDetailPage() {
    const { uid } = useParams();

    const [user, setUser] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');

    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');

    const load = useCallback(async () => {
        if (!uid) return;
        setLoading(true);
        setErr('');
        try {
            const [u, m] = await Promise.all([
                getUserById(uid),
                listCommunitiesForUser(uid),
            ]);
            if (!u) {
                setUser(null);
                setMemberships([]);
                setErr('Usuario no encontrado.');
                return;
            }
            setUser(u);
            setMemberships(m);
            setDisplayName(u.displayName || '');
            setPhone(u.phone || '');
        } catch (e) {
            setErr(e?.message || 'No se pudo cargar el usuario');
            setUser(null);
            setMemberships([]);
        } finally {
            setLoading(false);
        }
    }, [uid]);

    useEffect(() => {
        load();
    }, [load]);

    async function saveProfile(e) {
        e.preventDefault();
        if (!uid) return;
        setBusy(true);
        setErr('');
        setOk('');
        try {
            await adminUpdateUserProfile(uid, { displayName, phone });
            setOk('Datos actualizados.');
            await load();
        } catch (ex) {
            setErr(ex?.message || 'No se pudo guardar');
        } finally {
            setBusy(false);
        }
    }

    async function changeRole(memberDocId, role) {
        setBusy(true);
        setErr('');
        setOk('');
        try {
            await adminUpdateMemberRole(memberDocId, role);
            setOk('Rol actualizado.');
            await load();
        } catch (ex) {
            setErr(ex?.message || 'No se pudo cambiar el rol');
        } finally {
            setBusy(false);
        }
    }

    async function removeMembership(memberDocId, communityName) {
        const label = communityName || 'esta comunidad';
        if (!window.confirm(`¿Quitar a esta persona de «${label}»?`)) return;
        setBusy(true);
        setErr('');
        setOk('');
        try {
            await adminRemoveMember(memberDocId);
            setOk('Membresía eliminada.');
            await load();
        } catch (ex) {
            setErr(ex?.message || 'No se pudo quitar de la comunidad');
        } finally {
            setBusy(false);
        }
    }

    async function toggleSuspend() {
        if (!uid || !user) return;
        const suspending = !user.suspended;
        const label = user.displayName || user.email || 'este usuario';
        const okConfirm = window.confirm(
            suspending
                ? `¿Suspender a «${label}»?\n\n`
                  + 'No podrá entrar a la app Guardian ni al panel Usersweb. '
                  + 'Se conservan perfil, comunidades, reportes y alertas.'
                : `¿Reactivar a «${label}»?\n\n`
                  + 'Volverá a poder entrar a Guardian y Usersweb.'
        );
        if (!okConfirm) return;

        setBusy(true);
        setErr('');
        setOk('');
        try {
            if (suspending) {
                await adminSuspendUser(uid);
                setOk('Cuenta suspendida. No podrá usar Guardian ni Usersweb.');
            } else {
                await adminUnsuspendUser(uid);
                setOk('Cuenta reactivada.');
            }
            await load();
        } catch (ex) {
            setErr(ex?.message || 'No se pudo actualizar el estado de la cuenta');
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="admin-module-page admin-user-detail">
                <p className="admin-module-msg admin-module-msg--muted">Cargando usuario…</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-module-page admin-user-detail">
                <Link to="/admin/users" className="admin-module-link admin-user-back">
                    <ArrowLeft size={16} aria-hidden /> Volver a usuarios
                </Link>
                <div className="admin-module-banner admin-module-banner--error">
                    {err || 'Usuario no encontrado.'}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-module-page admin-user-detail">
            <Link to="/admin/users" className="admin-module-link admin-user-back">
                <ArrowLeft size={16} aria-hidden /> Volver a usuarios
            </Link>

            <div className="admin-module-intro">
                <User size={22} className="admin-module-intro-icon" aria-hidden />
                <div>
                    <h2 className="admin-module-title">
                        {user.displayName || 'Usuario'}
                        {user.suspended ? (
                            <span className="admin-module-badge admin-module-badge--danger">
                                Suspendido
                            </span>
                        ) : null}
                    </h2>
                    {user.email ? (
                        <p className="admin-module-sub admin-module-meta">{user.email}</p>
                    ) : null}
                </div>
            </div>

            {err && (
                <div className="admin-module-banner admin-module-banner--error" role="alert">
                    {err}
                </div>
            )}
            {ok && (
                <div className="admin-module-banner admin-module-banner--ok" role="status">
                    {ok}
                </div>
            )}

            <section className="admin-module-panel">
                <h3 className="admin-module-panel-title">Datos del perfil</h3>
                <p className="admin-module-panel-hint">
                    Puedes editar nombre y teléfono. El correo y el flag de operador no se modifican aquí.
                </p>
                <form className="admin-user-form" onSubmit={saveProfile}>
                    <label className="login-label">
                        Nombre
                        <input
                            className="login-input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            disabled={busy}
                            required
                            autoComplete="name"
                        />
                    </label>
                    <label className="login-label">
                        Teléfono
                        <input
                            className="login-input"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={busy}
                            autoComplete="tel"
                            inputMode="tel"
                        />
                    </label>
                    <label className="login-label">
                        Correo
                        <input className="login-input" value={user.email || ''} disabled readOnly />
                    </label>
                    <div className="admin-user-readonly-row">
                        <span className="admin-module-meta">
                            Operador web: {user.platformAdmin ? 'Sí' : 'No'}
                        </span>
                        <span className="admin-module-meta">
                            Estado: {user.suspended ? 'Suspendido' : 'Activo'}
                        </span>
                        {user.suspended && (
                            <span className="admin-module-meta">
                                Desde: {formatDate(user.suspendedAt)}
                            </span>
                        )}
                        <span className="admin-module-meta">Alta: {formatDate(user.createdAt)}</span>
                        <span className="admin-module-meta">
                            Actualizado: {formatDate(user.updatedAt)}
                        </span>
                    </div>
                    <button type="submit" className="admin-btn-primary" disabled={busy}>
                        <Save size={16} aria-hidden /> Guardar cambios
                    </button>
                </form>
            </section>

            <section className="admin-module-panel">
                <h3 className="admin-module-panel-title">
                    <Building2 size={18} aria-hidden /> Comunidades y entidades
                </h3>
                <p className="admin-module-panel-hint">
                    Cambia el rol o quita al usuario. No se permite dejar una comunidad sin gestor.
                </p>
                {memberships.length === 0 ? (
                    <p className="admin-module-msg admin-module-msg--muted">
                        No pertenece a ninguna comunidad.
                    </p>
                ) : (
                    <div className="admin-module-scroll">
                        <table className="admin-module-table">
                            <thead>
                                <tr>
                                    <th>Comunidad</th>
                                    <th>Tipo</th>
                                    <th>Rol</th>
                                    <th className="admin-th-actions"> </th>
                                </tr>
                            </thead>
                            <tbody>
                                {memberships.map((m) => {
                                    const roles = roleSelectOptions(m.isEntity);
                                    const selectValue =
                                        m.isEntity && m.role === 'admin'
                                            ? 'official'
                                            : !m.isEntity && m.role === 'official'
                                              ? 'member'
                                              : m.role;
                                    return (
                                        <tr key={m.memberDocId}>
                                            <td>
                                                <Link
                                                    to={`/communities/${m.communityId}`}
                                                    className="admin-module-link"
                                                >
                                                    {m.communityName || m.communityId}
                                                </Link>
                                            </td>
                                            <td>{m.isEntity ? 'Entidad' : 'Comunidad'}</td>
                                            <td>
                                                <select
                                                    className="login-input admin-select-inline"
                                                    value={selectValue}
                                                    onChange={(e) =>
                                                        changeRole(m.memberDocId, e.target.value)
                                                    }
                                                    disabled={busy}
                                                    aria-label={`Rol en ${m.communityName}`}
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
                                                    title="Quitar de la comunidad"
                                                    onClick={() =>
                                                        removeMembership(
                                                            m.memberDocId,
                                                            m.communityName
                                                        )
                                                    }
                                                    disabled={busy}
                                                >
                                                    <UserMinus size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="admin-module-panel admin-user-danger">
                <h3 className="admin-module-panel-title">
                    <Ban size={18} aria-hidden /> Acceso a la cuenta
                </h3>
                <p className="admin-module-panel-hint">
                    {user.suspended
                        ? 'Esta cuenta está suspendida: no puede entrar a Guardian ni a Usersweb. '
                          + 'Perfil, comunidades, reportes y alertas se conservan.'
                        : 'Suspender inhabilita el acceso a Guardian y Usersweb. '
                          + 'No elimina el perfil ni las membresías.'}
                </p>
                <button
                    type="button"
                    className={user.suspended ? 'admin-btn-primary' : 'admin-btn-danger'}
                    onClick={toggleSuspend}
                    disabled={busy}
                >
                    {user.suspended ? (
                        <>
                            <CircleCheck size={16} aria-hidden /> Reactivar cuenta
                        </>
                    ) : (
                        <>
                            <Ban size={16} aria-hidden /> Suspender cuenta
                        </>
                    )}
                </button>
            </section>
        </div>
    );
}
