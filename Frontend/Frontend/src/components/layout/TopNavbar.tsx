import { Menu, ShieldCheck, MonitorPlay, Vote, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/auth.service';
import './TopNavbar.css';

interface TopNavbarProps {
    onToggleSidebar: () => void;
    isSidebarCollapsed: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
    const user = authService.getCurrentUser();
    const { theme, toggleTheme } = useTheme();

    // Verificación robusta de rol admin
    const isAdmin = user?.rol_id === 0 ||
        user?.rol === 'admin' ||
        user?.rol?.nombre?.toLowerCase() === 'admin' ||
        user?.role === 'admin';

    return (
        <header className="top-navbar glass-navbar">
            <div className="navbar-container">
                {/* Minimal Hamburger Button - Left Aligned */}
                <button
                    className={`hamburger-btn-minimal ${!isSidebarCollapsed ? 'active' : ''}`}
                    onClick={onToggleSidebar}
                    title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
                >
                    <Menu size={28} color="#3b82f6" />
                </button>

                {/* Logo Section */}
                <div className="navbar-brand d-flex align-items-center gap-2">
                    <div className="logo-icon-sm">
                        <ShieldCheck size={28} />
                    </div>
                    <h1 className="navbar-title-sm mb-0">Asamblea 2026</h1>
                </div>

                {/* Accesos Directos */}
                <div className="ms-auto d-flex align-items-center gap-2 gap-sm-3 pe-3">
                    <button
                        className="btn-theme-toggle"
                        onClick={toggleTheme}
                        title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>

                    <button
                        onClick={() => window.open('/votar', '_blank')}
                        className="btn btn-outline-info btn-sm d-flex align-items-center gap-2 rounded-pill fw-bold border-opacity-50"
                    >
                        <Vote size={16} /> <span className="d-none d-sm-inline">Votar</span>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => window.open('/proyector', '_blank')}
                            className="btn btn-outline-warning btn-sm d-flex align-items-center gap-2 rounded-pill fw-bold border-opacity-50"
                            title="Abrir proyector en nueva pestaña"
                        >
                            <MonitorPlay size={16} /> <span className="d-none d-sm-inline">Proyección</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
