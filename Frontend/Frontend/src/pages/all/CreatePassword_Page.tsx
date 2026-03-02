import React, { useState, useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { CreatePasswordForm } from '../../components/Auth/CreatePasswordForm';
import { authService } from '../../services/auth.service';

const CreatePassword_Page: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        const urlEmail = searchParams.get('email');

        if (!urlToken) {
            setError('Enlace inválido o expirado. Falta el token de seguridad.');
        } else {
            setToken(urlToken);
            setEmail(urlEmail);
        }
    }, [searchParams]);

    const handleCreatePassword = async (password: string) => {
        if (!token) {
            setError('No hay token válido.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authService.confirmNewPassword(token, password);
            setSuccessMessage('¡Contraseña creada exitosamente! Redirigiendo al login...');

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Error al establecer la contraseña. El enlace pudo haber expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden">
            {/* Elementos de fondo decorativos */}
            <div className="position-absolute login-bg-blob bg-primary opacity-25" style={{ top: '-10%', left: '-5%', width: '40vw', height: '40vw', filter: 'blur(100px)' }}></div>
            <div className="position-absolute login-bg-blob bg-info opacity-20" style={{ bottom: '-10%', right: '-5%', width: '35vw', height: '35vw', filter: 'blur(100px)' }}></div>

            <Container className="d-flex justify-content-center position-relative z-1" style={{ position: 'relative', zIndex: 10 }}>
                <div className="w-100" style={{ maxWidth: '450px' }}>

                    <div className="text-center mb-4">
                        <div className="d-inline-flex justify-content-center align-items-center bg-glass border-glass rounded-circle p-3 mb-3 shadow-lg">
                            <UserCog size={40} className="text-primary" />
                        </div>
                        <h1 className="h3 fw-bold text-white mb-2">Crear Contraseña</h1>
                        <p className="text-muted small px-3">
                            {email
                                ? `Establece una contraseña segura para la cuenta asociada a ${email}.`
                                : "Por favor, establece tu nueva contraseña para acceder al sistema."}
                        </p>
                    </div>

                    <Card className="bg-glass border-glass shadow-lg rounded-4 login-card">
                        <Card.Body className="p-4 p-sm-5 relative overflow-hidden">
                            {/* Efecto de brillo de la tarjeta */}
                            <div className="card-shine-effect"></div>

                            {error ? (
                                <Alert variant="danger" className="border-0 rounded-3">
                                    {error}
                                </Alert>
                            ) : (
                                <CreatePasswordForm
                                    onSubmit={handleCreatePassword}
                                    isLoading={isLoading}
                                    successMessage={successMessage || undefined}
                                />
                            )}

                            <div className="text-center mt-4">
                                <p className="text-muted small mb-0">
                                    ¿Ya la actualizaste? {' '}
                                    <Link to="/login" className="text-primary fw-bold text-decoration-none">
                                        Inicia Sesión
                                    </Link>
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </Container>
        </div>
    );
};

export default CreatePassword_Page;
