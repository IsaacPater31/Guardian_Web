import { Menu, RefreshCw } from 'lucide-react';

export default function Header({ title, subtitle, onMenuClick, onRefresh }) {
    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="header-btn mobile-menu-btn"
                    onClick={onMenuClick}
                    aria-label="Menú"
                >
                    <Menu />
                </button>
                <div>
                    <h2 className="header-title">{title}</h2>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="header-right">
                {onRefresh && (
                    <button className="header-btn" onClick={onRefresh} title="Refrescar">
                        <RefreshCw />
                    </button>
                )}
            </div>
        </header>
    );
}
