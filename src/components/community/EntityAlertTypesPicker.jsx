import { ACTIVE_ALERT_TYPES } from '../../config/alertTypes';

/**
 * Selector de tipos de alerta que una entidad acepta como reportes.
 */
export default function EntityAlertTypesPicker({ selected = [], onChange }) {
    const entries = Object.entries(ACTIVE_ALERT_TYPES);

    function toggle(typeKey) {
        const set = new Set(selected);
        if (set.has(typeKey)) set.delete(typeKey);
        else set.add(typeKey);
        onChange([...set]);
    }

    return (
        <div className="entity-alert-types-picker">
            <p className="community-icon-picker-label">Tipos de reporte aceptados</p>
            <p className="admin-muted" style={{ margin: '0 0 var(--space-2)' }}>
                Selecciona los tipos habilitados para reportes. Puede quedar vacío
                mientras se configura la entidad.
            </p>
            <div className="entity-alert-types-grid">
                {entries.map(([key, meta]) => {
                    const isOn = selected.includes(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            className={`entity-alert-type-chip${isOn ? ' is-on' : ''}`}
                            style={{
                                borderColor: isOn ? meta.color : undefined,
                                backgroundColor: isOn ? `${meta.color}1a` : undefined,
                            }}
                            onClick={() => toggle(key)}
                        >
                            <span
                                className="entity-alert-type-dot"
                                style={{ backgroundColor: meta.color }}
                            />
                            {meta.labelEs || meta.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
