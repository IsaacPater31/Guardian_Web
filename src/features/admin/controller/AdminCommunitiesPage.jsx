import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search } from 'lucide-react';
import AdminPaginationBar from '@/features/admin/ui/AdminPaginationBar';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import { fetchCommunitiesCount } from '@/features/admin/repository/adminDirectoryRepository';
import { fetchCommunitiesPage } from '@/features/communities/repository/communityRepository';

/**
 * Admin directory: communities list + search.
 */
export default function AdminCommunitiesPage() {
    const listRef = useRef(null);
    const cursorsRef = useRef([null]);

    const [total, setTotal] = useState(null);
    const [totalErr, setTotalErr] = useState(null);
    const [totalLoading, setTotalLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [communities, setCommunities] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [directoryFilter, setDirectoryFilter] = useState('');

    useEffect(() => {
        let cancelled = false;
        setTotalLoading(true);
        setTotalErr(null);
        fetchCommunitiesCount()
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
                const result = await fetchCommunitiesPage({
                    pageSize: ADMIN_LIST_PAGE_SIZE,
                    cursor,
                });
                if (cancelled) return;
                cursorsRef.current[page] = result.lastDoc;
                setCommunities(result.items);
                setHasMore(result.hasMore);
            } catch (e) {
                if (!cancelled) {
                    setErr(e?.message || 'No se pudo cargar el listado');
                    setCommunities([]);
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

    const filterActive = directoryFilter.trim().length > 0;

    const filteredDirectory = useMemo(() => {
        const f = directoryFilter.trim().toLowerCase();
        if (!f) return communities;
        return communities.filter((c) => {
            const name = (c.name || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            return name.includes(f) || desc.includes(f);
        });
    }, [communities, directoryFilter]);

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

    return (
        <div className="admin-module-page">
            <div className="admin-module-intro">
                <Building2 size={22} className="admin-module-intro-icon" aria-hidden />
                <div>
                    <h2 className="admin-module-title">Comunidades</h2>
                    <p className="admin-module-sub">Directorio de comunidades y entidades.</p>
                </div>
            </div>

            {totalErr && (
                <div className="admin-module-banner admin-module-banner--error">{totalErr}</div>
            )}

            <div className="admin-stats-grid admin-stats-grid--single">
                <div className="stat-card stat-card--dash">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Comunidades</span>
                        <div className="stat-card-icon" aria-hidden>
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="stat-card-value">
                        {totalLoading || total == null ? '—' : total.toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <section className="admin-module-panel admin-module-directory" ref={listRef}>
                <div className="admin-module-directory-head">
                    <h3 className="admin-module-panel-title">Directorio</h3>
                    <Link to="/communities" className="admin-module-link admin-module-manage-link">
                        Gestionar
                    </Link>
                </div>
                <div className="admin-module-directory-search">
                    <Search size={16} className="admin-module-directory-search-icon" aria-hidden />
                    <input
                        type="search"
                        className="admin-module-input admin-module-input--search"
                        placeholder="Buscar por nombre…"
                        value={directoryFilter}
                        onChange={(e) => setDirectoryFilter(e.target.value)}
                        autoComplete="off"
                        aria-label="Buscar comunidades"
                    />
                </div>
                {err && <p className="admin-module-msg admin-module-msg--muted">{err}</p>}
                <div className="admin-module-scroll admin-module-scroll--directory">
                    <table className="admin-module-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && filteredDirectory.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="admin-module-msg admin-module-msg--muted">
                                        {communities.length === 0
                                            ? 'No hay comunidades para mostrar.'
                                            : 'Ninguna comunidad coincide con la búsqueda.'}
                                    </td>
                                </tr>
                            )}
                            {filteredDirectory.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <strong>{c.name || '—'}</strong>
                                        {c.description && (
                                            <div className="admin-module-meta admin-module-desc">
                                                {c.description}
                                            </div>
                                        )}
                                    </td>
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
                    page={page}
                    hasMore={hasMore}
                    loading={loading}
                    onPrev={goPrev}
                    onNext={goNext}
                    total={total}
                    pageSize={ADMIN_LIST_PAGE_SIZE}
                    shownCount={filteredDirectory.length}
                    label="comunidades"
                    labelSingular="comunidad"
                    filterActive={filterActive}
                />
            </section>
        </div>
    );
}
