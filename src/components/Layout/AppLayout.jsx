import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
    '/': { title: 'Dashboard', subtitle: 'Vista general de alertas y actividad' },
    '/map': { title: 'Mapa Interactivo', subtitle: 'Alertas en tiempo real geolocalizadas' },
    '/alerts': { title: 'Alertas', subtitle: 'Histórico completo de alertas recibidas' },
    '/communities': { title: 'Comunidades', subtitle: 'Comunidades activas en Guardian' },
};

function getPageInfo(pathname) {
    if (pageTitles[pathname]) return pageTitles[pathname];
    if (pathname.startsWith('/communities/')) return { title: 'Detalle de Comunidad', subtitle: 'Alertas y miembros' };
    return pageTitles['/'];
}

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);      // mobile overlay
    const [collapsed, setCollapsed] = useState(false);           // desktop collapse
    const location = useLocation();
    const pageInfo = getPageInfo(location.pathname);

    const handleMenuClick = () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            setSidebarOpen(true);
            return;
        }
        setCollapsed((c) => !c);
    };

    // On mobile: close sidebar whenever route changes.
    useEffect(() => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            setSidebarOpen(false);
        }
    }, [location.pathname]);

    return (
        <>
            <SpeedInsights />
            <Analytics />
            <div className="app-layout">
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    collapsed={collapsed}
                />
                <main className={`app-main${collapsed ? ' sidebar-collapsed' : ''}`} role="main">
                    <Header
                        title={pageInfo.title}
                        subtitle={pageInfo.subtitle}
                        onMenuClick={handleMenuClick}
                    />
                    <div className="app-content">
                        <Outlet />
                    </div>
                </main>
            </div>
        </>
    );
}
