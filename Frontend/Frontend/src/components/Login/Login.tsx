import React, { useState } from 'react';
import { authService } from '../../services/auth.service';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Container, Row, Col, Card, Form, Button, InputGroup, Alert } from 'react-bootstrap';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.login(email, password);
            window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="login-full-screen d-flex align-items-center justify-content-center p-0">
            <Row className="w-100 m-0 justify-content-center">
                <Col xs={11} sm={8} md={6} lg={4} xl={3}>
                    <Card className="login-glass-card border-0 shadow-lg">
                        <Card.Body className="p-4 p-md-5">
                            <div className="login-header text-center mb-4">
                                <div className="logo-container d-inline-flex p-3 rounded-4 mb-3">
                                    <LogIn size={40} className="logo-icon text-primary" />
                                </div>
                                <h1 className="h3 fw-bold text-white mb-2">Asamblea 2026</h1>
                                <p className="text-muted small">Bienvenido de nuevo, por favor ingresa tus credenciales</p>
                            </div>

                            <Form onSubmit={handleSubmit} className="login-form">
                                {error && (
                                    <Alert variant="danger" className="d-flex align-items-center gap-2 border-0 rounded-3 mb-4 py-2">
                                        <AlertCircle size={18} />
                                        <span className="small">{error}</span>
                                    </Alert>
                                )}

                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label className="text-muted small fw-medium mb-2">Correo Electrónico</Form.Label>
                                    <InputGroup className="custom-input-group">
                                        <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                            <Mail size={18} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="ejemplo@correo.com"
                                            className="bg-transparent text-white border-start-0 ps-1 py-2"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="password">
                                    <Form.Label className="text-muted small fw-medium mb-2">Contraseña</Form.Label>
                                    <InputGroup className="custom-input-group">
                                        <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                            <Lock size={18} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="bg-transparent text-white border-start-0 border-end-0 ps-1 py-2"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            className="bg-transparent border-start-0 text-muted pe-3 btn-password-toggle py-0 d-flex align-items-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-2 fw-bold text-uppercase login-btn-gradient"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin me-2" size={20} />
                                            <span>Iniciando...</span>
                                        </>
                                    ) : (
                                        <span>Entrar</span>
                                    )}
                                </Button>
                            </Form>

                            <div className="login-footer text-center mt-4">
                                <p className="text-muted extra-small mb-0">© {import.meta.env.VITE_APP_YEAR || new Date().getFullYear()} {import.meta.env.VITE_APP_CREDITS || 'Autor'} - Todos los derechos reservados</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};
