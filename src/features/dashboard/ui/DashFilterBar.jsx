import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Users } from 'lucide-react';
import { PRESET_DAYS, formatPeriodSummary } from '@/features/dashboard/utils/analysisHelpers';
import {
    filterStatsOptionsByKind,
    reconcileSelectedCommunityIds,
} from '@/features/dashboard/utils/statsScope';

function scopeCopy({ kind, isAll, selectedCount, visibleCount }) {
    const kindNoun =
        kind === 'entities'
            ? { singular: 'entidad', plural: 'entidades', all: 'Todas las entidades' }
            : kind === 'communities'
              ? { singular: 'comunidad', plural: 'comunidades', all: 'Todas las comunidades' }
              : {
                    singular: 'comunidad o entidad',
                    plural: 'comunidades y entidades',
                    all: 'Todas las comunidades y entidades',
                };

    if (isAll) {
        return {
            kicker: 'Alcance',
            label: kindNoun.all,
            aria: `Alcance: ${kindNoun.all.toLowerCase()}. Abrir para filtrar.`,
        };
    }
    if (selectedCount === 0) {
        return {
            kicker: 'Alcance',
            label: 'Ninguna seleccionada',
            aria: 'Alcance: ninguna comunidad o entidad seleccionada. Abrir para elegir.',
        };
    }
    if (selectedCount === 1) {
        return {
            kicker: 'Alcance',
            label: `1 ${kindNoun.singular}`,
            aria: `Alcance: 1 ${kindNoun.singular} seleccionada. Abrir para cambiar.`,
        };
    }
    return {
        kicker: 'Alcance',
        label: `${selectedCount} de ${visibleCount} ${kindNoun.plural}`,
        aria: `Alcance: ${selectedCount} de ${visibleCount} ${kindNoun.plural} seleccionadas. Abrir para cambiar.`,
    };
}

/**
 * Compact glass filter bar: period + community/entity scope.
 * Presentation only — selection/options owned by the dashboard controller (ETC).
 */
export default function DashFilterBar({
    rangeMode,
    presetDays,
    customStart,
    customEnd,
    rangeStart,
    rangeEnd,
    kind = 'all',
    onKindChange,
    onPreset,
    onCustomMode,
    onCustomStart,
    onCustomEnd,
    /** Precomputed options for current kind (single source from Dashboard). */
    visibleOptions = [],
    /** Full options list (all kinds) for reconcile when kind changes. */
    allOptions = [],
    selectedCommunityIds = null,
    onCommunityChange,
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const periodSummary = formatPeriodSummary(rangeStart, rangeEnd);
    const isAllCommunities = selectedCommunityIds == null;
    const selectedCount = isAllCommunities ? 0 : selectedCommunityIds.length;
    const scope = scopeCopy({
        kind,
        isAll: isAllCommunities,
        selectedCount,
        visibleCount: visibleOptions.length,
    });

    useEffect(() => {
        if (!pickerOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setPickerOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pickerOpen]);

    function setKindAndReconcile(nextKind) {
        onKindChange?.(nextKind);
        const nextVisible = filterStatsOptionsByKind(allOptions, nextKind);
        const reconciled = reconcileSelectedCommunityIds(selectedCommunityIds, nextVisible);
        if (reconciled !== selectedCommunityIds) {
            onCommunityChange?.(reconciled);
        }
    }

    function toggleCommunity(id) {
        if (!onCommunityChange) return;
        if (isAllCommunities) {
            onCommunityChange([id]);
            return;
        }
        if (selectedCommunityIds.includes(id)) {
            onCommunityChange(selectedCommunityIds.filter((x) => x !== id));
            return;
        }
        const next = [...selectedCommunityIds, id];
        onCommunityChange(next.length === visibleOptions.length ? null : next);
    }

    return (
        <div className="dash-glass-toolbar" role="region" aria-label="Filtros de estadísticas">
            <div className="dash-glass-toolbar-row">
                <div className="dash-glass-period">
                    <span className="dash-filter-field-label" id="dash-period-label">
                        Periodo
                    </span>
                    <div
                        className="admin-segmented admin-segmented--ios admin-segmented--scroll dash-glass-segments"
                        role="group"
                        aria-labelledby="dash-period-label"
                    >
                        {PRESET_DAYS.map(({ days: d, label, ariaLabel }) => (
                            <button
                                key={d}
                                type="button"
                                className={`admin-segment${
                                    rangeMode === 'preset' && presetDays === d ? ' active' : ''
                                }`}
                                aria-pressed={rangeMode === 'preset' && presetDays === d}
                                aria-label={ariaLabel || label}
                                onClick={() => onPreset?.(d)}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`admin-segment${rangeMode === 'custom' ? ' active' : ''}`}
                            aria-pressed={rangeMode === 'custom'}
                            aria-label="Elegir rango de fechas personalizado"
                            onClick={() => onCustomMode?.()}
                        >
                            Personalizado
                        </button>
                    </div>
                    <span className="dash-glass-period-summary" aria-live="polite">
                        {periodSummary}
                    </span>
                </div>

                <div className="dash-glass-scope">
                    <span className="dash-filter-field-label" id="dash-kind-label">
                        Tipo
                    </span>
                    <div
                        className="admin-segmented admin-segmented--ios dash-kind-segments"
                        role="group"
                        aria-labelledby="dash-kind-label"
                    >
                        {[
                            { key: 'all', label: 'Todos', aria: 'Mostrar comunidades y entidades' },
                            { key: 'communities', label: 'Comunidades', aria: 'Solo comunidades' },
                            { key: 'entities', label: 'Entidades', aria: 'Solo entidades' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`admin-segment${kind === opt.key ? ' active' : ''}`}
                                aria-pressed={kind === opt.key}
                                aria-label={opt.aria}
                                onClick={() => setKindAndReconcile(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={`dash-scope-btn${pickerOpen ? ' open' : ''}${!isAllCommunities ? ' filtered' : ''}`}
                        aria-expanded={pickerOpen}
                        aria-controls="dash-community-picker"
                        aria-label={scope.aria}
                        onClick={() => setPickerOpen((v) => !v)}
                    >
                        <Users size={16} aria-hidden className="dash-scope-btn-icon" />
                        <span className="dash-scope-btn-copy">
                            <span className="dash-scope-btn-kicker">{scope.kicker}</span>
                            <span className="dash-scope-btn-label">{scope.label}</span>
                        </span>
                        <ChevronDown size={16} aria-hidden className={pickerOpen ? 'dash-scope-chevron open' : 'dash-scope-chevron'} />
                    </button>
                </div>
            </div>

            {rangeMode === 'custom' && (
                <div className="dash-glass-custom admin-custom-range admin-custom-range--inline admin-custom-range--animate">
                    <label className="admin-date-field">
                        <span className="admin-date-field-label">Desde</span>
                        <input
                            type="date"
                            className="admin-date-input"
                            value={customStart}
                            max={customEnd || new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onCustomStart?.(e.target.value)}
                        />
                    </label>
                    <span className="admin-custom-range-sep" aria-hidden>
                        —
                    </span>
                    <label className="admin-date-field">
                        <span className="admin-date-field-label">Hasta</span>
                        <input
                            type="date"
                            className="admin-date-input"
                            value={customEnd}
                            min={customStart || undefined}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onCustomEnd?.(e.target.value)}
                        />
                    </label>
                </div>
            )}

            {pickerOpen && (
                <div
                    id="dash-community-picker"
                    className="dash-community-picker"
                    role="group"
                    aria-label="Seleccionar comunidades o entidades del alcance"
                >
                    <div className="dash-community-picker-head">
                        <button
                            type="button"
                            className="dash-community-picker-reset"
                            onClick={() => onCommunityChange?.(null)}
                            disabled={isAllCommunities}
                            aria-label={
                                kind === 'entities'
                                    ? 'Incluir todas las entidades visibles'
                                    : kind === 'communities'
                                      ? 'Incluir todas las comunidades visibles'
                                      : 'Incluir todas las comunidades y entidades visibles'
                            }
                        >
                            Incluir todas
                        </button>
                        <span className="dash-community-picker-hint">
                            {visibleOptions.length === 1
                                ? '1 disponible en este tipo'
                                : `${visibleOptions.length} disponibles en este tipo`}
                        </span>
                    </div>
                    <div className="dash-community-picker-chips">
                        {visibleOptions.length === 0 ? (
                            <p className="admin-muted admin-empty-inset">
                                No hay {kind === 'entities' ? 'entidades' : kind === 'communities' ? 'comunidades' : 'elementos'} en este filtro.
                            </p>
                        ) : (
                            visibleOptions.map((c) => {
                                const pressed = isAllCommunities || selectedCommunityIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`dash-scope-chip${pressed && !isAllCommunities ? ' active' : ''}${isAllCommunities ? ' all-mode' : ''}${c.isEntity ? ' entity' : ''}`}
                                        aria-pressed={pressed}
                                        aria-label={`${c.name}, ${c.kindLabel}${pressed ? ', incluida' : ', excluida'}`}
                                        onClick={() => toggleCommunity(c.id)}
                                        title={`${c.name} · ${c.kindLabel}`}
                                    >
                                        {c.isEntity ? (
                                            <Building2 size={12} aria-hidden />
                                        ) : (
                                            <Users size={12} aria-hidden />
                                        )}
                                        <span>{c.name}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
