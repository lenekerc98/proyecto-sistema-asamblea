import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    ChevronRight,
    ChevronDown,
    LogOut,
    ShieldCheck
} from 'lucide-react';
import { MENU_STRUCTURE } from '../../config/menu.config';
import type { MenuItem } from '../../config/menu.config';
import './Sidebar.css';

interface SidebarProps {
    user: any;
    onLogout: () => void;
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onToggleCollapse: () => void;
    onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isCollapsed, isMobileOpen, onToggleCollapse, onToggleMobile }) => {
    const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);
    const location = useLocation();

    // Resetear el menú abierto manualmente cuando cambia la ruta
    React.useEffect(() => {
        setOpenMenuTitle(null);
    }, [location.pathname]);

    // Mapeo de IDs de rol a nombres internos
    const getRoleName = (u: any) => {
        if (!u) return 'user';
        const data = u.user || u;
        if (typeof data.rol === 'string') return data.rol.toLowerCase();

        const roleId = data.rol_id;
        const roleMap: Record<string, string> = {
            "0": 'admin',
            "1": 'registro',
            "2": 'user',
            "3": 'accionistas'
        };
        return roleMap[String(roleId)] || 'user';
    };

    const role = getRoleName(user);

    // Resolver rutas dinámicas según el rol (ej: Dashboard)
    const resolveDynamicPath = (item: MenuItem, roleName: string): string | undefined => {
        if (item.key === 'dashboard') {
            if (roleName === 'admin') return '/admin/dashboard';
            if (roleName === 'registro') return '/registro/dashboard';
            if (roleName === 'accionistas') return '/accionistas/dashboard';
            return '/dashboard';
        }
        return item.path;
    };

    // Aplicar filtrado dinámico basado en el campo JSON 'permisos' del rol y campos booleanos directos
    const getFilteredNavItems = (roleName: string) => {
        const rolInfo = user?.rol;

        // El admin siempre ve TODO el MENU_STRUCTURE
        if (roleName === 'admin') {
            return MENU_STRUCTURE.map(item => ({
                ...item,
                path: resolveDynamicPath(item, roleName),
                subItems: item.subItems?.map(sub => ({
                    ...sub,
                    path: resolveDynamicPath(sub, roleName)
                }))
            }));
        }

        if (!rolInfo) return [];

        return MENU_STRUCTURE
            .filter(item => {
                // Si tiene un key específico, verificar en el objeto permisos O en los campos booleanos directos
                const hasPermission = !!(rolInfo.permisos?.[item.key] ||
                    (item.key === 'permiso_proyector' && rolInfo.permiso_proyector) ||
                    (item.key === 'permiso_votar' && rolInfo.permiso_votar));
                return hasPermission;
            })
            .map(item => {
                const processedItem = {
                    ...item,
                    path: resolveDynamicPath(item, roleName)
                };

                if (item.subItems) {
                    processedItem.subItems = item.subItems
                        .filter(sub => {
                            const hasSubPermission = !!(rolInfo.permisos?.[sub.key] ||
                                (sub.key === 'permiso_proyector' && rolInfo.permiso_proyector) ||
                                (sub.key === 'permiso_votar' && rolInfo.permiso_votar));
                            return hasSubPermission;
                        })
                        .map(sub => ({
                            ...sub,
                            path: resolveDynamicPath(sub, roleName)
                        }));
                }

                return processedItem;
            })
            .filter(item => !item.subItems || item.subItems.length > 0 || item.path); // Asegurar que tenga destino o hijos
    };

    const navItems = getFilteredNavItems(role);

    const getInitials = (name: string, lastName: string) => {
        return `${name?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const toggleMenu = (title: string) => {
        const isCurrentlyOpen = openMenuTitle !== null
            ? openMenuTitle === title
            : isSubMenuActive(navItems.find(i => i.title === title)?.subItems || []);

        // Si ya está abierto, lo cerramos (usamos string vacío para indicar que se cerró manualmente)
        if (isCurrentlyOpen) {
            setOpenMenuTitle("");
        } else {
            // Si está cerrado, abrimos solo este (funcionamiento de Acordeón)
            setOpenMenuTitle(title);
        }
    };

    const isSubMenuActive = (subItems: any[]) => {
        return subItems.some(item => location.pathname.startsWith(item.path));
    };

    const handleMobileLinkClick = () => {
        if (isMobileOpen && onToggleMobile) {
            onToggleMobile();
        }
    };

    return (
        <>
            {/* Overlay para cerrar el menú dándole click afuera */}
            {isMobileOpen && (
                <div className="sidebar-overlay d-lg-none" onClick={onToggleMobile}></div>
            )}

            <aside className={`sidebar-container ${isMobileOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-glass">
                    <div className={`sidebar-header ${isCollapsed ? 'justify-content-center px-0' : ''} d-lg-none`}>
                        <div className="d-flex align-items-center gap-2">
                            <div className="logo-icon">
                                <ShieldCheck size={32} />
                            </div>
                            <h1 className="sidebar-title">Asamblea 2026</h1>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        <p className="nav-section-title">Menú Principal</p>
                        {navItems.map((item) => {
                            if (item.subItems) {
                                // Priorizar el estado manual si existe, de lo contrario usar la ruta activa
                                const isOpen = openMenuTitle !== null
                                    ? openMenuTitle === item.title
                                    : isSubMenuActive(item.subItems);
                                return (
                                    <div key={item.title} className="menu-group">
                                        <button
                                            className={`nav-item nav-item-collapsible ${isSubMenuActive(item.subItems) ? 'active-parent' : ''}`}
                                            onClick={() => {
                                                if (isCollapsed) onToggleCollapse();
                                                toggleMenu(item.title);
                                            }}
                                        >
                                            {item.icon}
                                            <span>{item.title}</span>
                                            {isOpen ? (
                                                <ChevronDown size={14} className="ms-auto arrow-icon" />
                                            ) : (
                                                <ChevronRight size={14} className="ms-auto arrow-icon" />
                                            )}
                                        </button>

                                        <div className={`submenu-container ${isOpen ? 'open' : ''}`}>
                                            {item.subItems.map((sub: any) => (
                                                <NavLink
                                                    key={sub.key}
                                                    to={sub.path || '#'}
                                                    end
                                                    onClick={handleMobileLinkClick}
                                                    className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                                                >
                                                    <span>{sub.title}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <NavLink
                                    key={item.key}
                                    to={item.path || '#'}
                                    onClick={handleMobileLinkClick}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                >
                                    {item.icon}
                                    <span>{item.title}</span>
                                </NavLink>
                            );
                        })}
                    </nav>

                    <div className="sidebar-footer">
                        <div className="user-profile">
                            <div className="user-avatar">
                                {getInitials(user?.nombres, user?.apellidos)}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user?.nombres} {user?.apellidos}</span>
                                <span className="user-role">{role}</span>
                            </div>
                        </div>
                        <button onClick={onLogout} className="btn-logout">
                            <LogOut size={18} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
