import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Spinner } from 'react-bootstrap';
import { FileText, CheckSquare, CheckCircle, Users, UserX, TrendingUp, BarChart } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Swal from 'sweetalert2';
import { listarAccionistas } from '../../services/accionistas.service';
import type { Accionista } from '../../services/accionistas.service';
import { configService, type AsambleaConfig } from '../../services/config.service';

export const QuorumPage: React.FC = () => {
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [config, setConfig] = useState<AsambleaConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDatos();

        // Auto-refresh data every 10 seconds to keep quorum real-time
        const interval = setInterval(() => {
            cargarDatos(false);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const cargarDatos = async (showLoadState = true) => {
        if (showLoadState) setLoading(true);
        try {
            const [data, conf] = await Promise.all([
                listarAccionistas(''), // Fetch all without search filter
                configService.getAsambleaConfig()
            ]);
            setAccionistas(data);
            setConfig(conf);
        } catch (error) {
            console.error('Error cargando datos para quórum:', error);
        } finally {
            if (showLoadState) setLoading(false);
        }
    };

    const handleFijarQuorum = async () => {
        const minimoRequerido = config?.porcentaje_minimo_inicio || 50;

        if (stats.quorumPorcentaje < minimoRequerido) {
            Swal.fire({
                icon: 'warning',
                title: 'Quórum Insuficiente',
                text: `El quórum actual (${stats.quorumPorcentaje}%) no alcanza el mínimo requerido para instalar la asamblea (${minimoRequerido}%).`,
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
            return;
        }

        const result = await Swal.fire({
            title: '¿Fijar Quórum Definitivo?',
            text: `¿Seguro que deseas fijar el quórum actual (${stats.quorumPorcentaje}%) como el 100% definitivo? Las votaciones se calcularán en base a este nuevo total.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, fijar quórum',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        try {
            await configService.fijarQuorum();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'El quórum ha sido fijado correctamente.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
                timer: 2000,
                showConfirmButton: false
            });
            cargarDatos();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || "Hubo un error al fijar el quórum.",
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        }
    };

    const stats = {
        totalSocios: accionistas.length,
        presentes: accionistas.filter(a => a.asistencias && a.asistencias.length > 0).length,
        ausentes: accionistas.filter(a => !a.asistencias || a.asistencias.length === 0).length,
        quorumAcciones: accionistas
            .filter(a => a.asistencias && a.asistencias.length > 0)
            .reduce((acc, curr) => acc + (curr.total_acciones || 0), 0),
        quorumPorcentaje: parseFloat(
            accionistas
                .filter(a => a.asistencias && a.asistencias.length > 0)
                .reduce((acc, curr) => acc + (curr.porcentaje_base || 0), 0)
                .toFixed(2)
        )
    };

    const pieData = [
        { name: 'Presente', value: stats.quorumPorcentaje, color: '#10b981' },
        { name: 'Faltante', value: Math.max(0, 100 - stats.quorumPorcentaje), color: 'var(--text-dim)', opacity: 0.1 }
    ];

    const quorumFijado = config?.quorum_final_calculado ? parseFloat(config.quorum_final_calculado.toFixed(2)) : 0;
    const isQuorumFijado = quorumFijado > 0;

    if (loading && accionistas.length === 0) {
        return (
            <Container fluid className="px-4 py-4 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-3 text-dim">Cargando datos del quórum...</div>
            </Container>
        );
    }

    return (
        <Container fluid className="px-4 py-4 min-vh-100 position-relative">
            {/* Background Glow effects */}
            <div className="position-absolute top-0 start-0 w-50 h-50 bg-primary rounded-circle blur-bg opacity-10" style={{ zIndex: -1, translate: '-20% -20%', filter: 'blur(100px)' }}></div>
            <div className="position-absolute bottom-0 end-0 w-50 h-50 bg-success rounded-circle blur-bg opacity-10" style={{ zIndex: -1, translate: '20% 20%', filter: 'blur(100px)' }}></div>

            <header className="mb-5 d-flex justify-content-between align-items-end flex-wrap gap-3">
                <div>
                    <h1 className="display-6 fw-bold text-main mb-2 d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-25 p-3 rounded-circle text-primary">
                            <FileText size={36} />
                        </div>
                        Control de Quórum
                    </h1>
                    <p className="text-dim ms-2 mb-0 fs-5">Panel en tiempo real de asistencia y conformación para la asamblea.</p>
                </div>
                {isQuorumFijado && (
                    <Badge bg="success" className="px-4 py-3 fs-5 rounded-pill d-flex align-items-center gap-2 border border-success border-opacity-50 shadow text-uppercase shadow-lg shadow-success">
                        <CheckSquare size={20} /> Quórum Fijado ({quorumFijado}%)
                    </Badge>
                )}
            </header>

            <Row className="g-4">
                <Col lg={8}>
                    <Row className="g-4">
                        <Col sm={6}>
                            <Card className="bg-glass border-glass shadow-lg h-100 overflow-hidden position-relative hover-scale">
                                <div className="position-absolute top-0 start-0 w-100 h-100 bg-success opacity-5" style={{ zIndex: 0 }}></div>
                                <Card.Body className="p-4 d-flex flex-column justify-content-center position-relative z-index-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="text-dim small text-uppercase letter-spacing-1 fw-bold">Presentes en Sala</div>
                                        <div className="bg-success bg-opacity-25 text-success rounded-circle p-2">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                    <div className="display-4 mb-0 text-main fw-bold d-flex align-items-baseline gap-2">
                                        <span>{stats.presentes}</span>
                                        <span className="text-dim fs-4 fw-light">/ {stats.totalSocios}</span>
                                    </div>
                                    <div className="mt-2 small fw-medium text-success">Asambleístas registrados</div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col sm={6}>
                            <Card className="bg-glass border-glass shadow-lg h-100 overflow-hidden position-relative hover-scale">
                                <div className="position-absolute top-0 start-0 w-100 h-100 bg-danger opacity-5" style={{ zIndex: 0 }}></div>
                                <Card.Body className="p-4 d-flex flex-column justify-content-center position-relative z-index-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="text-dim small text-uppercase letter-spacing-1 fw-bold">Ausentes</div>
                                        <div className="bg-danger bg-opacity-25 text-danger rounded-circle p-2">
                                            <UserX size={20} />
                                        </div>
                                    </div>
                                    <div className="display-4 mb-0 text-main fw-bold">{stats.ausentes}</div>
                                    <div className="mt-2 small fw-medium text-danger">Faltan por registrarse</div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col sm={6}>
                            <Card className="bg-glass border-glass shadow-lg h-100 overflow-hidden position-relative hover-scale">
                                <div className="position-absolute top-0 start-0 w-100 h-100 bg-info opacity-5" style={{ zIndex: 0 }}></div>
                                <Card.Body className="p-4 d-flex flex-column justify-content-center position-relative z-index-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="text-dim small text-uppercase letter-spacing-1 fw-bold">Total Acciones Presenciales</div>
                                        <div className="bg-info bg-opacity-25 text-info rounded-circle p-2">
                                            <TrendingUp size={20} />
                                        </div>
                                    </div>
                                    <div className="display-4 mb-0 text-main fw-bold">{stats.quorumAcciones.toLocaleString()}</div>
                                    <div className="mt-2 small fw-medium text-info">Suma base consolidada</div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col sm={6}>
                            <Card className={`bg-glass border-glass shadow-lg h-100 overflow-hidden position-relative transition-all`}
                                style={{ border: isQuorumFijado ? '2px solid rgba(16, 185, 129, 0.4)' : undefined }}>
                                <div className={`position-absolute top-0 start-0 w-100 h-100 opacity-5 ${stats.quorumPorcentaje >= (config?.porcentaje_minimo_inicio || 50) ? 'bg-success' : 'bg-warning'}`} style={{ zIndex: 0 }}></div>
                                <Card.Body className="p-4 d-flex flex-column justify-content-between h-100 position-relative z-index-1">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="text-dim small text-uppercase letter-spacing-1 fw-bold">Quórum Relativo Actual</div>
                                            <div className={`${stats.quorumPorcentaje >= (config?.porcentaje_minimo_inicio || 50) ? 'bg-success text-success' : 'bg-warning text-warning'} bg-opacity-25 rounded-circle p-2`}>
                                                <BarChart size={20} />
                                            </div>
                                        </div>
                                        <div className={`display-3 fw-bold text-main mb-0`}>
                                            {stats.quorumPorcentaje}%
                                        </div>
                                    </div>

                                    {!isQuorumFijado && stats.quorumPorcentaje > 0 && (
                                        <div className="mt-4 mt-auto">
                                            <Button
                                                variant="outline-primary"
                                                className="w-100 py-3 rounded-pill d-flex align-items-center justify-content-center gap-2 hover-scale fw-bold"
                                                onClick={handleFijarQuorum}
                                                title="Fijar este % como el nuevo 100% para la Asamblea"
                                            >
                                                <CheckCircle size={20} /> Validar y Fijar Quórum Definitivo
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                <Col lg={4}>
                    <Card className="bg-glass border-glass rounded-4 shadow-lg h-100 p-0 overflow-hidden d-flex flex-column align-items-center justify-content-center position-relative">
                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient rounded opacity-10" style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.2) 0%, rgba(15,23,42,0) 100%)' }}></div>

                        <div className="text-center w-100 position-relative" style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={110}
                                        outerRadius={140}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={true}
                                        cornerRadius={5}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={entry.opacity || 1} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-main)', boxShadow: 'var(--card-shadow)' }}
                                        itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                                        formatter={(value: number | undefined) => [`${value || 0}%`, 'Conformación']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="position-absolute top-50 start-50 translate-middle text-center d-flex flex-column align-items-center justify-content-center rounded-circle" style={{ width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }}>
                                <div className="display-4 fw-bold text-main mb-0">
                                    {stats.quorumPorcentaje}%
                                </div>
                                <div className="text-uppercase fw-bold letter-spacing-2 mt-1" style={{ fontSize: '0.85rem', color: '#10b981' }}>Quórum</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default QuorumPage;
