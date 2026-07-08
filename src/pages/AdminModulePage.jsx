import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, LayoutGrid, Search, Users } from 'lucide-react';
import AdminPaginationBar from '../components/admin/AdminPaginationBar';
import { ADMIN_LIST_PAGE_SIZE } from '../config/adminPagination';
import { fetchRegistryCounts, fetchUsersPage } from '../services/adminModuleService';
import { fetchCommunitiesPage } from '../services/communityService';

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
    const [countsLoading, setCountsLoading] = useState(true);

    const [usersPage, setUsersPage] = useState(1);
    const [users, setUsers] = useState([]);
    const usersCursorsRef = useRef([null]);
    const [usersHasMore, setUsersHasMore] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersErr, setUsersErr] = useState(null);
    const [directoryFilter, setDirectoryFilter] = useState('');

    const [communitiesPage, setCommunitiesPage] = useState(1);
    const [communities, setCommunities] = useState([]);
    const communitiesCursorsRef = useRef([null]);
    const [communitiesHasMore, setCommunitiesHasMore] = useState(false);
    const [communitiesLoading, setCommunitiesLoading] = useState(true);
    const [communitiesErr, setCommunitiesErr] = useState(null);
    const [communitiesDirectoryFilter, setCommunitiesDirectoryFilter] = useState('');

    useEffect(() => {
        let cancelled = false;
        setCountsLoading(true);
        setCountsErr(null);
        fetchRegistryCounts()
            .then((totals) => {
                if (!cancelled) {
                    setCounts(totals);
                    setCountsErr(null);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setCountsErr(e?.message || 'No se pudieron cargar los totales');
                    setCounts({ users: null, communities: null });
                }
            })
            .finally(() => {
                if (!cancelled) setCountsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setUsersLoading(true);
            setUsersErr(null);
            const cursor = usersPage > 1 ? usersCursorsRef.current[usersPage - 1] : null;
            try {
                const result = await fetchUsersPage({
                    pageSize: ADMIN_LIST_PAGE_SIZE,
                    cursor,
                });
                if (cancelled) return;
                usersCursorsRef.current[usersPage] = result.lastDoc;
                setUsers(result.items);
                setUsersHasMore(result.hasMore);
            } catch (e) {
                if (!cancelled) {
                    setUsersErr(e?.message || 'No se pudo cargar el listado');
                    setUsers([]);
                    setUsersHasMore(false);
                }
            } finally {
                if (!cancelled) setUsersLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [usersPage]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setCommunitiesLoading(true);
            setCommunitiesErr(null);
            const cursor = communitiesPage > 1 ? communitiesCursorsRef.current[communitiesPage - 1] : null;
            try {
                const result = await fetchCommunitiesPage({
                    pageSize: ADMIN_LIST_PAGE_SIZE,
                    cursor,
                });
                if (cancelled) return;
                communitiesCursorsRef.current[communitiesPage] = result.lastDoc;
                // El directorio admin también lista entidades (a diferencia del móvil).
                setCommunities(result.items);
                setCommunitiesHasMore(result.hasMore);
            } catch (e) {
                if (!cancelled) {
                    setCommunitiesErr(e?.message || 'No se pudo cargar el listado');
                    setCommunities([]);
                    setCommunitiesHasMore(false);
                }
            } finally {
                if (!cancelled) setCommunitiesLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [communitiesPage]);

    const directoryFilterActive = directoryFilter.trim().length > 0;
    const communitiesDirectoryFilterActive = communitiesDirectoryFilter.trim().length > 0;

    const filteredDirectory = useMemo(() => {
        const f = directoryFilter.trim().toLowerCase();
        if (!f) return users;
        return users.filter((u) => {
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
    }, [users, directoryFilter]);

    const filteredCommunitiesDirectory = useMemo(() => {
        const f = communitiesDirectoryFilter.trim().toLowerCase();
        if (!f) return communities;
        return communities.filter((c) => {
            const id = (c.id || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            return id.includes(f) || name.includes(f) || desc.includes(f);
        });
    }, [communities, communitiesDirectoryFilter]);

    const usersListRef = useRef(null);
    const communitiesListRef = useRef(null);

    function scrollIntoView(ref) {
        requestAnimationFrame(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function goUsersPrev() {
        if (usersPage > 1) {
            setUsersPage((p) => p - 1);
            scrollIntoView(usersListRef);
        }
    }

    function goUsersNext() {
        if (usersHasMore) {
            setUsersPage((p) => p + 1);
            scrollIntoView(usersListRef);
        }
    }

    function goCommunitiesPrev() {
        if (communitiesPage > 1) {
            setCommunitiesPage((p) => p - 1);
            scrollIntoView(communitiesListRef);
        }
    }

    function goCommunitiesNext() {
        if (communitiesHasMore) {
            setCommunitiesPage((p) => p + 1);
            scrollIntoView(communitiesListRef);
        }
    }

    return (
        <div className="admin-module-page">
            <div className="admin-module-intro">
                <LayoutGrid size={22} className="admin-module-intro-icon" aria-hidden />
                <div>
                    <h2 className="admin-module-title">Módulo administrativo</h2>
                    <p className="admin-module-sub">Directorios de usuarios y comunidades.</p>
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
                        {countsLoading || counts.users == null
                            ? '—'
                            : counts.users.toLocaleString('es-CO')}
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
                        {countsLoading || counts.communities == null
                            ? '—'
                            : counts.communities.toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <div className="admin-module-layout admin-module-layout--directories">
                <section className="admin-module-panel admin-module-directory" ref={usersListRef}>
                    <h3 className="admin-module-panel-title">
                        <Users size={18} /> Usuarios
                    </h3>
                    <div className="admin-module-directory-search">
                        <Search size={16} className="admin-module-directory-search-icon" aria-hidden />
                        <input
                            type="search"
                            className="admin-module-input admin-module-input--search"
                            placeholder="Buscar por nombre, correo o identificador…"
                            value={directoryFilter}
                            onChange={(e) => setDirectoryFilter(e.target.value)}
                            autoComplete="off"
                            aria-label="Buscar usuarios"
                        />
                    </div>
                    {usersErr && (
                        <p className="admin-module-msg admin-module-msg--muted">{usersErr}</p>
                    )}
                    <div className="admin-module-scroll admin-module-scroll--directory">
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
                                {!usersLoading && filteredDirectory.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="admin-module-msg admin-module-msg--muted">
                                            {users.length === 0
                                                ? 'No hay usuarios para mostrar.'
                                                : 'Ningún usuario coincide con la búsqueda.'}
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
                    <AdminPaginationBar
                        page={usersPage}
                        hasMore={usersHasMore}
                        loading={usersLoading}
                        onPrev={goUsersPrev}
                        onNext={goUsersNext}
                        total={counts.users}
                        pageSize={ADMIN_LIST_PAGE_SIZE}
                        shownCount={filteredDirectory.length}
                        label="usuarios"
                        labelSingular="usuario"
                        filterActive={directoryFilterActive}
                    />
                </section>

                <section className="admin-module-panel admin-module-directory" ref={communitiesListRef}>
                    <div className="admin-module-directory-head">
                        <h3 className="admin-module-panel-title">
                            <Building2 size={18} /> Comunidades
                        </h3>
                        <Link to="/communities" className="admin-module-link admin-module-manage-link">
                            Gestionar
                        </Link>
                    </div>
                    <div className="admin-module-directory-search">
                        <Search size={16} className="admin-module-directory-search-icon" aria-hidden />
                        <input
                            type="search"
                            className="admin-module-input admin-module-input--search"
                            placeholder="Buscar por nombre o identificador…"
                            value={communitiesDirectoryFilter}
                            onChange={(e) => setCommunitiesDirectoryFilter(e.target.value)}
                            autoComplete="off"
                            aria-label="Buscar comunidades"
                        />
                    </div>
                    {communitiesErr && (
                        <p className="admin-module-msg admin-module-msg--muted">{communitiesErr}</p>
                    )}
                    <div className="admin-module-scroll admin-module-scroll--directory">
                        <table className="admin-module-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>ID</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {!communitiesLoading && filteredCommunitiesDirectory.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="admin-module-msg admin-module-msg--muted">
                                            {communities.length === 0
                                                ? 'No hay comunidades para mostrar.'
                                                : 'Ninguna comunidad coincide con la búsqueda.'}
                                        </td>
                                    </tr>
                                )}
                                {filteredCommunitiesDirectory.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <strong>{c.name || '—'}</strong>
                                            {c.description && (
                                                <div className="admin-module-meta admin-module-desc">
                                                    {c.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="admin-module-meta mono">{c.id}</td>
                                        <td>
                                            <Link
                                                to={`/communities/${c.id}`}
                                                className="admin-module-link"
                                            >
                                                Ver
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <AdminPaginationBar
                        page={communitiesPage}
                        hasMore={communitiesHasMore}
                        loading={communitiesLoading}
                        onPrev={goCommunitiesPrev}
                        onNext={goCommunitiesNext}
                        total={counts.communities}
                        pageSize={ADMIN_LIST_PAGE_SIZE}
                        shownCount={filteredCommunitiesDirectory.length}
                        label="comunidades"
                        labelSingular="comunidad"
                        filterActive={communitiesDirectoryFilterActive}
                    />
                </section>
            </div>
        </div>
    );
}
