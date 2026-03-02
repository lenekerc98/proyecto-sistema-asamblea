import React, { useState, useEffect } from 'react';
import { authService } from '../../services/auth.service';
import { KeyRound, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Form, Button, InputGroup, Alert } from 'react-bootstrap';

interface RecoveryFormProps {
    onSuccess: (message: string) => void;
}

export const RecoveryForm: React.FC<RecoveryFormProps> = ({ onSuccess }) => {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Pedir email, 2: Pedir token y nueva clave
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Limpiar campos al montar el componente
    useEffect(() => {
        const timer = setTimeout(() => {
            setEmail('');
            setToken('');
            setNewPassword('');
            setStep(1);
            setError(null);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.requestPasswordReset(email);
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al solicitar recuperación.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.confirmPasswordReset(token, newPassword);
            onSuccess('Contraseña actualizada con éxito. Redirigiendo...');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Token inválido o error al actualizar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="login-header text-center mb-4">
                <div className="logo-container d-inline-flex p-3 rounded-4 mb-3">
                    <KeyRound size={40} className="logo-icon text-primary" />
                </div>
                <h1 className="h3 fw-bold text-main mb-2">Recuperar Acceso</h1>
                <p className="text-muted small">
                    {step === 1
                        ? 'Ingresa tu correo para recibir un código'
                        : 'Ingresa el código de 6 dígitos enviado a tu correo'}
                </p>
            </div>

            {error && (
                <Alert variant="danger" className="d-flex align-items-center gap-2 border-0 rounded-3 mb-4 py-2">
                    <AlertCircle size={18} />
                    <span className="small">{error}</span>
                </Alert>
            )}

            {step === 1 ? (
                <Form onSubmit={handleRequest} className="login-form">
                    <Form.Group className="mb-4" controlId="email">
                        <Form.Label className="text-muted small fw-medium mb-2">Correo Electrónico</Form.Label>
                        <InputGroup className="custom-input-group">
                            <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                <Mail size={18} />
                            </InputGroup.Text>
                            <Form.Control
                                type="email"
                                placeholder="ejemplo@correo.com"
                                className="bg-transparent text-main border-start-0 ps-1 py-2"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="off"
                            />
                        </InputGroup>
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-bold text-uppercase login-btn-gradient"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Código'}
                    </Button>
                </Form>
            ) : (
                <Form onSubmit={handleConfirm} className="login-form">
                    <Form.Group className="mb-3" controlId="token">
                        <Form.Label className="text-muted small fw-medium mb-2">Código de Verificación</Form.Label>
                        <InputGroup className="custom-input-group">
                            <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                <KeyRound size={18} />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="123456"
                                className="bg-transparent text-main border-start-0 ps-1 py-2"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="newPassword">
                        <Form.Label className="text-muted small fw-medium mb-2">Nueva Contraseña</Form.Label>
                        <InputGroup className="custom-input-group">
                            <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                                <Lock size={18} />
                            </InputGroup.Text>
                            <Form.Control
                                type="password"
                                placeholder="••••••••"
                                className="bg-transparent text-main border-start-0 ps-1 py-2"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </InputGroup>
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-bold text-uppercase login-btn-gradient"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Cambiar Contraseña'}
                    </Button>

                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-link text-primary small p-0 text-decoration-none"
                            onClick={() => setStep(1)}
                        >
                            Reenviar código
                        </button>
                    </div>
                </Form>
            )}
        </>
    );
};
