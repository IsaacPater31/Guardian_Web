import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users, Building2, Info, ShieldCheck } from 'lucide-react';
import AdminPaginationBar from '../components/admin/AdminPaginationBar';
import { ADMIN_LIST_PAGE_SIZE } from '../config/adminPagination';
import {
    fetchCommunitiesPage,
    getCommunitiesCount,
    getCommunityMemberCount,
} from '../services/communityService';
import {
    adminCreateCommunity,
    adminUpdateCommunity,
    adminDeleteCommunityCascade,
} from '../services/adminCrudService';
import { isOfficialEntityCommunity } from '../utils/communityVisibility';
import CommunityIconPickerGrid from '../components/community/CommunityIconPickerGrid';
import CommunityIconDisplay from '../components/community/CommunityIconDisplay';
import EntityAlertTypesPicker from '../components/community/EntityAlertTypesPicker';
import { ACTIVE_ALERT_TYPES } from '../config/alertTypes';
import {
    DEFAULT_ICON_CODE_POINT,
    DEFAULT_ICON_COLOR,
} from '../config/communityIconCatalog';

const emptyForm = {
    name: '',
    description: '',
    iconCodePoint: DEFAULT_ICON_CODE_POINT,
    iconColor: DEFAULT_ICON_COLOR,
    reportButtonColor: '#0D1B3E',
    reportAlertTypes: [],
};

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

function formatReportTypes(types) {
    if (!types?.length) return '—';
    return types
        .map((t) => ACTIVE_ALERT_TYPES[t]?.labelEs || t)
        .join(', ');
}

function normalizeHexColor(value, fallback = '#0D1B3E') {
    const raw = String(value || '').trim();
    if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toUpperCase();
    return fallback;
}

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
    const [page, setPage] = useState(1);
    const cursorsRef = useRef([null]);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [infoCommunity, setInfoCommunity] = useState(null);
    const [infoMemberCount, setInfoMemberCount] = useState(null);
    const listAnchorRef = useRef(null);

    function goToPage(nextPage) {
        setPage(nextPage);
        requestAnimationFrame(() => {
            listAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    async function refresh({ targetPage = page } = {}) {
        setLoading(true);
        try {
            const cursor = targetPage > 1 ? cursorsRef.current[targetPage - 1] : null;
            const [result, count] = await Promise.all([
                fetchCommunitiesPage({ pageSize: ADMIN_LIST_PAGE_SIZE, cursor }),
                total == null ? getCommunitiesCount().catch(() => null) : Promise.resolve(total),
            ]);
            cursorsRef.current[targetPage] = result.lastDoc;
            // El panel admin muestra también entidades (a diferencia del móvil).
            setList(result.items);
            setHasMore(result.hasMore);
            if (count != null) setTotal(count);
            if (targetPage !== page) setPage(targetPage);
        } catch (e) {
            console.error(e);
            setList([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const cursor = page > 1 ? cursorsRef.current[page - 1] : null;
                const [result, count] = await Promise.all([
                    fetchCommunitiesPage({ pageSize: ADMIN_LIST_PAGE_SIZE, cursor }),
                    getCommunitiesCount().catch(() => null),
                ]);
                if (cancelled) return;
                cursorsRef.current[page] = result.lastDoc;
                setList(result.items);
                setHasMore(result.hasMore);
                if (count != null) setTotal(count);
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    setList([]);
                    setHasMore(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [page]);

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

    function openCreateCommunity() {
        setErr('');
        setForm({ ...emptyForm, reportAlertTypes: [] });
        setModal('create-community');
    }

    function openCreateEntity() {
        setErr('');
        setForm({ ...emptyForm, reportAlertTypes: [] });
        setModal('create-entity');
    }

    function openEdit(c) {
        setErr('');
        const entity = isOfficialEntityCommunity(c);
        setForm({
            id: c.id,
            name: c.name,
            description: c.description || '',
            iconCodePoint: c.iconCodePoint ?? DEFAULT_ICON_CODE_POINT,
            iconColor: entity ? null : c.iconColor || DEFAULT_ICON_COLOR,
            reportButtonColor: c.reportButtonColor || '#0D1B3E',
            reportAlertTypes: Array.isArray(c.reportAlertTypes) ? [...c.reportAlertTypes] : [],
        });
        setModal(entity ? 'edit-entity' : 'edit-community');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErr('');

        // Las entidades se muestran en el móvil como "Reporte {Nombre}";
        // el nombre debe ser una sola palabra (p. ej. "Policía", "EPA").
        const trimmedName = String(form.name || '').trim();
        const entityFlow = isEntityModal(modal);
        const reportButtonColor = normalizeHexColor(form.reportButtonColor);
        if (entityFlow && /\s/.test(trimmedName)) {
            setErr('El nombre de una entidad debe ser una sola palabra (p. ej. "Policía").');
            setSaving(false);
            return;
        }
        if (entityFlow && (!form.reportAlertTypes || form.reportAlertTypes.length === 0)) {
            setErr('Selecciona al menos un tipo de reporte para la entidad.');
            setSaving(false);
            return;
        }

        try {
            if (modal === 'create-community') {
                await adminCreateCommunity({
                    name: trimmedName,
                    description: form.description || null,
                    isEntity: false,
                    allowForwardToEntities: true,
                    createdByUid: null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor: form.iconColor,
                    reportButtonColor,
                });
            } else if (modal === 'create-entity') {
                await adminCreateCommunity({
                    name: trimmedName,
                    description: form.description || null,
                    isEntity: true,
                    allowForwardToEntities: true,
                    createdByUid: null,
                    iconCodePoint: form.iconCodePoint,
                    reportButtonColor,
                    reportAlertTypes: form.reportAlertTypes,
                });
            } else if (modal === 'edit-community' && form.id) {
                await adminUpdateCommunity(form.id, {
                    name: trimmedName,
                    description: form.description || null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor: form.iconColor,
                    reportButtonColor,
                });
            } else if (modal === 'edit-entity' && form.id) {
                await adminUpdateCommunity(form.id, {
                    name: trimmedName,
                    description: form.description || null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor: null,
                    reportButtonColor,
                    reportAlertTypes: form.reportAlertTypes,
                });
            }
            setModal(null);
            cursorsRef.current = [null];
            setPage(1);
            await refresh({ targetPage: 1 });
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
            cursorsRef.current = [null];
            setPage(1);
            await refresh({ targetPage: 1 });
        } catch (e) {
            alert(e?.message || 'No se pudo eliminar');
        } finally {
            setSaving(false);
        }
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
                            <p className="section-subtitle">Gestión de comunidades</p>
                        </div>
                    </div>
                    <div className="admin-header-actions">
                        <button type="button" className="admin-btn-ghost" onClick={openCreateCommunity}>
                            <Plus size={18} /> Nueva comunidad
                        </button>
                        <button type="button" className="admin-btn-primary" onClick={openCreateEntity}>
                            <ShieldCheck size={18} /> Nueva entidad
                        </button>
                    </div>
                </div>
            </section>

            <div className="section section--dash section-body--table" ref={listAnchorRef}>
                {loading && list.length === 0 ? (
                    <div className="loading-container" style={{ minHeight: '12rem' }}>
                        <div className="loading-spinner" />
                    </div>
                ) : (
                <div className="admin-table-scroll">
                    <table className="admin-table admin-table--users admin-table-wide">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th className="admin-th-actions">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && list.length === 0 && (
                            <tr>
                                <td colSpan={4} className="admin-muted">
                                    No hay comunidades para mostrar.
                                </td>
                            </tr>
                        )}
                        {list.map((c) => (
                            <tr key={c.id}>
                                <td className="admin-td-mono admin-td-id">{c.id}</td>
                                <td>
                                    <strong>{c.name}</strong>
                                    {c.description && (
                                        <div className="admin-muted admin-desc">{c.description}</div>
                                    )}
                                </td>
                                <td>
                                    {isOfficialEntityCommunity(c) ? (
                                        <span className="admin-badge admin-badge--entity">
                                            Entidad
                                        </span>
                                    ) : (
                                        <span className="admin-muted">Comunidad</span>
                                    )}
                                </td>
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
                )}
                <AdminPaginationBar
                    page={page}
                    hasMore={hasMore}
                    loading={loading}
                    onPrev={() => page > 1 && goToPage(page - 1)}
                    onNext={() => hasMore && goToPage(page + 1)}
                    total={total}
                    pageSize={ADMIN_LIST_PAGE_SIZE}
                    shownCount={list.length}
                    label="comunidades"
                    labelSingular="comunidad"
                />
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
                            <dt>Tipo</dt>
                            <dd>
                                {isOfficialEntityCommunity(infoCommunity)
                                    ? 'Entidad (reportes)'
                                    : 'Comunidad'}
                            </dd>
                            <dt>Nombre</dt>
                            <dd>{infoCommunity.name || '—'}</dd>
                            <dt>Descripción</dt>
                            <dd>{infoCommunity.description || '—'}</dd>
                            <dt>Creado por (UID)</dt>
                            <dd className="mono">{infoCommunity.createdBy ?? '—'}</dd>
                            <dt>Fecha de creación</dt>
                            <dd>{formatFirestoreDate(infoCommunity.createdAt)}</dd>
                            <dt>Icono</dt>
                            <dd>
                                <CommunityIconDisplay
                                    iconCodePoint={infoCommunity.iconCodePoint}
                                    iconColor={
                                        isOfficialEntityCommunity(infoCommunity)
                                            ? infoCommunity.reportButtonColor
                                            : infoCommunity.iconColor
                                    }
                                    size={40}
                                />
                            </dd>
                            <dt>Color botón reportar</dt>
                            <dd>
                                {isOfficialEntityCommunity(infoCommunity) ? (
                                    <span
                                        className="admin-color-pill"
                                        style={{ backgroundColor: infoCommunity.reportButtonColor || '#0D1B3E' }}
                                    >
                                        {infoCommunity.reportButtonColor || '#0D1B3E'}
                                    </span>
                                ) : '—'}
                            </dd>
                            <dt>Tipos de reporte</dt>
                            <dd>
                                {isOfficialEntityCommunity(infoCommunity)
                                    ? formatReportTypes(infoCommunity.reportAlertTypes)
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
                        <h3 className="admin-modal-title">{modalTitle(modal)}</h3>
                        <form onSubmit={handleSubmit} className="admin-modal-form">
                            <label className="login-label">
                                Nombre
                                <input
                                    className="login-input"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    required
                                    placeholder={
                                        isEntityModal(modal)
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
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </label>
                            <CommunityIconPickerGrid
                                selectedCodePoint={form.iconCodePoint}
                                onSelect={(option) =>
                                    setForm((f) => ({
                                        ...f,
                                        iconCodePoint: option.codePoint,
                                    }))
                                }
                            />
                            {isEntityModal(modal) && (
                                <label className="login-label">
                                    Color del botón Reportar
                                    <div className="admin-color-field">
                                        <input
                                            type="color"
                                            className="admin-color-input"
                                            value={form.reportButtonColor || '#0D1B3E'}
                                            onChange={(e) =>
                                                setForm((f) => ({
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
                                                setForm((f) => ({
                                                    ...f,
                                                    reportButtonColor: e.target.value,
                                                }))
                                            }
                                            placeholder="#0D1B3E"
                                        />
                                    </div>
                                </label>
                            )}
                            {isEntityModal(modal) && (
                                <EntityAlertTypesPicker
                                    selected={form.reportAlertTypes}
                                    onChange={(reportAlertTypes) =>
                                        setForm((f) => ({ ...f, reportAlertTypes }))
                                    }
                                />
                            )}
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
