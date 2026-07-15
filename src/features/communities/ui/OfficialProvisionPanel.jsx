import { ShieldCheck } from 'lucide-react';

/**
 * Create official Auth user linked to an entity community.
 */
export default function OfficialProvisionPanel({
    form,
    onFormChange,
    onSubmit,
    busy,
    err,
    ok,
}) {
    return (
        <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="section-header">
                <div className="section-header-left">
                    <div className="section-icon" style={{ background: 'rgba(13, 27, 62, 0.1)' }}>
                        <ShieldCheck size={18} style={{ color: '#0d1b3e' }} />
                    </div>
                    <div>
                        <h3 className="section-title">Crear usuario oficial</h3>
                        <p className="section-subtitle">
                            Crea la cuenta en Firebase Auth y la vincula a esta entidad con
                            rol Oficial (recibe los reportes). Tu sesión de administrador no
                            se ve afectada.
                        </p>
                    </div>
                </div>
            </div>
            <div className="section-body">
                <form onSubmit={onSubmit} className="admin-add-form">
                    <input
                        className="login-input"
                        placeholder="Nombre completo"
                        value={form.displayName}
                        onChange={(e) =>
                            onFormChange((f) => ({ ...f, displayName: e.target.value }))
                        }
                        required
                    />
                    <input
                        className="login-input"
                        type="email"
                        placeholder="Correo"
                        value={form.email}
                        onChange={(e) =>
                            onFormChange((f) => ({ ...f, email: e.target.value }))
                        }
                        required
                    />
                    <input
                        className="login-input"
                        type="password"
                        placeholder="Contraseña inicial"
                        value={form.password}
                        onChange={(e) =>
                            onFormChange((f) => ({ ...f, password: e.target.value }))
                        }
                        minLength={6}
                        required
                    />
                    <button type="submit" className="admin-btn-primary" disabled={busy}>
                        <ShieldCheck size={18} /> Crear oficial
                    </button>
                </form>
                {err && (
                    <div className="login-error" style={{ marginTop: 'var(--space-2)' }}>
                        {err}
                    </div>
                )}
                {ok && (
                    <p className="admin-muted" style={{ marginTop: 'var(--space-2)' }}>
                        {ok}
                    </p>
                )}
            </div>
        </section>
    );
}
