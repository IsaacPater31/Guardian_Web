import { NavLink } from 'react-router-dom';
import { Bell, Users, House, Compass, LayoutGrid } from 'lucide-react';

const navItems = [
    { path: '/', icon: House, label: 'Inicio' },
    { path: '/dashboard', icon: Compass, label: 'Dashboard' },
    { path: '/alerts', icon: Bell, label: 'Alertas' },
    { path: '/communities', icon: Users, label: 'Comunidades' },
];

const moduleNavItems = [{ path: '/admin', icon: LayoutGrid, label: 'Módulo admin' }];

export default function Sidebar({ isOpen, onClose, collapsed }) {
    return (
        <>
            {isOpen && (
                <div className="mobile-overlay" onClick={onClose} />
            )}
            <aside className={`sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>

                <div className="sidebar-brand">
                    <img
                        src="/guardian_logo.png"
                        alt="Guardian"
                        className="sidebar-brand-logo"
                    />
                    {!collapsed && (
                        <div className="sidebar-brand-text-block">
                            <span className="sidebar-brand-name">Guardian</span>
                            <span className="sidebar-brand-sub">Panel administrativo</span>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {!collapsed && (
                        <div className="sidebar-section-label">Navegación</div>
                    )}
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' collapsed' : ''}`}
                            onClick={onClose}
                            end={item.path === '/'}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="sidebar-link-icon" />
                            {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
                        </NavLink>
                    ))}
                    {!collapsed && (
                        <div className="sidebar-section-label sidebar-section-label--spaced">Módulo</div>
                    )}
                    {moduleNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' collapsed' : ''}`}
                            onClick={onClose}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="sidebar-link-icon" />
                            {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className={`sidebar-footer${collapsed ? ' collapsed' : ''}`}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sidebar-status-dot" />
                            <span className="sidebar-status-text">En línea</span>
                        </div>
                    )}
                    {collapsed && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                            <div className="sidebar-status-dot" />
                        </div>
                    )}
                </div>

            </aside>
        </>
    );
}
