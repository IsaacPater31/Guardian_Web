import { NavLink } from 'react-router-dom';
import { Map, Bell, Users, LayoutDashboard } from 'lucide-react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/map', icon: Map, label: 'Mapa' },
    { path: '/alerts', icon: Bell, label: 'Alertas' },
    { path: '/communities', icon: Users, label: 'Comunidades' },
];

export default function Sidebar({ isOpen, onClose }) {
    return (
        <>
            {isOpen && (
                <div className="mobile-overlay" onClick={onClose} />
            )}
            <aside className={`sidebar${isOpen ? ' open' : ''}`}>

                {/* Brand */}
                <div className="sidebar-brand">
                    <img
                        src="/guardian_logo.png"
                        alt="Guardian"
                        style={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            flexShrink: 0,
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: 'white',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                        }}>
                            Guardian
                        </span>
                        <span style={{
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.45)',
                            fontWeight: 500,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                        }}>
                            Monitor de alertas
                        </span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Navegación</div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                            onClick={onClose}
                            end={item.path === '/'}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer" style={{ paddingBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#4CAF50',
                            boxShadow: '0 0 6px rgba(76,175,80,0.55)',
                            flexShrink: 0,
                        }} />
                        <span style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.28)',
                            fontWeight: 500,
                        }}>
                            En línea
                        </span>
                    </div>
                </div>

            </aside>
        </>
    );
}
