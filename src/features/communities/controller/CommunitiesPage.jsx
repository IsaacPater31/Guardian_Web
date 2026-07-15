import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Building2, ShieldCheck } from 'lucide-react';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import {
    subscribeToCommunities,
    subscribeCommunityMemberCount,
} from '@/features/communities/repository/communityRepository';
import {
    adminCreateCommunity,
    adminUpdateCommunity,
    adminDeleteCommunityCascade,
} from '@/features/communities/service/communityWriteService';
import { isOfficialEntityCommunity } from '@/shared/domain/communityVisibility';
import CommunitiesTable from '@/features/communities/ui/CommunitiesTable';
import CommunityInfoModal from '@/features/communities/ui/CommunityInfoModal';
import CommunityFormModal, { isEntityModal } from '@/features/communities/ui/CommunityFormModal';
import { normalizeEntityReportTypes } from '@/features/communities/utils/entityReportTypes';
import {
    DEFAULT_ICON_CODE_POINT,
    DEFAULT_ICON_COLOR,
} from '@/shared/config/communityIconCatalog';

const emptyForm = {
    name: '',
    description: '',
    iconCodePoint: DEFAULT_ICON_CODE_POINT,
    iconColor: DEFAULT_ICON_COLOR,
    reportButtonColor: '#0D1B3E',
    reportAlertTypes: [],
};

function normalizeHexColor(value, fallback = '#0D1B3E') {
    const raw = String(value || '').trim();
    if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toUpperCase();
    return fallback;
}

export default function CommunitiesPage() {
    const [allCommunities, setAllCommunities] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [infoCommunity, setInfoCommunity] = useState(null);
    const [infoMemberCount, setInfoMemberCount] = useState(null);
    const listAnchorRef = useRef(null);

    function closeModal() {
        setModal(null);
        setErr('');
    }

    useEffect(() => {
        if (!modal && !infoCommunity) return undefined;
        function onKeyDown(e) {
            if (e.key !== 'Escape') return;
            if (infoCommunity) setInfoCommunity(null);
            else closeModal();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [modal, infoCommunity]);

    const list = useMemo(() => {
        const start = (page - 1) * ADMIN_LIST_PAGE_SIZE;
        return allCommunities.slice(start, start + ADMIN_LIST_PAGE_SIZE);
    }, [allCommunities, page]);

    const hasMore = page * ADMIN_LIST_PAGE_SIZE < allCommunities.length;

    function goToPage(nextPage) {
        setPage(nextPage);
        requestAnimationFrame(() => {
            listAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    useEffect(() => {
        setLoading(true);
        const unsub = subscribeToCommunities((communities) => {
            const sorted = [...communities].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', 'es'),
            );
            setAllCommunities(sorted);
            setTotal(sorted.length);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!infoCommunity) {
            setInfoMemberCount(null);
            return undefined;
        }
        setInfoMemberCount('loading');
        return subscribeCommunityMemberCount(infoCommunity.id, (n) => setInfoMemberCount(n));
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
            reportAlertTypes: normalizeEntityReportTypes(c.reportAlertTypes),
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
            setPage(1);
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
            setPage(1);
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

            <CommunitiesTable
                list={list}
                loading={loading}
                page={page}
                hasMore={hasMore}
                total={total}
                listAnchorRef={listAnchorRef}
                onPrev={() => page > 1 && goToPage(page - 1)}
                onNext={() => hasMore && goToPage(page + 1)}
                onInfo={setInfoCommunity}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <CommunityInfoModal
                community={infoCommunity}
                memberCount={infoMemberCount}
                onClose={() => setInfoCommunity(null)}
            />

            <CommunityFormModal
                modal={modal}
                form={form}
                onFormChange={setForm}
                onSubmit={handleSubmit}
                onClose={closeModal}
                saving={saving}
                err={err}
            />
        </>
    );
}
