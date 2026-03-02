import React from 'react';


interface DashboardProps {
    user: any;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    return (
        <div className="dashboard-simple animate-fade-in">
            <nav className="navbar navbar-expand-lg navbar-dark bg-glass border-bottom-glass px-4 py-3">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <h2 className="navbar-brand h4 fw-bold m-0 text-white">Panel Asamblea 2026</h2>
                    <div className="d-flex align-items-center gap-3">
                        <div className="text-end d-none d-sm-block">
                            <p className="m-0 text-white small fw-bold">{user.nombres} {user.apellidos}</p>
                            <p className="m-0 text-muted extra-small">{user.email}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="btn btn-danger btn-sm fw-bold px-3 py-2 rounded-pill shadow-sm"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container-fluid p-4 p-md-5">
                <div className="card bg-glass border-glass p-4 rounded-4 shadow-sm text-white">
                    <div className="row align-items-center">
                        <div className="col-lg-8">
                            <h1 className="display-6 fw-bold mb-3">Hola, {user.nombres}</h1>
                            <p className="text-muted lead mb-4">Módulo de gestión y votación activo para el período 2026.</p>
                        </div>
                    </div>

                    <div className="row g-4 mt-2">
                        {[
                            { title: 'Votaciones', icon: '✅', color: 'primary' },
                            { title: 'Accionistas', icon: '👥', color: 'success' },
                            { title: 'Configuración', icon: '⚙️', color: 'secondary' }
                        ].map((item) => (
                            <div key={item.title} className="col-sm-6 col-lg-4">
                                <div className={`card h-100 bg-${item.color}-glass border-${item.color}-light p-4 text-center hover-scale transition-all pointer`}>
                                    <div className="fs-1 mb-2">{item.icon}</div>
                                    <h3 className="h5 fw-bold mb-2">{item.title}</h3>
                                    <p className="text-muted small mb-0">Gestionar este módulo</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};
