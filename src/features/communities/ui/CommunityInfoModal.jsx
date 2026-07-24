import { Link } from 'react-router-dom';
import { isOfficialEntityCommunity } from '@/shared/domain/communityVisibility';
import CommunityIconDisplay from '@/features/communities/ui/CommunityIconDisplay';
import { formatEntityReportTypeNames } from '@/features/communities/utils/entityReportTypes';

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

/**
 * Read-only community info modal.
 */
export default function CommunityInfoModal({ community, memberCount, onClose }) {
    if (!community) return null;

    return (
        <div
            className="admin-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-info-title"
            onClick={onClose}
        >
            <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-head-row">
                    <h3 className="admin-modal-title" id="community-info-title">
                        Información de la comunidad
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
                <dl className="community-info-dl">
                    <dt>ID documento</dt>
                    <dd className="mono">{community.id}</dd>
                    <dt>Tipo</dt>
                    <dd>
                        {isOfficialEntityCommunity(community)
                            ? 'Entidad (reportes)'
                            : 'Comunidad'}
                    </dd>
                    <dt>Nombre</dt>
                    <dd>{community.name || '—'}</dd>
                    <dt>Descripción</dt>
                    <dd>{community.description || '—'}</dd>
                    <dt>Creado por (UID)</dt>
                    <dd className="mono">{community.createdBy ?? '—'}</dd>
                    <dt>Fecha de creación</dt>
                    <dd>{formatFirestoreDate(community.createdAt)}</dd>
                    <dt>Icono</dt>
                    <dd>
                        <CommunityIconDisplay
                            iconCodePoint={community.iconCodePoint}
                            iconColor={community.iconColor}
                            size={40}
                        />
                    </dd>
                    <dt>Color del icono</dt>
                    <dd>
                        <span
                            className="admin-color-pill"
                            style={{ backgroundColor: community.iconColor || '#5B6ABF' }}
                        >
                            {community.iconColor || '#5B6ABF'}
                        </span>
                    </dd>
                    <dt>Tipos de reporte</dt>
                    <dd>
                        {isOfficialEntityCommunity(community)
                            ? formatEntityReportTypeNames(community.reportAlertTypes)
                            : '—'}
                    </dd>
                    <dt>Miembros</dt>
                    <dd>
                        {memberCount === 'loading'
                            ? 'Cargando…'
                            : memberCount != null
                              ? memberCount.toLocaleString('es-CO')
                              : '—'}
                    </dd>
                </dl>
                <div className="admin-modal-actions admin-modal-actions--start">
                    <Link
                        to={`/communities/${community.id}`}
                        className="admin-btn-primary"
                        onClick={onClose}
                    >
                        Ir a miembros
                    </Link>
                    <button type="button" className="admin-btn-ghost" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
