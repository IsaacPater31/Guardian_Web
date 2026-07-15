import { MapPin } from 'lucide-react';

export default function MapAlertCountBadge({ count }) {
    return (
        <div className="map-alert-count-badge-wrap">
            <div className="map-alert-count-badge">
                <MapPin style={{ width: 14, height: 14 }} />
                {count} alerta{count !== 1 ? 's' : ''} en el mapa
            </div>
        </div>
    );
}
