import React from 'react';
import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    Vote,
    Users2,
    Database,
    ShieldCheck,
    UserCircle,
    Mail,
    Activity,
    Search
} from 'lucide-react';

export interface MenuItem {
    key: string;
    title: string;
    path?: string;
    icon?: React.ReactNode;
    subItems?: MenuItem[];
}

export const MENU_STRUCTURE: MenuItem[] = [
    {
        key: 'dashboard',
        title: 'Dashboard',
        path: '/admin/dashboard', // Por defecto admin, se resuelve en Sidebar si es necesario
        icon: <LayoutDashboard size={20} />
    },
    {
        key: 'usuarios',
        title: 'Gestión Usuarios',
        path: '/admin/users',
        icon: <Users2 size={20} />
    },
    {
        key: 'accionistas',
        title: 'Gestión Accionistas',
        icon: <Users size={20} />,
        subItems: [
            { key: 'accionistas_dashboard', title: 'Dashboard', path: '/admin/accionistas/dashboard' },
            { key: 'accionistas_listado', title: 'Accionistas', path: '/admin/accionistas' },
            { key: 'accionistas_familiares', title: 'Familiares / Vínculos', path: '/admin/accionistas/familiares' },
            { key: 'accionistas_reporteria', title: 'Reportería (PDF/Excel)', path: '/admin/accionistas/reportes' }
        ]
    },
    {
        key: 'consultas',
        title: 'Consultas (Búsqueda)',
        path: '/admin/consultas',
        icon: <Search size={20} />
    },
    {
        key: 'votaciones',
        title: 'Votaciones',
        icon: <Vote size={20} />,
        subItems: [
            { key: 'votaciones_dashboard', title: 'Dashboard / Escrutinio', path: '/admin/votes' },
            { key: 'votaciones_config', title: 'Configuración Preguntas', path: '/admin/votes/config' }
        ]
    },
    {
        key: 'registro_asistencia',
        title: 'Registro de Asistencia',
        icon: <FileText size={20} />,
        subItems: [
            { key: 'asistencia_control', title: 'Control de Quórum', path: '/admin/asistencia' },
            { key: 'registro_new', title: 'Registrar Entrada', path: '/registro/new' }
        ]
    },
    {
        key: 'emails',
        title: 'Gestión de Emails',
        icon: <Mail size={20} />,
        subItems: [
            { key: 'emails_masivo', title: 'Envío Masivo', path: '/admin/emails/masivo' },
            { key: 'emails_plantillas', title: 'Plantillas y Firmas', path: '/admin/emails/plantillas' }
        ]
    },
    {
        key: 'logs',
        title: 'Logs del Sistema',
        path: '/admin/logs',
        icon: <Activity size={20} />
    },
    {
        key: 'parametros',
        title: 'Parámetros',
        icon: <Settings size={20} />,
        subItems: [
            { key: 'parametros_generales', title: 'Generales', path: '/admin/parametros/generales' },
            { key: 'parametros_email', title: 'Email', path: '/admin/parametros/email' }
        ]
    },
    {
        key: 'roles',
        title: 'Gestión Roles',
        path: '/admin/roles',
        icon: <ShieldCheck size={20} />
    },
    {
        key: 'base_datos',
        title: 'Base de Datos',
        path: '/admin/database',
        icon: <Database size={20} />
    },
    {
        key: 'perfil',
        title: 'Mi Perfil',
        path: '/user/profile',
        icon: <UserCircle size={20} />
    }
];
