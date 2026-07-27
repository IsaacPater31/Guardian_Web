import { UserMinus, Users } from 'lucide-react';

/**
 * Community members table with role edits and remove.
 */
export default function MembersTablePanel({
    members,
    roles,
    isEntity,
    busy,
    onChangeRole,
    onUpdateAlias,
    onRemoveMember,
}) {
    return (
        <section className="section section--dash">
            <div className="section-header">
                <div className="section-header-left">
                    <div className="section-icon" style={{ background: 'rgba(0, 0, 0, 0.04)' }}>
                        <Users size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                    <div>
                        <h3 className="section-title">Miembros</h3>
                        <p className="section-subtitle">
                            {members.length === 0
                                ? 'Aún no hay personas en esta comunidad'
                                : `${members.length} registrados`}
                        </p>
                    </div>
                </div>
            </div>
            <div className="section-body section-body--table">
                {members.length === 0 ? (
                    <p className="admin-muted admin-empty-inset">No hay miembros.</p>
                ) : (
                    <div className="admin-table-scroll">
                        <table className="admin-table admin-table--users admin-table-wide">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Alias</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th className="admin-th-actions"> </th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id}>
                                        <td>
                                            <div>{m.displayName || '—'}</div>
                                            {m.alias && m.profileName && (
                                                <div className="admin-muted admin-desc">{m.profileName}</div>
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                className="login-input admin-select-inline"
                                                defaultValue={m.alias ?? ''}
                                                key={`${m.id}-${m.alias ?? ''}`}
                                                placeholder={m.profileName || 'Alias opcional'}
                                                onBlur={(e) => {
                                                    const next = e.target.value.trim();
                                                    const prev = (m.alias ?? '').trim();
                                                    if (next !== prev) onUpdateAlias(m.id, next || null);
                                                }}
                                                disabled={busy}
                                            />
                                        </td>
                                        <td className="admin-mono">{m.email || '—'}</td>
                                        <td>
                                            <select
                                                className="login-input admin-select-inline"
                                                value={
                                                    isEntity && m.role === 'admin'
                                                        ? 'official'
                                                        : !isEntity && m.role === 'official'
                                                          ? 'member'
                                                          : m.role
                                                }
                                                onChange={(e) => onChangeRole(m.id, e.target.value)}
                                                disabled={busy}
                                            >
                                                {roles.map((r) => (
                                                    <option key={r.value} value={r.value}>
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="admin-icon-btn danger"
                                                title="Quitar"
                                                onClick={() => onRemoveMember(m.id)}
                                                disabled={busy}
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
