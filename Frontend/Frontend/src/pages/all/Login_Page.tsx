import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Container, Card } from 'react-bootstrap';
import { LoginForm } from '../../components/Auth/LoginForm';
import { configService } from '../../services/config.service';

interface LoginPageProps {
    onLogin: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [registroHabilitado, setRegistroHabilitado] = useState(true);

    useEffect(() => {
        configService.getPublicConfig()
            .then(data => setRegistroHabilitado(data.permitir_registro_publico))
            .catch(err => console.error("Error obteniendo config pública:", err));
    }, []);

    return (
        <div className="login-page d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden">
            {/* Elementos de fondo decorativos */}
            <div className="position-absolute login-bg-blob bg-primary opacity-25" style={{ top: '-10%', left: '-5%', width: '40vw', height: '40vw', filter: 'blur(100px)' }}></div>
            <div className="position-absolute login-bg-blob bg-info opacity-20" style={{ bottom: '-10%', right: '-5%', width: '35vw', height: '35vw', filter: 'blur(100px)' }}></div>

            <Container className="d-flex justify-content-center position-relative z-1" style={{ position: 'relative', zIndex: 10 }}>
                <div className="w-100" style={{ maxWidth: '450px' }}>
                    <Card className="bg-glass border-glass shadow-lg rounded-4 login-card">
                        <Card.Body className="p-4 p-md-5 relative overflow-hidden">
                            {/* Efecto de brillo de la tarjeta */}
                            <div className="card-shine-effect"></div>

                            <div className="login-header text-center mb-4 position-relative z-1">
                                <div className="logo-container d-inline-flex p-3 rounded-4 mb-3">
                                    <LogIn size={40} className="logo-icon text-primary" />
                                </div>
                                <h1 className="h3 fw-bold text-main mb-2">Asamblea 2026</h1>
                                <p className="text-muted small">Bienvenido de nuevo, ingresa tus credenciales</p>
                            </div>

                            <div className="position-relative z-1">
                                <LoginForm onLogin={onLogin} />
                            </div>

                            {registroHabilitado && (
                                <div className="text-center mt-4 position-relative z-1">
                                    <p className="text-muted small mb-0">
                                        ¿No tienes una cuenta? {' '}
                                        <Link to="/register" className="text-primary fw-bold text-decoration-none">
                                            Regístrate aquí
                                        </Link>
                                    </p>
                                </div>
                            )}

                            <div className="login-footer text-center mt-4">
                                <p className="text-muted extra-small mb-0">© {import.meta.env.VITE_APP_YEAR || new Date().getFullYear()} {import.meta.env.VITE_APP_CREDITS || 'Autor'} - Todos los derechos reservados</p>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </Container>
        </div>
    );
};
