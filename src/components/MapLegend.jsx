import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { EMERGENCY_TYPES, CATEGORIES, getAlertLabel } from '../data/emergencyTypes';

export default function MapLegend() {
    const [isExpanded, setIsExpanded] = useState(true);

    // Group types by category
    const grouped = {};
    for (const [type, config] of Object.entries(EMERGENCY_TYPES)) {
        const cat = config.category;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ type, ...config });
    }

    return (
        <div className="map-legend">
            <div className="map-legend-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="map-legend-header-icon">
                    <Info />
                </div>
                <span>Alertas</span>
                <div className={`map-legend-toggle${isExpanded ? '' : ' collapsed'}`}>
                    <ChevronDown />
                </div>
            </div>
            <div className={`map-legend-body${isExpanded ? '' : ' collapsed'}`}>
                {Object.entries(grouped).map(([category, types]) => (
                    <div key={category} className="map-legend-category">
                        <div className="map-legend-category-label">{category}</div>
                        {types.map((t) => {
                            const Icon = LucideIcons[t.icon] || LucideIcons.AlertTriangle;
                            return (
                                <div key={t.type} className="map-legend-item">
                                    <div
                                        className="map-legend-dot"
                                        style={{ background: t.color }}
                                    >
                                        <Icon />
                                    </div>
                                    <span className="map-legend-label">{t.labelEs}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
