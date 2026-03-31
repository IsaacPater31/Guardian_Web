import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

    return (
        <div className="app-layout">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={collapsed}
            />
            <div className={`app-main${collapsed ? ' sidebar-collapsed' : ''}`}>
                <Header
                    title={pageInfo.title}
                    subtitle={pageInfo.subtitle}
                    onMenuClick={handleMenuClick}
                />
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
