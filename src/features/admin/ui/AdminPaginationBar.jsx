import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

function formatItemCount(count, singular, plural) {
    const n = count ?? 0;
    if (n === 1) return `1 ${singular}`;
    return `${n.toLocaleString('es-CO')} ${plural}`;
}

function buildSummary({
    loading,
    page,
    pageSize,
    shownCount,
    total,
    singular,
    plural,
    filterActive,
}) {
    if (loading) return null;

    const label = formatItemCount(shownCount, singular, plural);

    if (total != null && total > 0 && shownCount > 0) {
        const from = (page - 1) * pageSize + 1;
        const to = from + shownCount - 1;
        return `Mostrando ${from.toLocaleString('es-CO')}–${to.toLocaleString('es-CO')} de ${total.toLocaleString('es-CO')} ${plural}`;
    }

    if (total === 0) return `Sin ${plural}`;

    if (filterActive && shownCount > 0) {
        return `${label} con los filtros aplicados`;
    }

    if (shownCount > 0) return label;

    return page > 1 ? `Sin ${plural} en esta página` : `Sin ${plural}`;
}

/**
 * Navegación entre páginas para listados (admin, comunidades, alertas).
 * Textos orientados al usuario; sin detalles técnicos de tamaño de página.
 */
export default function AdminPaginationBar({
    page,
    hasMore,
    loading,
    onPrev,
    onNext,
    total = null,
    pageSize,
    shownCount,
    label = 'registros',
    labelSingular = null,
    filterActive = false,
    className = '',
}) {
    const singular = labelSingular ?? (label.endsWith('s') ? label.slice(0, -1) : label);
    const plural = label;
    const summary = buildSummary({
        loading,
        page,
        pageSize,
        shownCount,
        total,
        singular,
        plural,
        filterActive,
    });

    const canGoPrev = page > 1 && !loading;
    const canGoNext = hasMore && !loading;
    const showBar = page > 1 || hasMore || shownCount > 0 || loading;

    if (!showBar) return null;

    return (
        <nav
            className={`admin-pagination-bar${className ? ` ${className}` : ''}`}
            aria-label="Navegación de páginas"
        >
            <div className="admin-pagination-summary" aria-live="polite" aria-atomic="true">
                {loading ? (
                    <span className="admin-pagination-loading">
                        <Loader2 size={16} className="admin-pagination-spinner" aria-hidden />
                        Cargando resultados…
                    </span>
                ) : (
                    <>
                        {filterActive && shownCount > 0 && (
                            <span className="admin-pagination-filter-tag">Filtrado</span>
                        )}
                        <span>{summary}</span>
                    </>
                )}
            </div>

            <div className="admin-pagination-controls">
                <button
                    type="button"
                    className="admin-pagination-btn"
                    disabled={!canGoPrev}
                    onClick={onPrev}
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={18} aria-hidden />
                    <span>Anterior</span>
                </button>

                <span className="admin-pagination-page" aria-current="page">
                    Página {page}
                </span>

                <button
                    type="button"
                    className="admin-pagination-btn admin-pagination-btn--next"
                    disabled={!canGoNext}
                    onClick={onNext}
                    aria-label="Página siguiente"
                >
                    <span>Siguiente</span>
                    <ChevronRight size={18} aria-hidden />
                </button>
            </div>
        </nav>
    );
}
