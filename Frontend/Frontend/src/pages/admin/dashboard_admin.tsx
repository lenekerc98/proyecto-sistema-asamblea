import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { Users, Vote, FileText, Activity, ShieldCheck, Mail, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import { logsService } from '../../services/logs.service';
import type { LogEntry } from '../../services/logs.service';
import { configService } from '../../services/config.service';
import { votacionesService } from '../../services/votaciones.service';
import { listarAccionistas } from '../../services/accionistas.service';

export const DashboardAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState([
        { title: 'Total Accionistas', value: '--', subtitle: 'Cargando...', icon: <Users size={28} className="text-primary" />, color: 'primary' },
        { title: 'Quórum Actual', value: '--', subtitle: 'Cargando...', icon: <ShieldCheck size={28} className="text-success" />, color: 'success' },
        { title: 'Votaciones', value: '--', subtitle: 'Cargando...', icon: <Vote size={28} className="text-warning" />, color: 'warning' },
        { title: 'Emails Enviados', value: '--', subtitle: 'Últimos 30 días', icon: <Mail size={28} className="text-info" />, color: 'info' },
    ]);
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarDatos = async () => {
        try {
            setLoading(true);

            // 1. Accionistas
            const accionistas = await listarAccionistas();
            const totalAccionistas = accionistas.length;

            // 4. Logs Stats (Emails y otros)
            await logsService.obtenerDashboardStats();

            // 5. Logs recientes
            const logs = await logsService.obtenerLogs({ limit: 5 });
            setRecentLogs(logs);

            // 2. Quórum y Config
            const config = await configService.getAsambleaConfig();
            const quorumVal = config.quorum_final_calculado || 0;
            const quorumStr = `${quorumVal.toFixed(2)}%`;

            // 3. Votaciones
            const preguntas = await votacionesService.listarPreguntas();
            const preguntasActivas = preguntas.filter(p => p.estado === 'activa').length;
            const preguntasCerradas = preguntas.filter(p => p.estado === 'cerrada').length;
            const votacionesStr = `${preguntasCerradas} / ${preguntas.length}`;

            // 4. Logs Stats (Emails y otros)
            const logStats = await logsService.obtenerDashboardStats();

            setStats([
                {
                    title: 'Total Accionistas',
                    value: totalAccionistas.toString(),
                    subtitle: 'Registrados en Sistema',
                    icon: <Users size={28} className="text-primary" />,
                    color: 'primary'
                },
                {
                    title: 'Quórum Actual',
                    value: quorumStr,
                    subtitle: config.asamblea_iniciada ? 'Asamblea Iniciada' : 'Asamblea NO Iniciada',
                    icon: <ShieldCheck size={28} className="text-success" />,
                    color: 'success'
                },
                {
                    title: 'Votaciones',
                    value: votacionesStr,
                    subtitle: `${preguntasActivas} Preguntas Activas`,
                    icon: <Vote size={28} className="text-warning" />,
                    color: 'warning'
                },
                {
                    title: 'Inicios de Sesión',
                    value: (logStats.sesiones_total || 0).toString(),
                    subtitle: 'Total en el sistema',
                    icon: <Users size={28} className="text-info" />,
                    color: 'info'
                },
                {
                    title: 'Emails Enviados',
                    value: (logStats.emails_total || 0).toString(),
                    subtitle: 'Mensajes del sistema',
                    icon: <Mail size={28} className="text-secondary" />,
                    color: 'secondary'
                }
            ]);

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 30000); // Auto-refresh cada 30s
        return () => clearInterval(interval);
    }, []);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.round(diffMs / 60000);

        if (diffMin < 1) return 'Ahora mismo';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffMin < 1440) return `Hace ${Math.floor(diffMin / 60)} h`;
        return date.toLocaleDateString();
    };

    return (
        <div className="admin-dashboard p-4">
            <header className="mb-4 d-flex justify-content-between align-items-end border-bottom border-main-opacity pb-3">
                <div>
                    <h1 className="h3 fw-bold text-main mb-2">Dashboard General del Sistema</h1>
                    <p className="text-dim mb-0">Visión global de la Asamblea y Estadísticas principales.</p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2
                     d-flex align-items-center gap-2">
                        <span className="dot bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                        Sistema Online
                    </span>
                </div>
            </header>

            <Row className="g-4 mb-4">
                {stats.map((stat, idx) => (
                    <Col key={idx} xs={12} sm={6} lg={3}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm hover-scale h-100 border-opacity-10 overflow-hidden position-relative">
                            <div className={`position-absolute top-0 start-0 w-100 bg-${stat.color}`} style={{ height: '4px', opacity: 0.8 }}></div>
                            <Card.Body className="p-4 d-flex flex-column h-100">
                                <div className="d-flex align-items-start justify-content-between mb-3">
                                    <div className={`p-3 bg-${stat.color} bg-opacity-10 rounded-4 border border-${stat.color} border-opacity-25`}>
                                        {stat.icon}
                                    </div>
                                    <span className="badge bg-surface text-dim px-2 py-1 rounded-pill">LIVE</span>
                                </div>
                                <div className="mt-auto">
                                    <h3 className="h6 text-dim text-uppercase letter-spacing-wide mb-1">{stat.title}</h3>
                                    <p className="display-6 fw-bold text-main mb-1">{stat.value}</p>
                                    <p className="small text-dim mb-0">{stat.subtitle}</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-4">
                <Col lg={8}>
                    <div className="glass-table-container shadow-lg h-100">
                        <div className="p-4 border-bottom border-main-opacity bg-surface">
                            <h2 className="h5 fw-bold text-main m-0 d-flex align-items-center gap-3">
                                <Activity size={20} className="text-primary" />
                                Actividad y Registros (Live)
                            </h2>
                        </div>
                        <div className="table-responsive">
                            <table className="glass-table align-middle">
                                <thead>
                                    <tr>
                                        <th className="ps-4">Módulo</th>
                                        <th>Acción</th>
                                        <th>Usuario</th>
                                        <th className="pe-4">Tiempo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentLogs.length > 0 ? recentLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="ps-4">
                                                <Badge className={`badge-glass-${log.nivel === 'ERROR' ? 'danger' : (log.origen === 'SISTEMA' ? 'warning' : 'primary')} text-uppercase`}>
                                                    {log.origen}
                                                </Badge>
                                            </td>
                                            <td className="text-main">
                                                {log.accion && <div className="fw-bold">{log.accion}</div>}
                                                {log.mensaje && (
                                                    <div className="text-dim small fw-normal mt-1 opacity-75">
                                                        {log.mensaje}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-dim small">{log.usuario_email || `ID: ${log.usuario_id || 'Sys'}`}</td>
                                            <td className="text-dim small pe-4">{formatTime(log.fecha)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-5 text-dim border-0">
                                                {loading ? 'Cargando actividad...' : 'No hay actividad reciente.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Col>
                <Col lg={4}>
                    <Card className="bg-glass border-glass rounded-4 h-100">
                        <Card.Header className="bg-transparent border-bottom border-main-opacity p-4">
                            <h2 className="h5 fw-bold text-main m-0 d-flex align-items-center gap-2">
                                <TrendingUp size={20} className="text-success" />
                                Accesos Rápidos
                            </h2>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <div className="d-grid gap-3">
                                <button onClick={() => navigate('/admin/asistencia')} className="btn text-start p-3 bg-surface border border-main-opacity rounded-3 text-main hover-scale d-flex align-items-center gap-3">
                                    <div className="p-2 bg-primary bg-opacity-25 rounded text-primary">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="fw-bold">Reporte de Quórum</div>
                                        <small className="text-dim">Generar PDF Actual</small>
                                    </div>
                                </button>
                                <button onClick={() => navigate('/admin/votes')} className="btn text-start p-3 bg-surface border border-main-opacity rounded-3 text-main hover-scale d-flex align-items-center gap-3">
                                    <div className="p-2 bg-warning bg-opacity-25 rounded text-warning">
                                        <PieChart size={20} />
                                    </div>
                                    <div>
                                        <div className="fw-bold">Estadísticas de Votos</div>
                                        <small className="text-dim">Ver gráficas de escrutinio</small>
                                    </div>
                                </button>
                                <button onClick={() => navigate('/admin/parametros/generales')} className="btn text-start p-3 bg-surface border border-danger border-opacity-25 rounded-3 text-main hover-scale d-flex align-items-center gap-3 mt-3">
                                    <div className="p-2 bg-danger bg-opacity-25 rounded text-danger">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <div className="fw-bold text-danger">Emergencia</div>
                                        <small className="text-dim">Cerrar Sesiones Activas</small>
                                    </div>
                                </button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div >
    );
};
