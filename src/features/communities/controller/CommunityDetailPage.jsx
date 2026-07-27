import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { subscribeCommunity, subscribeCommunityMembers } from '@/features/communities/repository/communityRepository';
import {
    adminAddCommunityMember,
    adminRemoveMember,
    adminUpdateMemberRole,
    adminUpdateMemberAlias,
} from '@/features/communities/service/communityWriteService';
import { adminCreateOfficialUser } from '@/features/communities/service/userProvisionService';
import { searchUsersByText } from '@/features/admin/repository/adminDirectoryRepository';
import { isOfficialEntityCommunity } from '@/shared/domain/communityVisibility';
import { roleSelectOptions } from '@/shared/validators/roles';
import AddMemberPanel from '@/features/communities/ui/AddMemberPanel';
import OfficialProvisionPanel from '@/features/communities/ui/OfficialProvisionPanel';
import MembersTablePanel from '@/features/communities/ui/MembersTablePanel';

const emptyOfficialForm = {
    displayName: '',
    email: '',
    password: '',
};

/**
 * Detalle de comunidad: gestión de miembros (CRUD) para el panel administrativo.
 */
export default function CommunityDetailPage() {
    const { id: communityId } = useParams();
    const [communityName, setCommunityName] = useState('');
    const [isEntity, setIsEntity] = useState(false);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [memberSearch, setMemberSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchErr, setSearchErr] = useState('');
    const searchDebounceRef = useRef(null);
    const [newRole, setNewRole] = useState('member');
    const [newAlias, setNewAlias] = useState('');
    const [busy, setBusy] = useState(false);
    const [officialForm, setOfficialForm] = useState({ ...emptyOfficialForm });
    const [officialErr, setOfficialErr] = useState('');
    const [officialOk, setOfficialOk] = useState('');

    const roles = roleSelectOptions(isEntity);

    useEffect(() => {
        if (!communityId) return undefined;
        setLoading(true);
        let communityReady = false;
        let membersReady = false;
        const markReady = () => {
            if (communityReady && membersReady) setLoading(false);
        };

        const unsubCommunity = subscribeCommunity(communityId, (c) => {
            setCommunityName(c?.name || communityId);
            setIsEntity(c ? isOfficialEntityCommunity(c) : false);
            communityReady = true;
            markReady();
        });
        const unsubMembers = subscribeCommunityMembers(communityId, (m) => {
            setMembers(m);
            membersReady = true;
            markReady();
        });

        return () => {
            unsubCommunity();
            unsubMembers();
        };
    }, [communityId]);

    useEffect(() => {
        if (!isEntity) return;
        if (newRole !== 'member' && newRole !== 'official') {
            setNewRole('member');
        }
    }, [isEntity, newRole]);

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        const query = memberSearch.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            setSearchErr('');
            return undefined;
        }

        setSearching(true);
        setSearchErr('');
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const results = await searchUsersByText(query, {
                    excludeCommunityId: communityId,
                });
                setSearchResults(results);
            } catch (err) {
                setSearchResults([]);
                setSearchErr(err?.message || 'No se pudo buscar usuarios');
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [memberSearch, communityId]);

    async function addMemberByUser(user, alias = '') {
        if (!user?.id || !communityId) return;
        setBusy(true);
        setSearchErr('');
        try {
            const trimmedAlias = String(alias ?? '').trim();
            await adminAddCommunityMember(communityId, user.id, newRole, {
                alias: trimmedAlias || null,
            });
            setMemberSearch('');
            setSearchResults([]);
            setNewAlias('');
        } catch (err) {
            setSearchErr(err?.message || 'No se pudo agregar');
        } finally {
            setBusy(false);
        }
    }

    async function removeMemberRow(memberDocId) {
        if (!window.confirm('¿Quitar a esta persona de la comunidad?')) return;
        setBusy(true);
        try {
            await adminRemoveMember(memberDocId);
        } catch (err) {
            alert(err?.message || 'Error');
        } finally {
            setBusy(false);
        }
    }

    async function changeRole(memberId, role) {
        setBusy(true);
        try {
            await adminUpdateMemberRole(memberId, role);
        } catch (err) {
            alert(err?.message || 'Error');
        } finally {
            setBusy(false);
        }
    }

    async function updateAlias(memberId, alias) {
        setBusy(true);
        try {
            await adminUpdateMemberAlias(memberId, alias);
        } catch (err) {
            alert(err?.message || 'Error');
        } finally {
            setBusy(false);
        }
    }

    async function createOfficial(e) {
        e.preventDefault();
        if (!isEntity) return;
        setOfficialErr('');
        setOfficialOk('');
        setBusy(true);
        try {
            await adminCreateOfficialUser({
                email: officialForm.email,
                password: officialForm.password,
                displayName: officialForm.displayName,
                communityId,
            });
            const createdLabel = officialForm.displayName || officialForm.email;
            setOfficialOk(
                createdLabel
                    ? `Usuario oficial «${createdLabel}» creado.`
                    : 'Usuario oficial creado.'
            );
            setOfficialForm({ ...emptyOfficialForm });
        } catch (err) {
            setOfficialErr(err?.message || 'No se pudo crear el usuario oficial');
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!communityName) {
        return (
            <>
                <Link to="/communities" className="admin-back" style={{ marginBottom: 'var(--space-4)' }}>
                    <ArrowLeft size={18} /> Comunidades
                </Link>
                <p className="admin-muted">Esta comunidad no está disponible.</p>
            </>
        );
    }

    return (
        <>
            <Link to="/communities" className="admin-back" style={{ marginBottom: 'var(--space-4)' }}>
                <ArrowLeft size={18} /> Comunidades
            </Link>

            <section className="section section--dash" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="section-header">
                    <div className="section-header-left">
                        <div
                            className="section-icon"
                            style={{ background: 'rgba(63, 81, 181, 0.1)' }}
                        >
                            <Users size={18} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <h2 className="section-title">
                                {isEntity ? `Reporte ${communityName}` : communityName}
                            </h2>
                            <p className="section-subtitle">
                                {isEntity
                                    ? 'Entidad de reportes — gestión de miembros, oficiales y roles'
                                    : 'Gestión de miembros y roles'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <AddMemberPanel
                roles={roles}
                memberSearch={memberSearch}
                onMemberSearchChange={setMemberSearch}
                newRole={newRole}
                onNewRoleChange={setNewRole}
                newAlias={newAlias}
                onNewAliasChange={setNewAlias}
                searching={searching}
                searchErr={searchErr}
                searchResults={searchResults}
                busy={busy}
                onAddMember={addMemberByUser}
            />

            {isEntity && (
                <OfficialProvisionPanel
                    form={officialForm}
                    onFormChange={setOfficialForm}
                    onSubmit={createOfficial}
                    busy={busy}
                    err={officialErr}
                    ok={officialOk}
                />
            )}

            <MembersTablePanel
                members={members}
                roles={roles}
                isEntity={isEntity}
                busy={busy}
                onChangeRole={changeRole}
                onUpdateAlias={updateAlias}
                onRemoveMember={removeMemberRow}
            />
        </>
    );
}
