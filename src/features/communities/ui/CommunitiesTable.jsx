import { Link } from 'react-router-dom';
import { Pencil, Trash2, Users, Info } from 'lucide-react';
import { isOfficialEntityCommunity } from '@/shared/domain/communityVisibility';
import AdminPaginationBar from '@/features/admin/ui/AdminPaginationBar';
import { ADMIN_LIST_PAGE_SIZE } from '@/shared/config/pagination';

/**
 * Communities list table + pagination.
 */
export default function CommunitiesTable({
    list,
    loading,
    page,
    hasMore,
    total,
    listAnchorRef,
    onPrev,
    onNext,
    onInfo,
    onEdit,
    onDelete,
}) {
    return (
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
                                                onClick={() => onInfo(c)}
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
                                                onClick={() => onEdit(c)}
                                                title="Editar"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-icon-btn danger"
                                                onClick={() => onDelete(c)}
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
                onPrev={onPrev}
                onNext={onNext}
                total={total}
                pageSize={ADMIN_LIST_PAGE_SIZE}
                shownCount={list.length}
                label="comunidades"
                labelSingular="comunidad"
            />
        </div>
    );
}
