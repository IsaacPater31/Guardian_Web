import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import AdminPaginationBar from '@/features/admin/ui/AdminPaginationBar';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import {
    fetchUsersCount,
    fetchUsersPage,
    searchUsersByText,
} from '@/features/admin/repository/adminDirectoryRepository';

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

/**
 * Admin directory: users list + search.
 */
export default function AdminUsersPage() {
    const navigate = useNavigate();
    const listRef = useRef(null);
    const searchDebounceRef = useRef(null);
    const cursorsRef = useRef([null]);

    const [total, setTotal] = useState(null);
    const [totalErr, setTotalErr] = useState(null);
    const [totalLoading, setTotalLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    const [directoryFilter, setDirectoryFilter] = useState('');
    const [globalHits, setGlobalHits] = useState([]);
    const [globalSearching, setGlobalSearching] = useState(false);
    const [globalSearchErr, setGlobalSearchErr] = useState('');

    useEffect(() => {
        let cancelled = false;
        setTotalLoading(true);
        setTotalErr(null);
        fetchUsersCount()
            .then((n) => {
                if (!cancelled) {
                    setTotal(n);
                    setTotalErr(null);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setTotalErr(e?.message || 'No se pudo cargar el total');
                    setTotal(null);
                }
            })
            .finally(() => {
                if (!cancelled) setTotalLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setErr(null);
            const cursor = page > 1 ? cursorsRef.current[page - 1] : null;
            try {
                const result = await fetchUsersPage({
                    pageSize: ADMIN_LIST_PAGE_SIZE,
                    cursor,
                });
                if (cancelled) return;
                cursorsRef.current[page] = result.lastDoc;
                setUsers(result.items);
                setHasMore(result.hasMore);
            } catch (e) {
                if (!cancelled) {
                    setErr(e?.message || 'No se pudo cargar el listado');
                    setUsers([]);
                    setHasMore(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [page]);

    useEffect(() => {
        const q = directoryFilter.trim();
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (q.length < 2) {
            setGlobalHits([]);
            setGlobalSearchErr('');
            setGlobalSearching(false);
            return undefined;
        }
        setGlobalSearching(true);
        setGlobalSearchErr('');
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const hits = await searchUsersByText(q, { limit: 10 });
                setGlobalHits(hits);
            } catch (e) {
                setGlobalHits([]);
                setGlobalSearchErr(e?.message || 'No se pudo buscar usuarios');
            } finally {
                setGlobalSearching(false);
            }
        }, 350);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [directoryFilter]);

    const filterActive = directoryFilter.trim().length > 0;
    const useGlobalSearch = directoryFilter.trim().length >= 2;

    const filteredDirectory = useMemo(() => {
        if (useGlobalSearch) return globalHits;
        const f = directoryFilter.trim().toLowerCase();
        if (!f) return users;
        return users.filter((u) => {
            const email = (u.email || '').toLowerCase();
            const name = (u.displayName || '').toLowerCase();
            const phone = (u.phone || '').replace(/\s/g, '').toLowerCase();
            const fq = f.replace(/\s/g, '');
            return email.includes(f) || name.includes(f) || (phone && phone.includes(fq));
        });
    }, [users, directoryFilter, useGlobalSearch, globalHits]);

    function scrollIntoView() {
        requestAnimationFrame(() => {
            listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function goPrev() {
        if (page > 1) {
            setPage((p) => p - 1);
            scrollIntoView();
        }
    }

    function goNext() {
        if (hasMore) {
            setPage((p) => p + 1);
            scrollIntoView();
        }
    }

    function openUser(userId) {
        if (!userId) return;
        navigate(`/admin/users/${userId}`);
    }

    return (
        <div className="admin-module-page">
            <div className="admin-module-intro">
                <Users size={22} className="admin-module-intro-icon" aria-hidden />
                <div>
                    <h2 className="admin-module-title">Usuarios</h2>
                    <p className="admin-module-sub">Directorio y gestión de cuentas.</p>
                </div>
            </div>

            {totalErr && (
                <div className="admin-module-banner admin-module-banner--error">{totalErr}</div>
            )}

            <div className="admin-stats-grid admin-stats-grid--single">
                <div className="stat-card stat-card--dash">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Usuarios registrados</span>
                        <div className="stat-card-icon" aria-hidden>
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="stat-card-value">
                        {totalLoading || total == null ? '—' : total.toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <section className="admin-module-panel admin-module-directory" ref={listRef}>
                <div className="admin-module-directory-search">
                    <Search size={16} className="admin-module-directory-search-icon" aria-hidden />
                    <input
                        type="search"
                        className="admin-module-input admin-module-input--search"
                        placeholder="Buscar por nombre o correo…"
                        value={directoryFilter}
                        onChange={(e) => setDirectoryFilter(e.target.value)}
                        autoComplete="off"
                        aria-label="Buscar usuarios"
                    />
                </div>
                {useGlobalSearch && (
                    <p className="admin-module-msg admin-module-msg--muted">
                        {globalSearching
                            ? 'Buscando en el directorio…'
                            : globalSearchErr
                              ? globalSearchErr
                              : `${filteredDirectory.length} coincidencia(s) (búsqueda global).`}
                    </p>
                )}
                {err && <p className="admin-module-msg admin-module-msg--muted">{err}</p>}
                <div className="admin-module-scroll admin-module-scroll--directory">
                    <table className="admin-module-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Contacto</th>
                                <th>Alta</th>
                                <th> </th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && !globalSearching && filteredDirectory.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="admin-module-msg admin-module-msg--muted">
                                        {users.length === 0 && !useGlobalSearch
                                            ? 'No hay usuarios para mostrar.'
                                            : 'Ningún usuario coincide con la búsqueda.'}
                                    </td>
                                </tr>
                            )}
                            {filteredDirectory.map((u) => (
                                <tr
                                    key={u.id}
                                    className="admin-module-row-link"
                                    onClick={() => openUser(u.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openUser(u.id);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="link"
                                >
                                    <td>
                                        {u.displayName || '—'}
                                        {u.suspended ? (
                                            <span className="admin-module-badge admin-module-badge--danger">
                                                Suspendido
                                            </span>
                                        ) : null}
                                    </td>
                                    <td>
                                        {u.email ? (
                                            <span className="admin-user-contact-line">{u.email}</span>
                                        ) : null}
                                        {u.phone ? (
                                            <span className="admin-user-contact-line">{u.phone}</span>
                                        ) : null}
                                        {!u.email && !u.phone ? '—' : null}
                                    </td>
                                    <td>{formatUserDate(u.createdAt)}</td>
                                    <td>
                                        <Link
                                            to={`/admin/users/${u.id}`}
                                            className="admin-module-link"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Gestionar
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!useGlobalSearch && (
                    <AdminPaginationBar
                        page={page}
                        hasMore={hasMore}
                        loading={loading}
                        onPrev={goPrev}
                        onNext={goNext}
                        total={total}
                        pageSize={ADMIN_LIST_PAGE_SIZE}
                        shownCount={filteredDirectory.length}
                        label="usuarios"
                        labelSingular="usuario"
                        filterActive={filterActive}
                    />
                )}
            </section>
        </div>
    );
}
