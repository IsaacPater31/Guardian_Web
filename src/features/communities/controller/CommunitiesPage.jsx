import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Building2, ShieldCheck, Search } from 'lucide-react';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';
import {
    subscribeToCommunities,
    subscribeCommunityMemberCount,
    resolveCommunityAdminNames,
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
import CommunityAdminsMeta from '@/features/communities/ui/CommunityAdminsMeta';
import {
    DEFAULT_ICON_CODE_POINT,
    DEFAULT_ICON_COLOR,
} from '@/shared/config/communityIconCatalog';

const emptyForm = {
    name: '',
    description: '',
    iconCodePoint: DEFAULT_ICON_CODE_POINT,
    iconColor: DEFAULT_ICON_COLOR,
    reportAlertTypes: [],
};

function normalizeHexColor(value, fallback = DEFAULT_ICON_COLOR) {
    const raw = String(value || '').trim();
    if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toUpperCase();
    return fallback;
}

export default function CommunitiesPage() {
    const [allCommunities, setAllCommunities] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [infoCommunity, setInfoCommunity] = useState(null);
    const [infoMemberCount, setInfoMemberCount] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    /** @type {[Record<string, string[]>, Function]} communityId → admin names */
    const [adminNamesByCommunity, setAdminNamesByCommunity] = useState({});
    const [adminsReady, setAdminsReady] = useState(false);
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

    const filteredCommunities = useMemo(() => {
        const f = searchFilter.trim().toLowerCase();
        if (!f) return allCommunities;
        if (!adminsReady) return allCommunities;
        return allCommunities.filter((c) => {
            const name = (c.name || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            const admin = (adminNamesByCommunity[c.id] || [])
                .join(' ')
                .toLowerCase();
            return name.includes(f) || desc.includes(f) || admin.includes(f);
        });
    }, [allCommunities, searchFilter, adminNamesByCommunity, adminsReady]);

    const list = useMemo(() => {
        const start = (page - 1) * ADMIN_LIST_PAGE_SIZE;
        return filteredCommunities.slice(start, start + ADMIN_LIST_PAGE_SIZE);
    }, [filteredCommunities, page]);

    const hasMore = page * ADMIN_LIST_PAGE_SIZE < filteredCommunities.length;
    const listTotal = filteredCommunities.length;
    const searchActive = searchFilter.trim().length > 0;

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
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadAdminNames() {
            setAdminsReady(false);
            try {
                const map = await resolveCommunityAdminNames(allCommunities);
                if (cancelled) return;
                setAdminNamesByCommunity(map);
            } catch (err) {
                console.warn('[CommunitiesPage] admin names', err);
                if (!cancelled) setAdminNamesByCommunity({});
            } finally {
                if (!cancelled) setAdminsReady(true);
            }
        }

        if (!allCommunities.length) {
            setAdminNamesByCommunity({});
            setAdminsReady(true);
            return undefined;
        }

        loadAdminNames();
        return () => {
            cancelled = true;
        };
    }, [allCommunities]);

    useEffect(() => {
        setPage(1);
    }, [searchFilter]);

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
            iconColor: normalizeHexColor(c.iconColor, DEFAULT_ICON_COLOR),
            reportAlertTypes: normalizeEntityReportTypes(c.reportAlertTypes),
        });
        setModal(entity ? 'edit-entity' : 'edit-community');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErr('');

        // Nombre de entidad: una sola palabra (p. ej. "Policía", "EPA").
        const trimmedName = String(form.name || '').trim();
        const entityFlow = isEntityModal(modal);
        const iconColor = normalizeHexColor(form.iconColor, DEFAULT_ICON_COLOR);
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
                    iconColor,
                });
            } else if (modal === 'create-entity') {
                await adminCreateCommunity({
                    name: trimmedName,
                    description: form.description || null,
                    isEntity: true,
                    allowForwardToEntities: true,
                    createdByUid: null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor,
                    reportAlertTypes: form.reportAlertTypes,
                });
            } else if (modal === 'edit-community' && form.id) {
                await adminUpdateCommunity(form.id, {
                    name: trimmedName,
                    description: form.description || null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor,
                });
            } else if (modal === 'edit-entity' && form.id) {
                await adminUpdateCommunity(form.id, {
                    name: trimmedName,
                    description: form.description || null,
                    iconCodePoint: form.iconCodePoint,
                    iconColor,
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

            <div className="admin-module-directory-search" style={{ marginBottom: 'var(--space-4)' }}>
                <Search size={16} className="admin-module-directory-search-icon" aria-hidden />
                <input
                    type="search"
                    className="admin-module-input admin-module-input--search"
                    placeholder="Buscar por nombre, descripción o admin…"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    autoComplete="off"
                    aria-label="Buscar comunidades"
                />
            </div>

            <CommunitiesTable
                list={list}
                loading={loading || (allCommunities.length > 0 && !adminsReady)}
                page={page}
                hasMore={hasMore}
                total={listTotal}
                searchActive={searchActive}
                adminNamesByCommunity={adminNamesByCommunity}
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
