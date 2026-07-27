import { UserPlus } from 'lucide-react';

/**
 * Add-member search + role select (community detail).
 */
export default function AddMemberPanel({
    roles,
    memberSearch,
    onMemberSearchChange,
    newRole,
    onNewRoleChange,
    searching,
    searchErr,
    searchResults,
    busy,
    onAddMember,
}) {
    return (
        <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="section-header">
                <div className="section-header-left">
                    <div className="section-icon" style={{ background: 'rgba(52, 199, 89, 0.12)' }}>
                        <UserPlus size={18} style={{ color: '#34C759' }} />
                    </div>
                    <div>
                        <h3 className="section-title">Agregar miembro</h3>
                        <p className="section-subtitle">
                            Busca por nombre o correo y elige el rol
                        </p>
                    </div>
                </div>
            </div>
            <div className="section-body">
                <div className="admin-add-form admin-add-form--stacked">
                    <input
                        className="login-input"
                        placeholder="Nombre o correo"
                        value={memberSearch}
                        onChange={(e) => onMemberSearchChange(e.target.value)}
                        autoComplete="off"
                    />
                    <select
                        className="login-input admin-select"
                        value={newRole}
                        onChange={(e) => onNewRoleChange(e.target.value)}
                    >
                        {roles.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
                {searching && (
                    <p className="admin-muted" style={{ marginTop: 'var(--space-2)' }}>
                        Buscando…
                    </p>
                )}
                {searchErr && (
                    <div className="login-error" style={{ marginTop: 'var(--space-2)' }}>
                        {searchErr}
                    </div>
                )}
                {!searching && memberSearch.trim().length >= 2 && searchResults.length === 0 && (
                    <p className="admin-muted" style={{ marginTop: 'var(--space-2)' }}>
                        Sin coincidencias.
                    </p>
                )}
                {searchResults.length > 0 && (
                    <ul className="member-search-results">
                        {searchResults.map((user) => (
                            <li key={user.id} className="member-search-result">
                                <div className="member-search-result-info">
                                    <strong>{user.displayName || 'Sin nombre'}</strong>
                                    <span className="admin-muted">
                                        {user.email || '—'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="admin-btn-primary"
                                    disabled={busy}
                                    onClick={() => onAddMember(user)}
                                >
                                    <UserPlus size={18} /> Añadir
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
