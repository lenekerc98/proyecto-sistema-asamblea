import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { Mail, Save, Eye, EyeOff, Send } from 'lucide-react';
import Swal from 'sweetalert2';
import { configService, type EmailConfig } from '../../services/config.service';

export const ParametrosEmail: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [config, setConfig] = useState<EmailConfig>({
        smtp_server: '',
        smtp_port: 587,
        sender_email: '',
        sender_password: '',
        use_tls: true
    });

    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getEmailConfig();
            setConfig(data);
        } catch (err: any) {
            console.error(err);
            // Optionally set error if it's not a simple 404 (not configured yet)
            if (err.response?.status !== 404) {
                setError('No se pudo cargar la configuración de correo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await configService.updateEmailConfig(config);
            setSuccessMsg('Configuración guardada exitosamente.');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        const emailToTest = config.sender_email;
        if (!emailToTest) {
            Swal.fire({
                icon: 'warning',
                title: 'Remitente Vacío',
                text: 'Por favor, antes de probar configura y guarda el correo remitente.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
            });
            return;
        }

        setTesting(true);
        try {
            await configService.testEmailConfig();
            Swal.fire({
                icon: 'success',
                title: '¡Prueba Exitosa!',
                text: `El sistema logró enviar un correo conectándose por SMTP a ${emailToTest}.`,
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
            });
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: err.response?.data?.detail || 'No se pudo enviar el correo de prueba. Revisa credenciales y puertos.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)',
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <Spinner animation="border" variant="info" />
            </div>
        );
    }

    return (
        <div className="admin-dashboard p-4 h-100 overflow-auto">
            <header className="mb-4">
                <div className="d-flex align-items-center mb-2">
                    <Mail className="text-info me-2" size={28} />
                    <h1 className="h3 fw-bold text-main mb-0">Configuración de Correo</h1>
                </div>
                <p className="text-dim">Administra los parámetros SMTP y de envío de comunicaciones del sistema.</p>
            </header>

            <Container fluid className="px-0">
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)} dismissible>{successMsg}</Alert>}

                <Row className="g-4">
                    <Col lg={8}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm mb-4">
                            <Card.Body className="p-4 p-md-5">
                                <h3 className="h5 fw-bold text-main mb-4 border-bottom border-main-opacity pb-3">
                                    Servidor SMTP
                                </h3>

                                <Form onSubmit={handleSave}>
                                    <Row className="g-4 mb-4">
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Servidor Saliente (Host)</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="smtp_server"
                                                    value={config.smtp_server}
                                                    onChange={handleChange}
                                                    placeholder="ej. smtp.gmail.com"
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Puerto</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    name="smtp_port"
                                                    value={config.smtp_port}
                                                    onChange={handleChange}
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Correo Remitente (De:)</Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    name="sender_email"
                                                    value={config.sender_email}
                                                    onChange={handleChange}
                                                    placeholder="notificaciones@empresa.com"
                                                    className="bg-transparent text-main border-main-opacity"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="text-dim small fw-medium">Contraseña de Aplicación / SMTP</Form.Label>
                                                <InputGroup>
                                                    <Form.Control
                                                        type={showPassword ? "text" : "password"}
                                                        name="sender_password"
                                                        value={config.sender_password || ''}
                                                        onChange={handleChange}
                                                        placeholder="••••••••••••••••"
                                                        className="bg-transparent text-main border-main-opacity border-end-0"
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="bg-transparent border-main-opacity border-start-0"
                                                    >
                                                        {showPassword ? <EyeOff size={18} className="text-dim" /> : <Eye size={18} className="text-dim" />}
                                                    </Button>
                                                </InputGroup>
                                                <Form.Text className="text-dim">Déjalo en blanco si no deseas cambiar la contraseña guardada.</Form.Text>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Row className="mb-4">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Check
                                                    type="checkbox"
                                                    id="tls-check"
                                                    name="use_tls"
                                                    checked={config.use_tls}
                                                    onChange={handleChange}
                                                    label={<span className="text-main">Usar Conexión Segura (TLS/SSL)</span>}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-5 border-top border-main-opacity pt-4">
                                        <Button
                                            variant="outline-info"
                                            type="button"
                                            onClick={handleTestEmail}
                                            disabled={testing || !config.sender_email}
                                            className="mb-3 mb-sm-0 border-glass text-info px-4 py-2 d-flex align-items-center gap-2"
                                        >
                                            {testing ? <Spinner size="sm" animation="border" /> : <Send size={18} />}
                                            <span>{testing ? 'Comprobando...' : 'Enviar Correo de Prueba'}</span>
                                        </Button>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={saving}
                                            className="login-btn-gradient px-4 py-2 d-flex align-items-center gap-2"
                                        >
                                            {saving ? <Spinner size="sm" animation="border" /> : <Save size={18} />}
                                            <span>Guardar Configuración SMTP</span>
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm h-100">
                            <Card.Header className="bg-transparent border-bottom-glass p-4">
                                <h2 className="h5 fw-bold text-main m-0">Plantillas Activas</h2>
                            </Card.Header>
                            <Card.Body className="p-4 d-flex flex-column gap-3">
                                <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity hover-bg-light transition-all cursor-pointer">
                                    <div>
                                        <p className="text-main fw-bold mb-0">Registro Exitoso</p>
                                        <small className="text-dim">Activado para nuevos usuarios</small>
                                    </div>
                                    <Form.Check type="switch" id="template-1" defaultChecked className="custom-switch" />
                                </div>
                                <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity hover-bg-light transition-all cursor-pointer">
                                    <div>
                                        <p className="text-main fw-bold mb-0">Reset de Contraseña</p>
                                        <small className="text-dim">Requerido por el sistema</small>
                                    </div>
                                    <Form.Check type="switch" id="template-2" defaultChecked className="custom-switch" disabled />
                                </div>
                                <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-surface border border-main-opacity hover-bg-light transition-all cursor-pointer">
                                    <div>
                                        <p className="text-main fw-bold mb-0">Convocatoria Asamblea</p>
                                        <small className="text-dim">Envío masivo pendiente</small>
                                    </div>
                                    <Form.Check type="switch" id="template-3" className="custom-switch" />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};
