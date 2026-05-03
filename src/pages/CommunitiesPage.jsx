import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users, Building2, Info } from 'lucide-react';
import { getAllCommunities, getCommunityMemberCount } from '../services/communityService';
import {
    adminCreateCommunity,
    adminUpdateCommunity,
    adminDeleteCommunityCascade,
} from '../services/adminCrudService';

const emptyForm = {
    name: '',
    description: '',
    isEntity: false,
    allowForwardToEntities: true,
};

function formatFirestoreDate(val) {
    if (val == null) return '—';
    try {
        const d = typeof val?.toDate === 'function' ? val.toDate() : val instanceof Date ? val : null;
        if (!d || Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

export default function CommunitiesPage() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [infoCommunity, setInfoCommunity] = useState(null);
    const [infoMemberCount, setInfoMemberCount] = useState(null);

    async function refresh() {
        setLoading(true);
        try {
            const data = await getAllCommunities();
            data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setList(data);
        } catch (e) {
            console.error(e);
            setList([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (!infoCommunity) {
            setInfoMemberCount(null);
            return;
        }
        let cancelled = false;
        setInfoMemberCount('loading');
        (async () => {
            try {
                const n = await getCommunityMemberCount(infoCommunity.id);
                if (!cancelled) setInfoMemberCount(n);
            } catch {
                if (!cancelled) setInfoMemberCount(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [infoCommunity]);

    function openCreate() {
        setErr('');
        setForm({ ...emptyForm });
        setModal('create');
    }

    function openEdit(c) {
        setErr('');
        setForm({
            id: c.id,
            name: c.name,
            description: c.description || '',
            isEntity: !!c.isEntity,
            allowForwardToEntities: c.allowForwardToEntities !== false,
        });
        setModal('edit');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErr('');
        try {
            if (modal === 'create') {
                await adminCreateCommunity({
                    name: form.name,
                    description: form.description || null,
                    isEntity: form.isEntity,
                    allowForwardToEntities: form.allowForwardToEntities,
                    createdByUid: null,
                });
            } else if (modal === 'edit' && form.id) {
                await adminUpdateCommunity(form.id, {
                    name: form.name,
                    description: form.description || null,
                    isEntity: form.isEntity,
                    allowForwardToEntities: form.allowForwardToEntities,
                });
            }
            setModal(null);
            await refresh();
        } catch (e) {
            setErr(e?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(c) {
        if (
            !window.confirm(
                `¿Eliminar la comunidad "${c.name}" y todos sus vínculos de miembros? Esta acción no se puede deshacer.`
            )
        ) {
            return;
        }
        setSaving(true);
        try {
            await adminDeleteCommunityCascade(c.id);
            await refresh();
        } catch (e) {
            alert(e?.message || 'No se pudo eliminar');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <>
            <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="section-header">
                    <div className="section-header-left">
                        <div
                            className="section-icon"
                            style={{ background: 'rgba(63, 81, 181, 0.1)' }}
                        >
                            <Building2 size={18} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <h2 className="section-title">Comunidades</h2>
                            <p className="section-subtitle">Directorio, entidades oficiales y permisos</p>
                        </div>
                    </div>
                    <button type="button" className="admin-btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Nueva comunidad
                    </button>
                </div>
            </section>

            <div className="section section--dash section-body--table">
                <div className="admin-table-scroll">
                    <table className="admin-table admin-table--users admin-table-wide">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Reenvío a entidades</th>
                            <th className="admin-th-actions">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((c) => (
                            <tr key={c.id}>
                                <td className="admin-td-mono admin-td-id">{c.id}</td>
                                <td>
                                    <strong>{c.name}</strong>
                                    {c.description && (
                                        <div className="admin-muted admin-desc">{c.description}</div>
                                    )}
                                </td>
                                <td>{c.isEntity ? 'Entidad oficial' : 'Normal'}</td>
                                <td>{c.allowForwardToEntities ? 'Sí' : 'No'}</td>
                                <td>
                                    <div className="admin-row-actions">
                                        <button
                                            type="button"
                                            className="admin-icon-btn"
                                            title="Ver toda la información"
                                            onClick={() => setInfoCommunity(c)}
                                        >
                                            <Info size={18} />
                                        </button>
                                        <Link
                                            to={`/communities/${c.id}`}
                                            className="admin-icon-btn"
                                            title="Miembros"
                                        >
                                            <Users size={18} />
                                        </Link>
                                        <button
                                            type="button"
                                            className="admin-icon-btn"
                                            onClick={() => openEdit(c)}
                                            title="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-icon-btn danger"
                                            onClick={() => handleDelete(c)}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {infoCommunity && (
                <div
                    className="admin-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="community-info-title"
                    onClick={() => setInfoCommunity(null)}
                >
                    <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-head-row">
                            <h3 className="admin-modal-title" id="community-info-title">
                                Información de la comunidad
                            </h3>
                            <button
                                type="button"
                                className="admin-icon-btn"
                                onClick={() => setInfoCommunity(null)}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>
                        <dl className="community-info-dl">
                            <dt>ID documento</dt>
                            <dd className="mono">{infoCommunity.id}</dd>
                            <dt>Nombre</dt>
                            <dd>{infoCommunity.name || '—'}</dd>
                            <dt>Descripción</dt>
                            <dd>{infoCommunity.description || '—'}</dd>
                            <dt>Tipo</dt>
                            <dd>{infoCommunity.isEntity ? 'Entidad oficial' : 'Normal'}</dd>
                            <dt>Reenvío a entidades oficiales</dt>
                            <dd>{infoCommunity.allowForwardToEntities !== false ? 'Sí' : 'No'}</dd>
                            <dt>Creado por (UID)</dt>
                            <dd className="mono">{infoCommunity.createdBy ?? '—'}</dd>
                            <dt>Fecha de creación</dt>
                            <dd>{formatFirestoreDate(infoCommunity.createdAt)}</dd>
                            <dt>Icono (code point / color)</dt>
                            <dd>
                                {infoCommunity.iconCodePoint != null || infoCommunity.iconColor
                                    ? `${infoCommunity.iconCodePoint ?? '—'} / ${infoCommunity.iconColor ?? '—'}`
                                    : '—'}
                            </dd>
                            <dt>Miembros</dt>
                            <dd>
                                {infoMemberCount === 'loading'
                                    ? 'Cargando…'
                                    : infoMemberCount != null
                                      ? infoMemberCount.toLocaleString('es-CO')
                                      : '—'}
                            </dd>
                        </dl>
                        <div className="admin-modal-actions admin-modal-actions--start">
                            <Link
                                to={`/communities/${infoCommunity.id}`}
                                className="admin-btn-primary"
                                onClick={() => setInfoCommunity(null)}
                            >
                                Ir a miembros
                            </Link>
                            <button type="button" className="admin-btn-ghost" onClick={() => setInfoCommunity(null)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal && (
                <div className="admin-modal-overlay" role="dialog">
                    <div className="admin-modal">
                        <h3 className="admin-modal-title">
                            {modal === 'create' ? 'Nueva comunidad' : 'Editar comunidad'}
                        </h3>
                        <form onSubmit={handleSubmit} className="admin-modal-form">
                            <label className="login-label">
                                Nombre
                                <input
                                    className="login-input"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    required
                                />
                            </label>
                            <label className="login-label">
                                Descripción
                                <textarea
                                    className="login-input admin-textarea"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </label>
                            <label className="admin-check">
                                <input
                                    type="checkbox"
                                    checked={form.isEntity}
                                    onChange={(e) => setForm((f) => ({ ...f, isEntity: e.target.checked }))}
                                />
                                Entidad oficial (Ambiental / Policía / …)
                            </label>
                            <label className="admin-check">
                                <input
                                    type="checkbox"
                                    checked={form.allowForwardToEntities}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            allowForwardToEntities: e.target.checked,
                                        }))
                                    }
                                />
                                Permitir reenvío a entidades oficiales
                            </label>
                            {err && <div className="login-error">{err}</div>}
                            <div className="admin-modal-actions">
                                <button type="button" className="admin-btn-ghost" onClick={() => setModal(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="admin-btn-primary" disabled={saving}>
                                    {saving ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
