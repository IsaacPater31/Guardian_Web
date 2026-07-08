import { COMMUNITY_ICON_CATALOG } from '../../config/communityIconCatalog';

/**
 * Selector de icono para crear/editar comunidades en el panel admin.
 */
export default function CommunityIconPickerGrid({
    selectedCodePoint,
    onSelect,
}) {
    return (
        <div className="community-icon-picker">
            <p className="community-icon-picker-label">Icono de la comunidad</p>
            <div className="community-icon-picker-grid" role="listbox" aria-label="Icono de la comunidad">
                {COMMUNITY_ICON_CATALOG.map((option) => {
                    const isSelected = option.codePoint === selectedCodePoint;
                    return (
                        <button
                            key={option.codePoint}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            title={option.label}
                            className={`community-icon-picker-cell${isSelected ? ' is-selected' : ''}`}
                            onClick={() => onSelect(option)}
                        >
                            <span className="community-icon-glyph">
                                {String.fromCodePoint(option.codePoint)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
