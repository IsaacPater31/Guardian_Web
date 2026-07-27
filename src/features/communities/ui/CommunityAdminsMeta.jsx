import { Shield } from 'lucide-react';

/**
 * Bloque clínico de administradores (estilo Apple Settings).
 * @param {{ names?: string[], compact?: boolean }} props
 */
export default function CommunityAdminsMeta({ names = [], compact = false }) {
    const list = [...new Set(
        (names || []).map((n) => String(n ?? '').trim()).filter(Boolean),
    )];
    if (list.length === 0) return null;

    const label = list.length === 1 ? 'Admin' : 'Admins';

    return (
        <div
            className={
                compact
                    ? 'community-admins-meta community-admins-meta--compact'
                    : 'community-admins-meta'
            }
            aria-label={`${label}: ${list.join(', ')}`}
        >
            <div className="community-admins-meta-label">
                <span className="community-admins-meta-icon" aria-hidden>
                    <Shield size={compact ? 10 : 11} strokeWidth={2.25} />
                </span>
                {label}
            </div>
            <div className="community-admins-meta-names">
                {list.map((name) => (
                    <span key={name} className="community-admins-chip" title={name}>
                        {name}
                    </span>
                ))}
            </div>
        </div>
    );
}
