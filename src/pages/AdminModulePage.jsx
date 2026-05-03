import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    LayoutGrid,
    Search,
    Users,
    UserSquare2,
} from 'lucide-react';
import {
    fetchRegistryCounts,
    findUserBySearch,
    listCommunitiesForUser,
    findCommunityBySearch,
    fetchCommunityMembersEnriched,
    fetchAllUsers,
} from '../services/adminModuleService';

function formatUserDate(val) {
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

export default function AdminModulePage() {
    const [counts, setCounts] = useState({ users: null, communities: null });
    const [countsErr, setCountsErr] = useState(null);

    const [allUsers, setAllUsers] = useState([]);
    const [allUsersLoading, setAllUsersLoading] = useState(true);
    const [allUsersErr, setAllUsersErr] = useState(null);
    const [directoryFilter, setDirectoryFilter] = useState('');

    const [userQuery, setUserQuery] = useState('');
    const [userLoading, setUserLoading] = useState(false);
    const [userResult, setUserResult] = useState(null);
    const [userMemberships, setUserMemberships] = useState([]);
    const [userErr, setUserErr] = useState(null);

    const [commQuery, setCommQuery] = useState('');
    const [commLoading, setCommLoading] = useState(false);
    const [commResult, setCommResult] = useState(null);
    const [commMembers, setCommMembers] = useState([]);
    const [memberFilter, setMemberFilter] = useState('');
    const [commErr, setCommErr] = useState(null);

    const loadCounts = useCallback(async () => {
        setCountsErr(null);
        try {
            const c = await fetchRegistryCounts();
            setCounts(c);
        } catch (e) {
            setCountsErr(e?.message || 'No se pudieron cargar los totales');
        }
    }, []);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setAllUsersLoading(true);
            setAllUsersErr(null);
            try {
                const list = await fetchAllUsers();
                if (!cancelled) setAllUsers(list);
            } catch (e) {
                if (!cancelled) {
                    setAllUsersErr(e?.message || 'No se pudo cargar el listado');
                    setAllUsers([]);
                }
            } finally {
                if (!cancelled) setAllUsersLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    async function runUserSearch(e) {
        e?.preventDefault();
        const q = userQuery.trim();
        if (!q) return;
        setUserLoading(true);
        setUserErr(null);
        setUserResult(null);
        setUserMemberships([]);
        try {
            const u = await findUserBySearch(q);
            setUserResult(u);
            if (u) {
                const list = await listCommunitiesForUser(u.id);
                setUserMemberships(list);
            } else {
                setUserErr('No se encontró ningún usuario con ese criterio.');
            }
        } catch (err) {
            setUserErr(err?.message || 'Error al buscar');
        } finally {
            setUserLoading(false);
        }
    }

    async function runCommSearch(e) {
        e?.preventDefault();
        const q = commQuery.trim();
        if (!q) return;
        setCommLoading(true);
        setCommErr(null);
        setCommResult(null);
        setCommMembers([]);
        setMemberFilter('');
        try {
            const c = await findCommunityBySearch(q);
            setCommResult(c);
            if (c) {
                const m = await fetchCommunityMembersEnriched(c.id);
                setCommMembers(m);
            } else {
                setCommErr('No se encontró la comunidad.');
            }
        } catch (err) {
            setCommErr(err?.message || 'Error al buscar');
        } finally {
            setCommLoading(false);
        }
    }

    const filteredMembers = useMemo(() => {
        const f = memberFilter.trim().toLowerCase();
        if (!f) return commMembers;
        return commMembers.filter((m) => {
            const email = (m.email || '').toLowerCase();
            const uid = (m.userId || '').toLowerCase();
            const name = (m.displayName || '').toLowerCase();
            return email.includes(f) || uid.includes(f) || name.includes(f);
        });
    }, [commMembers, memberFilter]);

    const filteredDirectory = useMemo(() => {
        const f = directoryFilter.trim().toLowerCase();
        if (!f) return allUsers;
        return allUsers.filter((u) => {
            const email = (u.email || '').toLowerCase();
            const id = (u.id || '').toLowerCase();
            const name = (u.displayName || '').toLowerCase();
            const phone = (u.phone || '').replace(/\s/g, '').toLowerCase();
            const fq = f.replace(/\s/g, '');
            return (
                email.includes(f) ||
                id.includes(f) ||
                name.includes(f) ||
                (phone && phone.includes(fq))
            );
        });
    }, [allUsers, directoryFilter]);

    return (
        <div className="admin-module-page">
            <div className="admin-module-intro">
                <LayoutGrid size={22} className="admin-module-intro-icon" aria-hidden />
                <div>
                    <h2 className="admin-module-title">Módulo administrativo</h2>
                    <p className="admin-module-sub">
                        Totales del registro, directorio completo de usuarios y cruce usuario ↔ comunidades.
                    </p>
                </div>
            </div>

            {countsErr && (
                <div className="admin-module-banner admin-module-banner--error">{countsErr}</div>
            )}

            <div className="admin-stats-grid">
                <div className="stat-card stat-card--dash">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Usuarios registrados</span>
                        <div className="stat-card-icon" aria-hidden>
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="stat-card-value">
                        {counts.users == null ? '—' : counts.users.toLocaleString('es-CO')}
                    </div>
                </div>
                <div className="stat-card stat-card--dash">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Comunidades</span>
                        <div className="stat-card-icon" aria-hidden>
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="stat-card-value">
                        {counts.communities == null ? '—' : counts.communities.toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <div className="admin-module-layout admin-module-layout--split">
                <section className="admin-module-panel admin-module-users-block">
                    <h3 className="admin-module-panel-title">
                        <Users size={18} /> Directorio de usuarios
                    </h3>
                    <p className="admin-module-panel-hint">
                        Toda la colección <code className="admin-code-inline">users</code> (incluidos perfiles sin
                        fecha o solo correo). El listado no filtra por proveedor. Nombre según la app:{' '}
                        <code className="admin-code-inline">name</code> →{' '}
                        <code className="admin-code-inline">displayName</code> → parte del correo.
                    </p>
                    <div className="admin-module-users-head">
                        <input
                            type="search"
                            className="admin-module-input"
                            style={{ flex: '1 1 220px', minWidth: 0, maxWidth: 420 }}
                            placeholder="Filtrar por texto…"
                            value={directoryFilter}
                            onChange={(e) => setDirectoryFilter(e.target.value)}
                            autoComplete="off"
                            aria-label="Filtrar usuarios"
                        />
                        <span className="admin-module-users-count">
                            {allUsersLoading
                                ? 'Cargando…'
                                : `${filteredDirectory.length.toLocaleString('es-CO')} de ${allUsers.length.toLocaleString('es-CO')}`}
                        </span>
                    </div>
                    {allUsersErr && (
                        <p className="admin-module-msg admin-module-msg--muted">{allUsersErr}</p>
                    )}
                    <div className="admin-module-scroll">
                        <table className="admin-module-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Contacto</th>
                                    <th>UID</th>
                                    <th>Alta</th>
                                    <th>Últ. actualización</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!allUsersLoading && filteredDirectory.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="admin-module-msg admin-module-msg--muted">
                                            {allUsers.length === 0
                                                ? 'No hay usuarios en el registro o no tienes permiso de lectura.'
                                                : 'Ningún usuario coincide con el filtro.'}
                                        </td>
                                    </tr>
                                )}
                                {filteredDirectory.map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.displayName || '—'}</td>
                                        <td>
                                            {u.email ? (
                                                <span className="admin-user-contact-line">{u.email}</span>
                                            ) : null}
                                            {u.phone ? (
                                                <span className="admin-user-contact-line">{u.phone}</span>
                                            ) : null}
                                            {!u.email && !u.phone ? '—' : null}
                                        </td>
                                        <td className="admin-module-meta mono">{u.id}</td>
                                        <td>{formatUserDate(u.createdAt)}</td>
                                        <td>{formatUserDate(u.updatedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="admin-module-sidebar-stack">
                    <section className="admin-module-panel">
                        <h3 className="admin-module-panel-title">
                            <UserSquare2 size={18} /> Buscar usuario
                        </h3>
                        <p className="admin-module-panel-hint">
                            UID, correo o parte del nombre. Verás en qué comunidades participa.
                        </p>
                        <form className="admin-module-search" onSubmit={runUserSearch}>
                            <input
                                type="search"
                                className="admin-module-input"
                                placeholder="Ej. abc123… o correo@dominio.com"
                                value={userQuery}
                                onChange={(e) => setUserQuery(e.target.value)}
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                className="admin-btn-primary admin-module-btn"
                                disabled={userLoading}
                            >
                                <Search size={16} /> {userLoading ? 'Buscando…' : 'Buscar'}
                            </button>
                        </form>
                        {userErr && <p className="admin-module-msg admin-module-msg--muted">{userErr}</p>}
                        {userResult && (
                            <div className="admin-module-result">
                                <div className="admin-module-user-card">
                                    <div>
                                        <strong>{userResult.displayName || 'Sin nombre'}</strong>
                                        <div className="admin-module-meta">
                                            {[userResult.email, userResult.phone].filter(Boolean).join(' · ') ||
                                                'Sin correo ni teléfono en el perfil'}
                                        </div>
                                        <div className="admin-module-meta mono">{userResult.id}</div>
                                    </div>
                                </div>
                                {userMemberships.length === 0 ? (
                                    <p className="admin-module-msg">No pertenece a ninguna comunidad.</p>
                                ) : (
                                    <table className="admin-module-table">
                                        <thead>
                                            <tr>
                                                <th>Comunidad</th>
                                                <th>Rol</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userMemberships.map((row) => (
                                                <tr key={row.memberDocId}>
                                                    <td>{row.communityName}</td>
                                                    <td>{row.role}</td>
                                                    <td>
                                                        <Link
                                                            to={`/communities/${row.communityId}`}
                                                            className="admin-module-link"
                                                        >
                                                            Ver comunidad
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="admin-module-panel">
                        <h3 className="admin-module-panel-title">
                            <Building2 size={18} /> Buscar comunidad
                        </h3>
                        <p className="admin-module-panel-hint">
                            ID de Firestore o parte del nombre. Lista de miembros; puedes filtrar por usuario abajo.
                        </p>
                        <form className="admin-module-search" onSubmit={runCommSearch}>
                            <input
                                type="search"
                                className="admin-module-input"
                                placeholder="ID o nombre…"
                                value={commQuery}
                                onChange={(e) => setCommQuery(e.target.value)}
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                className="admin-btn-primary admin-module-btn"
                                disabled={commLoading}
                            >
                                <Search size={16} /> {commLoading ? 'Buscando…' : 'Buscar'}
                            </button>
                        </form>
                        {commErr && <p className="admin-module-msg admin-module-msg--muted">{commErr}</p>}
                        {commResult && (
                            <div className="admin-module-result">
                                <div className="admin-module-comm-head">
                                    <div>
                                        <strong>{commResult.name}</strong>
                                        <div className="admin-module-meta mono">{commResult.id}</div>
                                        {commResult.description && (
                                            <p className="admin-module-desc">{commResult.description}</p>
                                        )}
                                    </div>
                                    <Link
                                        to={`/communities/${commResult.id}`}
                                        className="admin-btn-ghost admin-module-manage-link"
                                    >
                                        Gestionar miembros
                                    </Link>
                                </div>
                                <div className="admin-module-filter-row">
                                    <label htmlFor="member-filter">Filtrar miembros</label>
                                    <input
                                        id="member-filter"
                                        type="search"
                                        className="admin-module-input admin-module-input--narrow"
                                        placeholder="Correo, UID o nombre…"
                                        value={memberFilter}
                                        onChange={(e) => setMemberFilter(e.target.value)}
                                    />
                                </div>
                                {filteredMembers.length === 0 ? (
                                    <p className="admin-module-msg">Sin coincidencias.</p>
                                ) : (
                                    <div className="admin-module-scroll" style={{ maxHeight: 'min(48vh, 520px)' }}>
                                        <table className="admin-module-table">
                                            <thead>
                                                <tr>
                                                    <th>Usuario</th>
                                                    <th>Correo</th>
                                                    <th>Rol</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredMembers.map((m) => (
                                                    <tr key={m.id}>
                                                        <td>
                                                            <div>{m.displayName || '—'}</div>
                                                            <div className="admin-module-meta mono">{m.userId}</div>
                                                        </td>
                                                        <td>{m.email || '—'}</td>
                                                        <td>{m.role}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
