import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { authService } from './services/auth.service';
import type { User } from './types';
import { LoginPage } from './pages/all/Login_Page';
import { RegisterPage } from './pages/all/Register_Page';
import { RecoveryPage } from './pages/all/Recovery_Page';
import CreatePassword_Page from './pages/all/CreatePassword_Page';
import { Dashboard } from './pages/all/Dashboard';
import { DashboardAdmin } from './pages/admin/dashboard_admin';
import { UserManagement } from './pages/admin/usuarios_gestion_admin';
import { ParametrosGenerales } from './pages/admin/parametros_generales';
import { ParametrosEmail } from './pages/admin/parametros_email';
import { RolesPage } from './pages/admin/Roles_Page';
import { AccionistasPage } from './pages/admin/Accionistas_Page';
import { VotacionesPage } from './pages/admin/Votaciones_Page';
import { PreguntasConfigPage } from './pages/admin/Preguntas_Config_Page';
import { AsistenciaPage } from './pages/admin/Asistencia_Page';
import { QuorumPage } from './pages/admin/Quorum_Page';
import { Votacion_App_Page } from './pages/accionista/Votacion_App_Page';
import { Proyector_Page } from './pages/admin/Proyector_Page';
import { AccionistasDashboard_Page } from './pages/admin/AccionistasDashboard_Page';
import { Reporteria_Page } from './pages/admin/Reporteria_Page';
import { Consultas_Page } from './pages/admin/Consultas_Page';
import { Familiares_Page } from './pages/admin/Familiares_Page';
import { EmailMasivo_Page } from './pages/admin/EmailMasivo_Page';
import { EmailPlantillas_Page } from './pages/admin/EmailPlantillas_Page';
import { SystemLogs_Page } from './pages/admin/SystemLogs_Page';
import { Database_Page } from './pages/admin/Database_Page';
import { MiPerfilPage } from './pages/all/MiPerfil_Page';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';

function AppContent() {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async () => {
      if (user && user.access_token && user.rol_id === undefined && typeof user.rol !== 'string' && typeof user.role !== 'string') {
        try {
          const profile = await authService.getProfile(user.access_token);
          const updatedUser = { ...user, ...profile };
          setUser(updatedUser);

          if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } else if (sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.error('Error al obtener perfil al recargar:', error);
        }
      }
    };
    checkProfile();
  }, [user]);

  const getRoleName = (u: User | null) => {
    if (!u) return null;
    if (typeof u.rol === 'string') return u.rol;
    if (typeof u.role === 'string') return u.role;
    const data: any = (u as any).user || u;
    const roleId = data.rol_id;
    const roleMap: Record<string, string> = {
      "0": 'admin',
      "1": 'registro',
      "2": 'user',
      "3": 'accionistas'
    };
    const mappedRole = roleMap[String(roleId)];
    return mappedRole || 'user';
  };

  const role = getRoleName(user);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const isPublicRoute = ['/login', '/register', '/recovery', '/crear-password', '/votar'].includes(location.pathname) || location.pathname.startsWith('/votar');
  const isProyectorRoute = location.pathname === '/proyector';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="app-layout">
      {user && !isPublicRoute && !isProyectorRoute && (
        <>
          <TopNavbar
            isSidebarCollapsed={window.innerWidth < 992 ? !isMobileOpen : isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />
          <Sidebar
            user={user}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileOpen}
            onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </>
      )}

      <main className={user && !isPublicRoute && !isProyectorRoute ? `main-content ${isSidebarCollapsed ? 'collapsed' : ''}` : ''}>
        <Routes key={location.pathname}>
          {/* Rutas Públicas */}
          <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/" />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recovery" element={<RecoveryPage />} />
          <Route path="/crear-password" element={<CreatePassword_Page />} />
          <Route path="/votar" element={<Votacion_App_Page />} />
          <Route path="/proyector" element={user && role === 'admin' ? <Proyector_Page /> : <Navigate to="/" />} />

          {/* Rutas de Gestión de Accionistas */}
          <Route path="/admin/accionistas/dashboard" element={user && role === 'admin' ? <AccionistasDashboard_Page /> : <Navigate to="/" />} />
          <Route path="/admin/accionistas" element={user && role === 'admin' ? <AccionistasPage /> : <Navigate to="/" />} />
          <Route path="/admin/accionistas/reportes" element={user && role === 'admin' ? <Reporteria_Page /> : <Navigate to="/" />} />
          <Route path="/admin/accionistas/familiares" element={user && role === 'admin' ? <Familiares_Page /> : <Navigate to="/" />} />
          <Route path="/admin/consultas" element={user && role === 'admin' ? <Consultas_Page /> : <Navigate to="/" />} />

          {/* Home / Dashboard Redirect */}
          <Route
            path="/"
            element={
              user ? (
                role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Rutas de Administración */}
          <Route path="/admin/dashboard" element={user && role === 'admin' ? <DashboardAdmin /> : <Navigate to="/" />} />
          <Route path="/admin/users" element={user && role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
          <Route path="/admin/parametros/generales" element={user && role === 'admin' ? <ParametrosGenerales /> : <Navigate to="/" />} />
          <Route path="/admin/parametros/email" element={user && role === 'admin' ? <ParametrosEmail /> : <Navigate to="/" />} />
          <Route path="/admin/roles" element={user && role === 'admin' ? <RolesPage /> : <Navigate to="/" />} />
          <Route path="/admin/votes" element={user && role === 'admin' ? <VotacionesPage /> : <Navigate to="/" />} />
          <Route path="/admin/votes/config" element={user && role === 'admin' ? <PreguntasConfigPage /> : <Navigate to="/" />} />
          <Route path="/admin/asistencia" element={user && (role === 'admin' || role === 'registro') ? <QuorumPage /> : <Navigate to="/" />} />
          <Route path="/registro/new" element={user && (role === 'admin' || role === 'registro') ? <AsistenciaPage /> : <Navigate to="/" />} />
          <Route path="/admin/emails/masivo" element={user && role === 'admin' ? <EmailMasivo_Page /> : <Navigate to="/" />} />
          <Route path="/admin/emails/plantillas" element={user && role === 'admin' ? <EmailPlantillas_Page /> : <Navigate to="/" />} />
          <Route path="/admin/logs" element={user && role === 'admin' ? <SystemLogs_Page /> : <Navigate to="/" />} />
          <Route path="/admin/database" element={user && role === 'admin' ? <Database_Page /> : <Navigate to="/" />} />
          <Route path="/user/profile" element={user ? <MiPerfilPage /> : <Navigate to="/" />} />

          {/* Dashboard General (Acceso Directo si existe) */}
          <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
}

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}

export default App;
