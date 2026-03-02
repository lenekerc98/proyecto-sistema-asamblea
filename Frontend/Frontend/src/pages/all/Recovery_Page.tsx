import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Container, Card, Alert } from 'react-bootstrap';
import { RecoveryForm } from '../../components/Auth/RecoveryForm';

export const RecoveryPage: React.FC = () => {
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => navigate('/login'), 3000);
    };

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

                            <div className="text-start mb-4 position-relative z-1">
                                <Link to="/login" className="text-muted d-inline-flex align-items-center gap-1 text-decoration-none hover-underline small">
                                    <ArrowLeft size={16} /> Volver al Login
                                </Link>
                            </div>

                            {successMsg ? (
                                <div className="position-relative z-1">
                                    <Alert variant="success" className="d-flex align-items-center gap-2 border-0 rounded-3 mb-4 py-2">
                                        <CheckCircle size={18} />
                                        <span className="small">{successMsg}</span>
                                    </Alert>
                                    <p className="text-center text-muted small mt-3">Serás redirigido al login en breve.</p>
                                </div>
                            ) : (
                                <div className="position-relative z-1">
                                    <RecoveryForm onSuccess={handleSuccess} />
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            </Container>
        </div>
    );
};
