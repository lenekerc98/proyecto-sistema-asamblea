import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Form, Button, InputGroup, Alert } from 'react-bootstrap';

interface CreatePasswordFormProps {
    onSubmit: (password: string) => Promise<void>;
    isLoading?: boolean;
    successMessage?: string;
}

export const CreatePasswordForm: React.FC<CreatePasswordFormProps> = ({
    onSubmit,
    isLoading = false,
    successMessage
}) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        try {
            await onSubmit(password);
            // Opcional: limpiar los campos si fue exitoso
            // setPassword('');
            // setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Error al guardar la contraseña. Inténtalo de nuevo.');
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

            {successMessage && (
                <Alert variant="success" className="d-flex align-items-center gap-2 border-0 rounded-3 mb-4 py-2 bg-success-subtle text-success">
                    <CheckCircle2 size={18} />
                    <span className="small">{successMessage}</span>
                </Alert>
            )}

            <Form.Group className="mb-3" controlId="new-password">
                <Form.Label className="text-muted small fw-medium mb-2">Nueva Contraseña</Form.Label>
                <InputGroup className="custom-input-group">
                    <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                        <Lock size={18} />
                    </InputGroup.Text>
                    <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-transparent text-main border-start-0 border-end-0 ps-1 py-2 shadow-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputGroup.Text
                        className="bg-transparent border-start-0 text-muted pe-3 cursor-pointer p-0"
                        style={{ cursor: 'pointer' }}
                    >
                        <Button
                            variant="link"
                            className="text-muted text-decoration-none p-2 d-flex align-items-center"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                    </InputGroup.Text>
                </InputGroup>
            </Form.Group>

            <Form.Group className="mb-4" controlId="confirm-password">
                <Form.Label className="text-muted small fw-medium mb-2">Confirmar Contraseña</Form.Label>
                <InputGroup className="custom-input-group">
                    <InputGroup.Text className="bg-transparent border-end-0 text-muted ps-3">
                        <Lock size={18} />
                    </InputGroup.Text>
                    <Form.Control
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-transparent text-main border-start-0 border-end-0 ps-1 py-2 shadow-none"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputGroup.Text
                        className="bg-transparent border-start-0 text-muted pe-3 cursor-pointer p-0"
                        style={{ cursor: 'pointer' }}
                    >
                        <Button
                            variant="link"
                            className="text-muted text-decoration-none p-2 d-flex align-items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                    </InputGroup.Text>
                </InputGroup>
            </Form.Group>

            <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 fw-bold text-uppercase login-btn-gradient mt-2"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin me-2" size={20} />
                        <span>Guardando...</span>
                    </>
                ) : (
                    <span>Guardar Contraseña</span>
                )}
            </Button>
        </Form>
    );
};
