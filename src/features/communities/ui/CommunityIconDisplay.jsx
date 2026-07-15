import {
    DEFAULT_ICON_CODE_POINT,
    DEFAULT_ICON_COLOR,
    colorFromHex,
} from '@/shared/config/communityIconCatalog';

/**
 * Muestra el icono de una comunidad por codePoint y color (misma fuente que la app móvil).
 */
export default function CommunityIconDisplay({
    iconCodePoint,
    iconColor,
    size = 48,
    className = '',
}) {
    const codePoint = iconCodePoint ?? DEFAULT_ICON_CODE_POINT;
    const color = colorFromHex(iconColor || DEFAULT_ICON_COLOR);
    const radius = Math.round(size * 0.28);
    const glyphSize = Math.round(size * 0.5);

    return (
        <span
            className={`community-icon-display ${className}`.trim()}
            style={{
                width: size,
                height: size,
                borderRadius: radius,
                border: `1px solid ${color}26`,
                background: `linear-gradient(135deg, ${color}1f, ${color}0f)`,
            }}
            aria-hidden="true"
        >
            <span
                className="community-icon-glyph"
                style={{
                    fontSize: glyphSize,
                    color,
                }}
            >
                {String.fromCodePoint(codePoint)}
            </span>
        </span>
    );
}
