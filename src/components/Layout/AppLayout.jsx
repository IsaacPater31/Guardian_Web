import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
    '/': { title: 'Casa', subtitle: 'Mapa principal de monitoreo en tiempo real' },
    '/dashboard': { title: 'Dashboard', subtitle: 'Analítica, usuarios y actividad de alertas' },
    '/alerts': { title: 'Alertas', subtitle: 'Histórico y filtros' },
    '/communities': { title: 'Comunidades', subtitle: 'Crear, editar y gestionar comunidades' },
    '/admin': { title: 'Módulo admin', subtitle: 'Usuarios, comunidades y cruces' },
};

function getPageInfo(pathname) {
    if (pageTitles[pathname]) return pageTitles[pathname];
    if (pathname.startsWith('/communities/')) {
        return { title: 'Miembros', subtitle: 'Roles y participantes en la comunidad' };
    }
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
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI to route; intentional
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
