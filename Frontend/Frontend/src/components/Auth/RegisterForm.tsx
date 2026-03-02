import React, { useState, useEffect } from 'react';
import { authService } from '../../services/auth.service';
import { Mail, Lock, User, IdCard, AlertCircle, Loader2 } from 'lucide-react';
import { Row, Col, Form, Button, InputGroup, Alert } from 'react-bootstrap';

interface RegisterFormProps {
    onSuccess: (enviarCorreo: boolean) => void;
    showEmailCheckbox?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, showEmailCheckbox = false }) => {
    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        email: '',
        cedula: '',
        password: '',
        enviar_correo: false,
        rol_id: 2 // Por defecto Rol Usuario
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Limpiar campos al montar el componente
    useEffect(() => {
        const timer = setTimeout(() => {
            setFormData({
                nombres: '',
                apellidos: '',
                email: '',
                cedula: '',
                password: '',
                enviar_correo: false,
                rol_id: 2
            });
            setError(null);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (e: React.ChangeEvent<any>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.register(formData);
            onSuccess(formData.enviar_correo);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al registrarse. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form onSubmit={handleSubmit} className="login-form">
            {error && (
                <Alert variant="danger" className="d-flex align-items-center gap-2 border-0 rounded-3 mb-4 py-2">
                    <AlertCircle size={18} />
                    <span className="small">{error}</span>
                </Alert>
            )}

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3" controlId="nombres">
                        <Form.Label className="text-muted small fw-medium mb-2">Nombres</Form.Label>
                        <InputGroup className="custom-input-group">
                            <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                <User size={18} />
                            </InputGroup.Text>
                            <Form.Control
                                name="nombres"
                                placeholder="Juan"
                                className="bg-transparent text-main border-start-0 ps-1 py-2"
                                value={formData.nombres}
                                onChange={handleChange}
                                required
                            />
                        </InputGroup>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3" controlId="apellidos">
                        <Form.Label className="text-muted small fw-medium mb-2">Apellidos</Form.Label>
                        <InputGroup className="custom-input-group">
                            <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                <User size={18} />
                            </InputGroup.Text>
                            <Form.Control
                                name="apellidos"
                                placeholder="Pérez"
                                className="bg-transparent text-main border-start-0 ps-1 py-2"
                                value={formData.apellidos}
                                onChange={handleChange}
                                required
                            />
                        </InputGroup>
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3" controlId="cedula">
                <Form.Label className="text-muted small fw-medium mb-2">Cédula / Identificación</Form.Label>
                <InputGroup className="custom-input-group">
                    <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                        <IdCard size={18} />
                    </InputGroup.Text>
                    <Form.Control
                        name="cedula"
                        placeholder="1234567890"
                        className="bg-transparent text-main border-start-0 ps-1 py-2"
                        value={formData.cedula}
                        onChange={handleChange}
                    />
                </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
                <Form.Label className="text-muted small fw-medium mb-2">Correo Electrónico</Form.Label>
                <InputGroup className="custom-input-group">
                    <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                        <Mail size={18} />
                    </InputGroup.Text>
                    <Form.Control
                        name="email"
                        type="email"
                        placeholder="ejemplo@correo.com"
                        className="bg-transparent text-main border-start-0 ps-1 py-2"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="off"
                    />
                </InputGroup>
            </Form.Group>

            {showEmailCheckbox && (
                <Form.Group className="mb-4" controlId="enviar_correo">
                    <Form.Check
                        type="checkbox"
                        name="enviar_correo"
                        label={<span className="text-main small">Enviar enlace para crear contraseña por correo</span>}
                        checked={formData.enviar_correo}
                        onChange={handleChange}
                        className="custom-switch"
                    />
                </Form.Group>
            )}

            {!formData.enviar_correo && (
                <Form.Group className="mb-4" controlId="password">
                    <Form.Label className="text-muted small fw-medium mb-2">Contraseña</Form.Label>
                    <InputGroup className="custom-input-group">
                        <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                            <Lock size={18} />
                        </InputGroup.Text>
                        <Form.Control
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-transparent text-main border-start-0 ps-1 py-2"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                        />
                    </InputGroup>
                </Form.Group>
            )}

            <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 fw-bold text-uppercase login-btn-gradient"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin me-2" size={20} />
                        <span>Registrando...</span>
                    </>
                ) : (
                    <span>Crear Cuenta</span>
                )}
            </Button>
        </Form >
    );
};
