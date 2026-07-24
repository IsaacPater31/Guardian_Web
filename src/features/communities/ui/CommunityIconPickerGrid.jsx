import { useMemo, useState } from 'react';
import {
    COMMUNITY_ICON_CATALOG,
    COMMUNITY_ICON_CATEGORIES,
    DEFAULT_ICON_COLOR,
    entriesForCategory,
} from '@/shared/config/communityIconCatalog';

/**
 * Shared glyph picker (community, entity, or emergency-type).
 * Callers MUST pass a contextual [label] from `iconPickerLabels.js`.
 */
export default function CommunityIconPickerGrid({
    selectedCodePoint,
    selectedColor,
    onChange,
    onSelect,
    label,
}) {
    if (!label) {
        throw new Error(
            'CommunityIconPickerGrid: `label` is required (use iconPickerLabel / IconPickerDomain).',
        );
    }

    const categories = useMemo(
        () =>
            COMMUNITY_ICON_CATEGORIES.filter(
                (c) => entriesForCategory(c.id).length > 0,
            ),
        [],
    );

    const initialCategory = useMemo(() => {
        if (selectedCodePoint != null) {
            const selected = COMMUNITY_ICON_CATALOG.find(
                (o) => o.codePoint === selectedCodePoint,
            );
            if (selected) return selected.category;
        }
        return categories[0]?.id ?? null;
    }, [categories, selectedCodePoint]);

    const [categoryId, setCategoryId] = useState(initialCategory);

    const colorValue = (() => {
        const raw = String(selectedColor || '').trim();
        if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toUpperCase();
        return DEFAULT_ICON_COLOR;
    })();

    const visibleIcons = categoryId
        ? entriesForCategory(categoryId)
        : COMMUNITY_ICON_CATALOG;

    function emit(next) {
        onChange?.(next);
        if (onSelect && next.iconCodePoint != null) {
            const option = COMMUNITY_ICON_CATALOG.find(
                (o) => o.codePoint === next.iconCodePoint,
            );
            if (option) onSelect(option);
        }
    }

    return (
        <div className="community-icon-picker">
            <p className="community-icon-picker-label">{label}</p>
            <div
                className="community-icon-picker-categories"
                role="tablist"
                aria-label="Categorías de iconos"
            >
                {categories.map((category) => {
                    const selected = category.id === categoryId;
                    return (
                        <button
                            key={category.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`community-icon-picker-category${selected ? ' is-selected' : ''}`}
                            onClick={() => setCategoryId(category.id)}
                        >
                            {category.labelEs}
                        </button>
                    );
                })}
            </div>
            <div
                className="community-icon-picker-grid"
                role="listbox"
                aria-label={label}
            >
                {visibleIcons.map((option) => {
                    const isSelected = option.codePoint === selectedCodePoint;
                    return (
                        <button
                            key={option.codePoint}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            title={`${option.labelEs} / ${option.labelEn}`}
                            className={`community-icon-picker-cell${isSelected ? ' is-selected' : ''}`}
                            onClick={() =>
                                emit({
                                    iconCodePoint: option.codePoint,
                                    iconColor: option.colorHex,
                                })
                            }
                        >
                            <span
                                className="community-icon-glyph"
                                style={{ color: option.colorHex }}
                            >
                                {String.fromCodePoint(option.codePoint)}
                            </span>
                        </button>
                    );
                })}
            </div>
            {onChange ? (
                <label className="login-label" style={{ marginTop: 12 }}>
                    Color del icono
                    <div className="admin-color-field">
                        <input
                            type="color"
                            className="admin-color-input"
                            value={colorValue}
                            onChange={(e) =>
                                emit({
                                    iconCodePoint: selectedCodePoint,
                                    iconColor: e.target.value,
                                })
                            }
                            aria-label="Color del icono"
                        />
                        <input
                            className="login-input admin-color-hex"
                            value={colorValue}
                            onChange={(e) =>
                                emit({
                                    iconCodePoint: selectedCodePoint,
                                    iconColor: e.target.value,
                                })
                            }
                            placeholder={DEFAULT_ICON_COLOR}
                        />
                    </div>
                </label>
            ) : null}
        </div>
    );
}
