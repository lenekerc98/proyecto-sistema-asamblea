import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { Database, Activity, ShieldAlert, Trash2, Users, FileText, Vote } from 'lucide-react';
import Swal from 'sweetalert2';
import { databaseService } from '../../services/database.service';
import '../../styles/Glassmorphism.css';

interface MetricsData {
    usuarios: number;
    accionistas: number;
    asistencias: number;
    votos: number;
    logs: number;
}

export const Database_Page: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [metrics, setMetrics] = useState<MetricsData>({
        usuarios: 0,
        accionistas: 0,
        asistencias: 0,
        votos: 0,
        logs: 0
    });

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const data = await databaseService.getMetrics();
            setMetrics(data);
        } catch (error) {
            console.error('Error fetching metrics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, []);

    const handleClean = async (type: 'logs' | 'votaciones' | 'asistencias') => {
        const typeLabels = {
            logs: "Historial de Logs",
            votaciones: "Votos y Escrutinio",
            asistencias: "Registros de Asistencia"
        };

        const label = typeLabels[type];

        const confirmResult = await Swal.fire({
            title: `¿Purgar ${label}?`,
            text: `Esta acción vaciará completamente todos los registros de ${label} de la Base de Datos. Esta acción NO se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, Purgar Datos',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (confirmResult.isConfirmed) {
            setActionLoading(true);
            try {
                let res;
                if (type === 'logs') res = await databaseService.cleanLogs();
                else if (type === 'votaciones') res = await databaseService.cleanVotaciones();
                else if (type === 'asistencias') res = await databaseService.cleanAsistencias();

                Swal.fire({
                    icon: 'success',
                    title: 'Limpieza Completada',
                    text: res?.mensaje || `Los datos de ${label} han sido purgados.`,
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)',
                    timer: 2500,
                    showConfirmButton: false
                });

                await loadMetrics(); // Reload the metrics chart
            } catch (error: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Limpieza',
                    text: error.response?.data?.detail || 'No se pudo completar la limpieza.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)'
                });
            } finally {
                setActionLoading(false);
            }
        }
    };

    return (
        <Container fluid className="py-4 min-vh-100">
            <header className="mb-4">
                <h1 className="h3 fw-bold text-main mb-2 d-flex align-items-center gap-2">
                    <Database className="text-primary" /> Base de Datos
                </h1>
                <p className="text-dim">Centro de comando del motor de almacenamiento y limpieza de datos.</p>
            </header>

            {loading ? (
                <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <>
                    {/* SECTION: MÉTRICAS GENERALES */}
                    <div className="mb-4">
                        <h5 className="text-dim mb-3 small fw-bold">VOLUMEN DE DATOS ALMACENADOS</h5>
                        <Row className="g-3">
                            <Col md={3} sm={6}>
                                <Card className="bg-glass border-glass shadow-sm h-100">
                                    <Card.Body className="d-flex align-items-center justify-content-between p-4">
                                        <div>
                                            <p className="text-dim small mb-1">Accionistas Censo</p>
                                            <h3 className="text-main fw-bold mb-0">{metrics.accionistas.toLocaleString()}</h3>
                                        </div>
                                        <div className="bg-primary bg-opacity-25 p-3 rounded-circle text-primary">
                                            <Users size={24} />
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={3} sm={6}>
                                <Card className="bg-glass border-glass shadow-sm h-100">
                                    <Card.Body className="d-flex align-items-center justify-content-between p-4">
                                        <div>
                                            <p className="text-dim small mb-1">Total Asistencias</p>
                                            <h3 className="text-main fw-bold mb-0">{metrics.asistencias.toLocaleString()}</h3>
                                        </div>
                                        <div className="bg-success bg-opacity-25 p-3 rounded-circle text-success">
                                            <FileText size={24} />
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={3} sm={6}>
                                <Card className="bg-glass border-glass shadow-sm h-100">
                                    <Card.Body className="d-flex align-items-center justify-content-between p-4">
                                        <div>
                                            <p className="text-dim small mb-1">Votos Emitidos</p>
                                            <h3 className="text-main fw-bold mb-0">{metrics.votos.toLocaleString()}</h3>
                                        </div>
                                        <div className="bg-warning bg-opacity-25 p-3 rounded-circle text-warning">
                                            <Vote size={24} />
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={3} sm={6}>
                                <Card className="bg-glass border-glass shadow-sm h-100">
                                    <Card.Body className="d-flex align-items-center justify-content-between p-4">
                                        <div>
                                            <p className="text-dim small mb-1">Historial Logs</p>
                                            <h3 className="text-main fw-bold mb-0">{metrics.logs.toLocaleString()}</h3>
                                        </div>
                                        <div className="bg-secondary bg-opacity-25 p-3 rounded-circle text-secondary">
                                            <Activity size={24} />
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </div>

                    {/* SECTION: HERRAMIENTAS DE MANTENIMIENTO */}
                    <Card className="bg-glass border-danger border-opacity-25 rounded-4 shadow-sm mb-4">
                        <Card.Header className="border-bottom border-danger border-opacity-10 bg-danger bg-opacity-10 p-3">
                            <h5 className="text-danger mb-0 d-flex align-items-center gap-2">
                                <ShieldAlert size={20} /> ZONA DE PELIGRO: Limpieza de Base de Datos
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <p className="text-dim mb-4">
                                Estas acciones vacían las tablas (tablaturas) internas del sistema de manera irreversible.
                                Usa estas herramientas para reiniciar fases de pruebas antes de iniciar de la Asamblea Real,
                                o para vaciar el sistema de cara a un nuevo año.
                            </p>

                            <Row className="g-3">
                                {/* CARD: ASISTENCIAS */}
                                <Col lg={4}>
                                    <Card className="bg-black bg-opacity-25 border-danger border-opacity-10 h-100">
                                        <Card.Body className="p-4 d-flex flex-column">
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <div className="bg-danger bg-opacity-25 text-danger rounded-circle p-2">
                                                    <FileText size={24} />
                                                </div>
                                                <h6 className="text-main mb-0 fw-bold">Limpiar Asistencias</h6>
                                            </div>
                                            <p className="text-dim small flex-grow-1">
                                                Borra el registro Quórum. Todos los asambleístas de la base figurarán como NO asistentes y el quórum volverá a 0%. Útil si hubieron pruebas con las terminales de ingreso.
                                            </p>
                                            <Button
                                                variant="outline-danger"
                                                className="w-100 border-opacity-50 hover-scale d-flex justify-content-center align-items-center gap-2"
                                                onClick={() => handleClean('asistencias')}
                                                disabled={actionLoading || metrics.asistencias === 0}
                                            >
                                                {actionLoading ? <Spinner size="sm" /> : <Trash2 size={16} />} Purgar Asistencias
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* CARD: VOTACIONES */}
                                <Col lg={4}>
                                    <Card className="bg-black bg-opacity-25 border-danger border-opacity-10 h-100">
                                        <Card.Body className="p-4 d-flex flex-column">
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <div className="bg-danger bg-opacity-25 text-danger rounded-circle p-2">
                                                    <Vote size={24} />
                                                </div>
                                                <h6 className="text-main mb-0 fw-bold">Limpiar Votos</h6>
                                            </div>
                                            <p className="text-dim small flex-grow-1">
                                                Elimina todos los votos asociados a todas las preguntas de las urnas electorales. Útil luego de haber probado el sistema de votación y gráficos escrutinios con el cliente.
                                            </p>
                                            <Button
                                                variant="outline-danger"
                                                className="w-100 border-opacity-50 hover-scale d-flex justify-content-center align-items-center gap-2"
                                                onClick={() => handleClean('votaciones')}
                                                disabled={actionLoading || metrics.votos === 0}
                                            >
                                                {actionLoading ? <Spinner size="sm" /> : <Trash2 size={16} />} Purgar Votaciones
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* CARD: LOGS */}
                                <Col lg={4}>
                                    <Card className="bg-black bg-opacity-25 border-danger border-opacity-10 h-100">
                                        <Card.Body className="p-4 d-flex flex-column">
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <div className="bg-danger bg-opacity-25 text-danger rounded-circle p-2">
                                                    <Activity size={24} />
                                                </div>
                                                <h6 className="text-main mb-0 fw-bold">Limpiar Historial de Logs</h6>
                                            </div>
                                            <p className="text-dim small flex-grow-1">
                                                Limpia por completo la bitácora de actividad general del sistema. Ayuda a liberar peso en la base de datos si el historial ya no es requerido.
                                            </p>
                                            <Button
                                                variant="outline-danger"
                                                className="w-100 border-opacity-50 hover-scale d-flex justify-content-center align-items-center gap-2"
                                                onClick={() => handleClean('logs')}
                                                disabled={actionLoading || metrics.logs === 0}
                                            >
                                                {actionLoading ? <Spinner size="sm" /> : <Trash2 size={16} />} Purgar Logs
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    );
};
