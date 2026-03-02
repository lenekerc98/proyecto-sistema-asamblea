import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Container, Card, Button } from 'react-bootstrap';
import { RegisterForm } from '../../components/Auth/RegisterForm';
import { configService } from '../../services/config.service';

export const RegisterPage: React.FC = () => {
    const [success, setSuccess] = useState(false);
    const [wasEmailSent, setWasEmailSent] = useState(false);
    const [registroHabilitado, setRegistroHabilitado] = useState<boolean | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        configService.getPublicConfig()
            .then(data => setRegistroHabilitado(data.permitir_registro_publico))
            .catch(err => {
                console.error("Error obteniendo config pública:", err);
                setRegistroHabilitado(false);
            });
    }, []);

    const handleSuccess = (enviarCorreo: boolean) => {
        setWasEmailSent(enviarCorreo);
        setSuccess(true);
        // Si no se envió correo, redirigir al login
        if (!enviarCorreo) {
            setTimeout(() => navigate('/login'), 3000);
        }
    };

    if (success) {
        return (
            <Container fluid className="login-full-screen d-flex align-items-center justify-content-center p-0">
                <Card className="login-glass-card border-0 shadow-lg p-5 text-center" style={{ maxWidth: '400px' }}>
                    <div className="logo-container d-inline-flex p-3 rounded-4 mb-3 mx-auto">
                        <UserPlus size={40} className="text-success" />
                    </div>
                    <h2 className="text-main mb-3">¡Registro Exitoso!</h2>

                    {wasEmailSent ? (
                        <>
                            <p className="text-muted">Tu cuenta ha sido creada. Se ha enviado un enlace a tu correo para establecer tu contraseña.</p>
                            <Button variant="outline-light" onClick={() => navigate('/login')} className="mt-3"> Ir al Login </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-muted">Tu cuenta ha sido creada. Serás redirigido al login en unos segundos...</p>
                            <Button variant="primary" onClick={() => navigate('/login')} className="mt-3 login-btn-gradient"> Ir al Login </Button>
                        </>
                    )}
                </Card>
            </Container>
        );
    }

    return (
        <div className="login-page d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden">
            {/* Elementos de fondo decorativos */}
            <div className="position-absolute login-bg-blob bg-primary opacity-25" style={{ top: '-10%', left: '-5%', width: '40vw', height: '40vw', filter: 'blur(100px)' }}></div>
            <div className="position-absolute login-bg-blob bg-info opacity-20" style={{ bottom: '-10%', right: '-5%', width: '35vw', height: '35vw', filter: 'blur(100px)' }}></div>

            <Container className="d-flex justify-content-center position-relative z-1 py-5" style={{ position: 'relative', zIndex: 10 }}>
                <div className="w-100" style={{ maxWidth: '450px' }}>
                    <Card className="bg-glass border-glass shadow-lg rounded-4 login-card">
                        <Card.Body className="p-4 p-md-5 relative overflow-hidden">
                            {/* Efecto de brillo de la tarjeta */}
                            <div className="card-shine-effect"></div>

                            <div className="login-header text-center mb-4 position-relative z-1">
                                <div className="logo-container d-inline-flex p-3 rounded-4 mb-3">
                                    <UserPlus size={40} className="logo-icon text-primary" />
                                </div>
                                <h1 className="h3 fw-bold text-main mb-2">Crear Cuenta</h1>
                                <p className="text-muted small">Únete a la Asamblea Landuni 2026</p>
                            </div>

                            {registroHabilitado === false ? (
                                <div className="text-center py-4 position-relative z-1">
                                    <div className="mb-4 text-warning">
                                        <UserPlus size={48} className="opacity-50 mx-auto" />
                                    </div>
                                    <h4 className="text-main mb-3">Registro Deshabilitado</h4>
                                    <p className="text-muted mb-4">
                                        El registro público de nuevas cuentas ha sido cerrado temporalmente por el Administrador. Si necesitas acceso, contacta a soporte.
                                    </p>
                                    <Button variant="primary" onClick={() => navigate('/login')} className="login-btn-gradient w-100 py-2">
                                        Volver al Login
                                    </Button>
                                </div>
                            ) : (
                                <div className="position-relative z-1">
                                    <RegisterForm onSuccess={handleSuccess} />
                                </div>
                            )}

                            <div className="text-center mt-4 position-relative z-1">
                                <p className="text-muted small mb-0">
                                    ¿Ya tienes una cuenta? {' '}
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
