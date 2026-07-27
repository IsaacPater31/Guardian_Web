import { useMemo, useState } from 'react';
import { Building2, Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';

const PAGE_SIZE = 10;

/**
 * Inline community/entity multi-select (Alerts, etc.).
 * Selection: null = all, [] = none, string[] = subset.
 *
 * @param {Array<{ id: string, name: string, isEntity?: boolean }>} communities
 */
export default function CommunityScopeFilterBar({
    communities = [],
    selectedIds = null,
    onChange,
    title = 'Comunidades',
    ariaLabel = 'Filtrar por comunidad o entidad',
    accent = 'community',
    hideWhenEmpty = true,
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
    const TitleIcon = accent === 'entity' ? Building2 : Users;

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

    if (hideWhenEmpty && !communities.length) return null;

    return (
        <div
            className={`community-scope-filter${accent === 'entity' ? ' community-scope-filter--entity' : ''}`}
            aria-label={ariaLabel}
        >
            <div className="map-community-filter-bar-head">
                <div className="map-community-filter-bar-title">
                    <TitleIcon size={14} aria-hidden />
                    <span>{title}</span>
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
                        <div
                            className="map-community-filter-pager"
                            role="navigation"
                            aria-label={`Páginas de ${title.toLowerCase()}`}
                        >
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

            <div className="map-community-filter-chips" role="group" aria-label={title}>
                {pageItems.map((c) => {
                    const pressed = !isAll && selectedIds.includes(c.id);
                    const chipEntity = c.isEntity === true;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            className={`map-community-filter-chip${pressed ? ' active' : ''}${isAll ? ' all-mode' : ''}${chipEntity ? ' entity' : ''}`}
                            aria-pressed={pressed}
                            onClick={() => toggle(c.id)}
                            title={c.name}
                        >
                            {pressed && (
                                <Check size={13} aria-hidden className="community-scope-chip-check" />
                            )}
                            <span className="community-scope-chip-name">{c.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
