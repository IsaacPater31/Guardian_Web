import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

const PAGE_SIZE = 8;

/**
 * Bottom map strip: multi-select communities with client pagination.
 *
 * Selection model:
 * - `null`  → all communities (default)
 * - `[]`    → none (empty map)
 * - `string[]` → subset
 */
export default function MapCommunityFilterBar({
    communities = [],
    selectedIds = null,
    onChange,
}) {
    const [page, setPage] = useState(0);
    const totalPages = Math.max(1, Math.ceil(communities.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);

    const pageItems = useMemo(() => {
        const start = safePage * PAGE_SIZE;
        return communities.slice(start, start + PAGE_SIZE);
    }, [communities, safePage]);

    const isAll = selectedIds == null;
    const selectedCount = isAll ? 0 : selectedIds.length;

    function toggle(id) {
        if (!onChange) return;
        if (isAll) {
            onChange([id]);
            return;
        }
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
            return;
        }
        const next = [...selectedIds, id];
        onChange(next.length === communities.length ? null : next);
    }

    function selectAll() {
        onChange?.(null);
    }

    if (!communities.length) return null;

    return (
        <aside
            className="map-community-filter-bar"
            aria-label="Filtrar alertas por comunidad"
        >
            <div className="map-community-filter-bar-head">
                <div className="map-community-filter-bar-title">
                    <Users size={14} aria-hidden />
                    <span>Comunidades</span>
                    <span className="map-community-filter-bar-count" aria-live="polite">
                        {isAll ? 'Todas' : selectedCount === 0 ? 'Ninguna' : `${selectedCount} sel.`}
                    </span>
                </div>
                <div className="map-community-filter-bar-actions">
                    <button
                        type="button"
                        className="map-community-filter-link"
                        onClick={selectAll}
                        disabled={isAll}
                    >
                        Todas
                    </button>
                    {totalPages > 1 && (
                        <div className="map-community-filter-pager" role="navigation" aria-label="Páginas de comunidades">
                            <button
                                type="button"
                                className="map-community-filter-page-btn"
                                aria-label="Página anterior"
                                disabled={safePage <= 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                                <ChevronLeft size={16} aria-hidden />
                            </button>
                            <span className="map-community-filter-page-label">
                                {safePage + 1}/{totalPages}
                            </span>
                            <button
                                type="button"
                                className="map-community-filter-page-btn"
                                aria-label="Página siguiente"
                                disabled={safePage >= totalPages - 1}
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            >
                                <ChevronRight size={16} aria-hidden />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="map-community-filter-chips" role="group" aria-label="Comunidades">
                {pageItems.map((c) => {
                    const active = isAll || selectedIds.includes(c.id);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            className={`map-community-filter-chip${(!isAll && selectedIds.includes(c.id)) ? ' active' : ''}${isAll ? ' all-mode' : ''}`}
                            aria-pressed={!isAll && selectedIds.includes(c.id)}
                            onClick={() => toggle(c.id)}
                            title={c.name}
                        >
                            {c.name}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
