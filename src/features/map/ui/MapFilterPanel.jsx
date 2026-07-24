/**
 * Map filter panel — thin adapter over unified AlertFilters (variant=map).
 * Keeps MapPage prop shape stable (ETC for callers).
 */
import AlertFilters from '@/features/alerts/ui/AlertFilters';

export default function MapFilterPanel({
    types = [],
    status = 'all',
    dateRange = 'all',
    customStart = null,
    customEnd = null,
    onChange,
    totalVisible = 0,
    typeOptions = null,
    typesSectionLabel = 'Tipo de alerta',
    listAlerts = null,
    activeAlertId = null,
    pulseAlertId = null,
    selectedAlertId = null,
    onRecentAlertSelect,
}) {
    return (
        <AlertFilters
            variant="map"
            types={types}
            status={status}
            dateRange={dateRange}
            customStart={customStart}
            customEnd={customEnd}
            onChange={onChange}
            totalVisible={totalVisible}
            typeOptions={typeOptions}
            typesSectionLabel={typesSectionLabel}
            listAlerts={listAlerts}
            activeAlertId={activeAlertId}
            pulseAlertId={pulseAlertId}
            selectedAlertId={selectedAlertId}
            onRecentAlertSelect={onRecentAlertSelect}
        />
    );
}
