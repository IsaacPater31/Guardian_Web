import CommunityIconPickerGrid from '@/features/communities/ui/CommunityIconPickerGrid';
import EntityAlertTypesPicker from '@/features/communities/ui/EntityAlertTypesPicker';

function isEntityModal(modal) {
    return modal === 'create-entity' || modal === 'edit-entity';
}

function modalTitle(modal) {
    switch (modal) {
        case 'create-community':
            return 'Nueva comunidad';
        case 'create-entity':
            return 'Nueva entidad de reportes';
        case 'edit-community':
            return 'Editar comunidad';
        case 'edit-entity':
            return 'Editar entidad';
        default:
            return 'Comunidad';
    }
}

/**
 * Create / edit community or entity modal form.
 */
export default function CommunityFormModal({
    modal,
    form,
    onFormChange,
    onSubmit,
    onClose,
    saving,
    err,
}) {
    if (!modal) return null;

    const entityFlow = isEntityModal(modal);

    return (
        <div
            className="admin-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-form-title"
            onClick={onClose}
        >
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-head-row">
                    <h3 className="admin-modal-title" id="community-form-title">
                        {modalTitle(modal)}
                    </h3>
                    <button
                        type="button"
                        className="admin-icon-btn"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={onSubmit} className="admin-modal-form">
                    <label className="login-label">
                        Nombre
                        <input
                            className="login-input"
                            value={form.name}
                            onChange={(e) => onFormChange((f) => ({ ...f, name: e.target.value }))}
                            required
                            placeholder={
                                entityFlow
                                    ? 'Una sola palabra (p. ej. Policía)'
                                    : undefined
                            }
                        />
                    </label>
                    <label className="login-label">
                        Descripción
                        <textarea
                            className="login-input admin-textarea"
                            rows={3}
                            value={form.description}
                            onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))}
                        />
                    </label>
                    <CommunityIconPickerGrid
                        selectedCodePoint={form.iconCodePoint}
                        onSelect={(option) =>
                            onFormChange((f) => ({
                                ...f,
                                iconCodePoint: option.codePoint,
                            }))
                        }
                    />
                    {entityFlow && (
                        <label className="login-label">
                            Color del botón Reportar
                            <div className="admin-color-field">
                                <input
                                    type="color"
                                    className="admin-color-input"
                                    value={form.reportButtonColor || '#0D1B3E'}
                                    onChange={(e) =>
                                        onFormChange((f) => ({
                                            ...f,
                                            reportButtonColor: e.target.value,
                                        }))
                                    }
                                    aria-label="Color del botón reportar"
                                />
                                <input
                                    className="login-input admin-color-hex"
                                    value={form.reportButtonColor || '#0D1B3E'}
                                    onChange={(e) =>
                                        onFormChange((f) => ({
                                            ...f,
                                            reportButtonColor: e.target.value,
                                        }))
                                    }
                                    placeholder="#0D1B3E"
                                />
                            </div>
                        </label>
                    )}
                    {entityFlow && (
                        <EntityAlertTypesPicker
                            selected={form.reportAlertTypes}
                            onChange={(reportAlertTypes) =>
                                onFormChange((f) => ({ ...f, reportAlertTypes }))
                            }
                        />
                    )}
                    {err && <div className="login-error">{err}</div>}
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn-ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="admin-btn-primary" disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export { isEntityModal };
