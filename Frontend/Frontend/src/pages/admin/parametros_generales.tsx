import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { Settings, Save, Play, Square } from 'lucide-react';
import { configService, type AsambleaConfig } from '../../services/config.service';
import Swal from 'sweetalert2';

export const ParametrosGenerales: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [config, setConfig] = useState<AsambleaConfig>({
        nombre_evento: '',
        periodo_activo: '',
        limite_registro_asistencia: '',
        porcentaje_minimo_inicio: 50,
        asamblea_iniciada: false,
        asamblea_finalizada: false,
        inicio_automatico: false,
        permitir_registro_publico: true,
        sobrescribir_importacion: false,
        quorum_final_calculado: 0,
        modo_entorno: 'produccion',
        notificar_inicio_asamblea: false,
        tipo_votacion_permitida: 'hibrido'
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getAsambleaConfig();

            // Cargar quórum actual (asistentes que no son fuera de quórum)
            // Necesitamos importar listarAccionistas de accionistasService
            // Pero no está importado. Lo añadiré a los imports.

            let formattedDate = data.limite_registro_asistencia;
            if (formattedDate && formattedDate.includes('Z')) {
                formattedDate = new Date(formattedDate).toISOString().slice(0, 16);
            }

            setConfig({
                ...data,
                limite_registro_asistencia: formattedDate
            });
        } catch (err: any) {
            console.error(err);
            if (err.response?.status !== 404) {
                setError('No se pudo cargar la configuración de asamblea.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            // Add Z if it's a datetime-local without timezone so backend recognizes it better, though backend uses ISO.
            const payload = { ...config };
            if (payload.limite_registro_asistencia && !payload.limite_registro_asistencia.includes('Z')) {
                payload.limite_registro_asistencia = new Date(payload.limite_registro_asistencia).toISOString();
            }

            await configService.updateAsambleaConfig(payload);
            setSuccessMsg('Configuración guardada exitosamente.');
            loadConfig(); // reload to get exact formats/calculated fields back
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const handleIniciarAsamblea = async () => {
        // Validación de quórum mínimo (Simulada si no hay servicio de quórum directo aquí)
        // Para una validación real, deberíamos obtener el quórum actual del backend.
        // Por ahora, preguntaremos al usuario si desea continuar incluso si no se muestra el quórum exacto aquí.

        if (!window.confirm("¿Deseas iniciar la asamblea? Asegúrate de que el quórum mínimo se haya cumplido.")) return;

        setActionLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const data = await configService.iniciarAsamblea();
            if (data.quorum_final_calculado! < config.porcentaje_minimo_inicio) {
                alert(`¡ADVERTENCIA! La asamblea inició con un quórum de ${data.quorum_final_calculado}%, el cual es menor al mínimo requerido (${config.porcentaje_minimo_inicio}%).`);
            }
            setSuccessMsg('Asamblea iniciada exitosamente.');
            setConfig(prev => ({ ...prev, asamblea_iniciada: data.asamblea_iniciada, quorum_final_calculado: data.quorum_final_calculado }));
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Error al iniciar la asamblea.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReiniciarAsamblea = async () => {
        const result = await Swal.fire({
            title: '¿Reiniciar Asamblea?',
            text: '¿Estás SEGURO de reiniciar la asamblea? El quórum se descongelará y volverá a estado NO INICIADA.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, reiniciar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            await configService.reiniciarAsamblea();
            await loadConfig();
            Swal.fire({
                icon: 'success',
                title: 'Asamblea Reiniciada',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || "Error al reiniciar",
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizarAsamblea = async () => {
        const result = await Swal.fire({
            title: '¿Finalizar Asamblea?',
            text: '¿Estás SEGURO de finalizar la asamblea formalmente? Esto cerrará el evento y bloqueará cambios adicionales. Esta acción es definitiva para el cierre del acta.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, finalizar y cerrar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            await configService.finalizarAsamblea();
            await loadConfig();
            Swal.fire({
                icon: 'success',
                title: 'Asamblea Clausurada',
                text: 'El evento ha sido finalizado y cerrado oficialmente.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
                timer: 2500,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || "Error al finalizar",
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="admin-dashboard p-4 h-100 overflow-auto">
            <header className="mb-4">
                <div className="d-flex align-items-center mb-2">
                    <Settings className="text-primary me-2" size={28} />
                    <h1 className="h3 fw-bold text-main mb-0">Parámetros Generales</h1>
                </div>
                <p className="text-dim">Ajusta la configuración principal del sistema de asambleas.</p>
            </header>

            <Container fluid className="px-0">
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)} dismissible>{successMsg}</Alert>}

                <Row className="g-4">
                    <Col lg={8}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm mb-4">
                            <Card.Body className="p-4 p-md-5">
                                <h3 className="h5 fw-bold text-main mb-4 border-bottom border-main-opacity pb-3">
                                    Información de la Asamblea
                                </h3>

                                <Form onSubmit={handleSave}>
                                    <Row className="g-4 mb-4">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Nombre de la Asamblea / Evento</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="nombre_evento"
                                                    value={config.nombre_evento}
                                                    onChange={handleChange}
                                                    placeholder="ej. Asamblea General Ordinaria 2026"
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Periodo Activo</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="periodo_activo"
                                                    value={config.periodo_activo}
                                                    onChange={handleChange}
                                                    placeholder="2026"
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Límite Registro de Asistencia</Form.Label>
                                                <Form.Control
                                                    type="datetime-local"
                                                    name="limite_registro_asistencia"
                                                    value={config.limite_registro_asistencia}
                                                    onChange={handleChange}
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity mt-2">
                                                <div>
                                                    <span className="text-main d-block fw-medium">Inicio Automático de Asamblea</span>
                                                    <small className="text-dim" style={{ fontSize: '0.85em' }}>
                                                        La asamblea se considerará "Iniciada" automáticamente al llegar a la fecha límite.
                                                    </small>
                                                </div>
                                                <Form.Check
                                                    type="switch"
                                                    id="inicio-automatico"
                                                    name="inicio_automatico"
                                                    checked={config.inicio_automatico}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, inicio_automatico: e.target.checked }))}
                                                    className="fs-4 m-0"
                                                />
                                            </div>
                                        </Col>
                                        <Col md={12}>
                                            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity mt-2">
                                                <div>
                                                    <span className="text-main d-block fw-medium">Modo de Importación (Sobrescribir)</span>
                                                    <small className="text-dim" style={{ fontSize: '0.85em' }}>
                                                        Al cargar una plantilla, se eliminará la base actual del periodo y se reemplazará por la nueva.
                                                    </small>
                                                </div>
                                                <Form.Check
                                                    type="switch"
                                                    id="sobrescribir-importacion"
                                                    name="sobrescribir_importacion"
                                                    checked={config.sobrescribir_importacion}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, sobrescribir_importacion: e.target.checked }))}
                                                    className="fs-4 m-0"
                                                />
                                            </div>
                                        </Col>
                                        <Col md={12}>
                                            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-primary border-opacity-20 mt-2 shadow-sm">
                                                <div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-main d-block fw-bold">📧 Notificar Inicio de Asamblea</span>
                                                        <Badge bg="primary" className="bg-opacity-25 text-primary small" style={{ fontSize: '0.6rem' }}>AVISO</Badge>
                                                    </div>
                                                    <small className="text-dim" style={{ fontSize: '0.85em' }}>
                                                        Al iniciar la asamblea (manual o automáticamente), se enviará un correo de notificación a todos los <strong>usuarios activos</strong>.
                                                    </small>
                                                </div>
                                                <Form.Check
                                                    type="switch"
                                                    id="notificar-inicio-asamblea"
                                                    name="notificar_inicio_asamblea"
                                                    checked={config.notificar_inicio_asamblea}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, notificar_inicio_asamblea: e.target.checked }))}
                                                    className="fs-4 m-0 custom-switch-glow"
                                                />
                                            </div>
                                        </Col>
                                        <Col md={12}>
                                            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity mt-2">
                                                <div className="flex-grow-1 pe-4">
                                                    <span className="text-main d-block fw-bold">🗳️ Modalidad de Votación</span>
                                                    <small className="text-dim" style={{ fontSize: '0.85em' }}>
                                                        Define cómo registrarán los votos los asistentes de tipo presencial/híbrido. (Teléfono móvil, Papel, o Híbrido).
                                                    </small>
                                                </div>
                                                <div style={{ minWidth: '200px' }}>
                                                    <Form.Select
                                                        name="tipo_votacion_permitida"
                                                        value={config.tipo_votacion_permitida || 'hibrido'}
                                                        onChange={handleChange}
                                                        className="bg-transparent text-main border-main-opacity"
                                                    >
                                                        <option value="hibrido">Híbrido (App + Papel)</option>
                                                        <option value="telefono">Solo Teléfono (App)</option>
                                                        <option value="papel">Solo Papel (Subida Manual)</option>
                                                    </Form.Select>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    <div className="border-top border-main-opacity pt-4 mt-4">
                                        <h3 className="h5 fw-bold text-main mb-4 d-flex align-items-center gap-2">
                                            Entorno de Base de Datos
                                            <Badge bg="info" className="fs-6 opacity-75">Configuración de Seguridad</Badge>
                                        </h3>
                                        <Row className="g-4 mb-4">
                                            <Col md={12}>
                                                <div className="p-3 rounded-3 bg-surface border border-info border-opacity-20">
                                                    <Form.Label className="text-main fw-medium mb-3">Seleccionar Entorno Activo</Form.Label>
                                                    <div className="d-flex gap-4">
                                                        <Form.Check
                                                            type="radio"
                                                            label="🚀 Base de Producción"
                                                            name="modo_entorno"
                                                            id="env-prod"
                                                            value="produccion"
                                                            checked={config.modo_entorno === 'produccion'}
                                                            onChange={handleChange}
                                                            className="text-main"
                                                        />
                                                        <Form.Check
                                                            type="radio"
                                                            label="🧪 Base de Prueba / Desarrollo"
                                                            name="modo_entorno"
                                                            id="env-test"
                                                            value="prueba"
                                                            checked={config.modo_entorno === 'prueba'}
                                                            onChange={handleChange}
                                                            className="text-main"
                                                        />
                                                    </div>
                                                    <Form.Text className="text-info opacity-75 mt-2 d-block small italic">
                                                        <Alert variant="info" className="p-2 mb-0 mt-2 bg-transparent border-0 text-info" style={{ fontSize: '0.85em' }}>
                                                            * El sistema apuntará a la base configurada en <strong>DATABASE_URL</strong> para producción o <strong>DATABASE_URL_TEST</strong> para prueba.
                                                        </Alert>
                                                    </Form.Text>
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>

                                    <div className="border-top border-main-opacity pt-4 mt-5">
                                        <h3 className="h5 fw-bold text-main mb-4">
                                            Configuración del Quórum
                                        </h3>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="text-main fw-bold">Porcentaje Mínimo Instalación (%)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="porcentaje_minimo_inicio"
                                                value={config.porcentaje_minimo_inicio}
                                                onChange={handleChange}
                                                step={0.1}
                                                className="bg-transparent text-main border-main-opacity"
                                                style={{ maxWidth: '800px' }}
                                                required
                                            />
                                            <Form.Text className="text-dim mt-2 d-block">Por defecto: 50% (Mayoría simple)</Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="text-main fw-bold">Tiempo de Prórroga para Registro (Minutos)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="minutos_prorroga"
                                                value={config.minutos_prorroga}
                                                onChange={handleChange}
                                                step={1}
                                                min={0}
                                                className="bg-transparent text-main border-main-opacity"
                                                style={{ maxWidth: '800px' }}
                                                required
                                            />
                                            <Form.Text className="text-dim mt-2 d-block">Minutos a esperar adicionalmente antes de tomar decisión sobre quórum no alcanzado.</Form.Text>
                                        </Form.Group>

                                        <div className="d-flex justify-content-end mt-4">
                                            <Button type="submit" variant="primary" disabled={saving} className="login-btn-gradient px-4 py-2 border-0 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: '#9333ea', backgroundImage: 'linear-gradient(to right, #8b5cf6, #c084fc)' }}>
                                                {saving ? <Spinner size="sm" animation="border" /> : <Save size={18} />}
                                                <span>Guardar Cambios Generales</span>
                                            </Button>
                                        </div>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm h-100">
                            <Card.Header className="bg-transparent border-bottom-glass p-4">
                                <h2 className="h5 fw-bold text-main m-0">Control de Sesión</h2>
                            </Card.Header>
                            <Card.Body className="p-4 d-flex flex-column gap-3">
                                <div className="d-flex align-items-center justify-content-between p-2 border border-glass rounded-3 mb-3">
                                    <span className="text-dim small">Estado Asamblea</span>
                                    {config.asamblea_finalizada ? (
                                        <Badge className="badge-glass-danger text-uppercase">Finalizada / Cerrada</Badge>
                                    ) : config.asamblea_iniciada ? (
                                        <Badge className="badge-glass-success text-uppercase">Iniciada</Badge>
                                    ) : (
                                        <Badge className="badge-glass-warning text-uppercase">En Espera</Badge>
                                    )}
                                </div>
                                {config.asamblea_iniciada && (
                                    <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity">
                                        <span className="text-dim">Quórum Final</span>
                                        <span className="fw-bold text-main">{config.quorum_final_calculado}%</span>
                                    </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity mt-1">
                                    <div>
                                        <span className="text-main d-block fw-medium">Registro Público</span>
                                        <small className="text-dim" style={{ fontSize: '0.7em' }}>Habilita al usuario registrarse en el Login</small>
                                    </div>
                                    <Form.Check
                                        type="switch"
                                        id="switch-registro-publico"
                                        name="permitir_registro_publico"
                                        checked={config.permitir_registro_publico}
                                        onChange={(e) => {
                                            setConfig(prev => ({ ...prev, permitir_registro_publico: e.target.checked }));
                                            // Optional: visual clue about save
                                        }}
                                        className="fs-4 m-0"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="mt-4 pt-3 border-top border-main-opacity d-flex justify-content-center">
                                    {!config.asamblea_iniciada ? (
                                        <Button
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                                            onClick={handleIniciarAsamblea}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <Spinner size="sm" animation="border" /> : <Play size={18} />}
                                            Iniciar Asamblea
                                        </Button>
                                    ) : (
                                        <div className="w-100 d-flex flex-column gap-2">
                                            <Button
                                                variant="outline-danger"
                                                className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                                                disabled
                                            >
                                                <Square size={18} />
                                                Asamblea en Curso
                                            </Button>
                                            <div className="mt-4 pt-3 border-top border-glass text-center">
                                                {config.asamblea_iniciada && !config.asamblea_finalizada && (
                                                    <div className="mb-3">
                                                        <Button
                                                            variant="primary"
                                                            className="w-100 rounded-pill py-2 shadow-sm"
                                                            onClick={handleFinalizarAsamblea}
                                                        >
                                                            Finalizar Asamblea Oficialmente
                                                        </Button>
                                                    </div>
                                                )}

                                                {config.asamblea_iniciada && !config.asamblea_finalizada && (
                                                    <button
                                                        className="btn btn-link text-danger text-decoration-none small"
                                                        onClick={handleReiniciarAsamblea}
                                                    >
                                                        Reiniciar Asamblea
                                                    </button>
                                                )}

                                                {config.asamblea_finalizada && (
                                                    <div className="text-danger small fw-bold">
                                                        El evento ha sido clausurado satisfactoriamente.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};
