import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Users, House, BarChart3, LayoutGrid, Building2, ChevronDown } from 'lucide-react';

const navItems = [
    { path: '/', icon: House, label: 'Inicio' },
    { path: '/dashboard', icon: BarChart3, label: 'Estadísticas' },
    { path: '/alerts', icon: Bell, label: 'Alertas' },
    { path: '/communities', icon: Users, label: 'Comunidades' },
];

const adminChildren = [
    { path: '/admin/users', icon: Users, label: 'Usuarios' },
    { path: '/admin/communities', icon: Building2, label: 'Comunidades' },
];

function isAdminPath(pathname) {
    return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function Sidebar({ isOpen, onClose, collapsed }) {
    const location = useLocation();
    const adminActive = isAdminPath(location.pathname);
    const [adminOpen, setAdminOpen] = useState(adminActive);

    useEffect(() => {
        if (adminActive) setAdminOpen(true);
    }, [adminActive]);

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
                        <div className="sidebar-nav-group">
                            <button
                                type="button"
                                className={`sidebar-link sidebar-link--group${adminActive ? ' sidebar-link--group-active' : ''}`}
                                aria-expanded={adminOpen}
                                onClick={() => setAdminOpen((o) => !o)}
                            >
                                <LayoutGrid className="sidebar-link-icon" />
                                <span className="sidebar-link-label">Admin</span>
                                <ChevronDown
                                    className={`sidebar-group-chevron${adminOpen ? ' open' : ''}`}
                                    aria-hidden
                                />
                            </button>
                            {adminOpen && (
                                <div className="sidebar-subnav" role="group" aria-label="Admin">
                                    {adminChildren.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `sidebar-link sidebar-link--child${isActive ? ' active' : ''}`
                                            }
                                            onClick={onClose}
                                        >
                                            <item.icon className="sidebar-link-icon" />
                                            <span className="sidebar-link-label">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {collapsed && (
                        <NavLink
                            to="/admin/users"
                            className={() => `sidebar-link${adminActive ? ' active' : ''} collapsed`}
                            onClick={onClose}
                            title="Admin"
                        >
                            <LayoutGrid className="sidebar-link-icon" />
                        </NavLink>
                    )}
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
