import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import { Form, Button, InputGroup, Alert, Tooltip, OverlayTrigger } from 'react-bootstrap';

interface LoginFormProps {
    onLogin: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setEmail('');
            setPassword('');
            setError(null);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userData = await authService.login(email, password, rememberMe);
            onLogin(userData);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión. Inténtalo de nuevo.');
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
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
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-transparent text-main border-start-0 border-end-0 ps-1 py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <Button
                        type="button"
                        variant="outline-secondary"
                        className="bg-transparent border-start-0 text-muted pe-3 btn-password-toggle py-0 d-flex align-items-center"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                </InputGroup>
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <Form.Check
                        type="checkbox"
                        id="remember"
                        label={
                            <span className="d-flex align-items-center gap-2">
                                Mantener Sesión Iniciada
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id="tooltip-remember">
                                            Sesión iniciada por 8 horas
                                        </Tooltip>
                                    }
                                >
                                    <Info size={14} className="text-muted cursor-help" />
                                </OverlayTrigger>
                            </span>
                        }
                        className="text-muted small custom-checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <Link to="/recovery" className="text-primary small text-decoration-none hover-underline">
                        ¿Olvidó su contraseña?
                    </Link>
                </div>
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
    );
};