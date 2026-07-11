import { useState } from 'react';
import CommunityIconPickerGrid from './CommunityIconPickerGrid';
import {
    createEmptyEntityReportType,
    normalizeEntityReportTypes,
} from '../../utils/entityReportTypes';

/**
 * Free-text custom report types for entities (name + icon + color).
 * @param {Array} selected
 * @param {(next: Array) => void} onChange
 */
export default function EntityAlertTypesPicker({ selected = [], onChange }) {
    const types = normalizeEntityReportTypes(selected);
    const [draft, setDraft] = useState(() => createEmptyEntityReportType());
    const [err, setErr] = useState('');
    const [iconEditId, setIconEditId] = useState(null);

    function commit(next) {
        onChange(normalizeEntityReportTypes(next));
    }

    function addType() {
        const name = String(draft.name || '').trim();
        if (!name) {
            setErr('Escribe un nombre para el tipo.');
            return;
        }
        if (types.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
            setErr('Ya existe un tipo con ese nombre.');
            return;
        }
        setErr('');
        commit([
            ...types,
            {
                ...draft,
                name,
            },
        ]);
        setDraft(createEmptyEntityReportType());
    }

    function removeType(id) {
        if (iconEditId === id) setIconEditId(null);
        commit(types.filter((t) => t.id !== id));
    }

    function updateType(id, patch) {
        commit(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    }

    return (
        <div className="entity-alert-types-picker">
            <p className="community-icon-picker-label">Tipos de emergencia personalizados</p>
            <p className="admin-muted" style={{ margin: '0 0 var(--space-2)' }}>
                Agrega los nombres que los usuarios podrán enviar como reportes.
                Cada tipo tiene icono y color propios.
            </p>

            {types.length > 0 && (
                <ul className="entity-custom-types-list">
                    {types.map((t) => (
                        <li key={t.id} className="entity-custom-type-item">
                            <div className="entity-custom-type-row">
                                <button
                                    type="button"
                                    className="entity-custom-type-icon-btn"
                                    style={{ backgroundColor: t.color }}
                                    onClick={() =>
                                        setIconEditId((cur) => (cur === t.id ? null : t.id))
                                    }
                                    aria-label={`Cambiar icono de ${t.name}`}
                                    aria-expanded={iconEditId === t.id}
                                    title="Cambiar icono"
                                >
                                    <span className="community-icon-glyph" aria-hidden>
                                        {String.fromCodePoint(t.iconCodePoint)}
                                    </span>
                                </button>
                                <input
                                    className="login-input entity-custom-type-name"
                                    value={t.name}
                                    onChange={(e) => updateType(t.id, { name: e.target.value })}
                                    aria-label="Nombre del tipo"
                                />
                                <input
                                    type="color"
                                    className="admin-color-input"
                                    value={t.color}
                                    onChange={(e) => updateType(t.id, { color: e.target.value })}
                                    aria-label={`Color de ${t.name}`}
                                />
                                <button
                                    type="button"
                                    className="admin-btn-ghost entity-custom-type-remove"
                                    onClick={() => removeType(t.id)}
                                    aria-label={`Eliminar ${t.name}`}
                                >
                                    Quitar
                                </button>
                            </div>
                            {iconEditId === t.id && (
                                <div className="entity-custom-type-icon-edit">
                                    <CommunityIconPickerGrid
                                        selectedCodePoint={t.iconCodePoint}
                                        onSelect={(option) => {
                                            updateType(t.id, {
                                                iconCodePoint: option.codePoint,
                                                color: option.colorHex || t.color,
                                            });
                                            setIconEditId(null);
                                        }}
                                    />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="entity-custom-type-draft">
                <label className="login-label">
                    Nuevo tipo
                    <input
                        className="login-input"
                        value={draft.name}
                        onChange={(e) => {
                            setDraft((d) => ({ ...d, name: e.target.value }));
                            setErr('');
                        }}
                        placeholder="Ej. Ambulancia municipal"
                    />
                </label>
                <label className="login-label">
                    Color
                    <div className="admin-color-field">
                        <input
                            type="color"
                            className="admin-color-input"
                            value={draft.color}
                            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                            aria-label="Color del nuevo tipo"
                        />
                        <input
                            className="login-input admin-color-hex"
                            value={draft.color}
                            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                        />
                    </div>
                </label>
                <CommunityIconPickerGrid
                    selectedCodePoint={draft.iconCodePoint}
                    onSelect={(option) =>
                        setDraft((d) => ({
                            ...d,
                            iconCodePoint: option.codePoint,
                            color: option.colorHex || d.color,
                        }))
                    }
                />
                {err && <div className="login-error">{err}</div>}
                <button type="button" className="admin-btn-primary" onClick={addType}>
                    Agregar tipo
                </button>
            </div>
        </div>
    );
}
