import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Spinner } from 'react-bootstrap';
import { Search, UserCheck, Vote, CheckCircle2, LogOut, ChevronRight, Hash } from 'lucide-react';
import { accionistaVotoService } from '../../services/voto_accionista.service';
import type { PreguntaVotacion } from '../../services/voto_accionista.service';
import Swal from 'sweetalert2';
import '../../styles/Glassmorphism.css';

export const Votacion_App_Page: React.FC = () => {
    const [numDoc, setNumDoc] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accionistaInfo, setAccionistaInfo] = useState<{ nombre: string; numero: number } | null>(null);

    const [preguntaActiva, setPreguntaActiva] = useState<PreguntaVotacion | null>(null);
    const [cargandoPregunta, setCargandoPregunta] = useState(false);
    const [enviandoVoto, setEnviandoVoto] = useState(false);

    // Revisar sesión al cargar
    useEffect(() => {
        // SEGURIDAD: Si hay una sesión de administrador o usuario interno activa, la cerramos
        // para asegurar que el portal de votación sea independiente y limpio.
        if (localStorage.getItem('user') || sessionStorage.getItem('user')) {
            console.warn('Sesión administrativa detectada en portal de votación. Limpiando para seguridad...');
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
        }

        const token = localStorage.getItem('accionista_token');
        if (token) {
            const info = accionistaVotoService.getCurrentAccionista();
            if (info) {
                setAccionistaInfo(info);
                setIsAuthenticated(true);
                fetchPreguntaActiva();
            } else {
                handleLogout();
            }
        }
    }, []);

    // Polling cada 5 segundos para actualizar la pregunta automáticamente
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isAuthenticated) {
            interval = setInterval(() => {
                fetchPreguntaActiva(true); // Silencioso
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const fetchPreguntaActiva = async (silencioso = false) => {
        if (!silencioso) setCargandoPregunta(true);
        try {
            const data = await accionistaVotoService.getPreguntaActiva();
            setPreguntaActiva(data);
        } catch (error) {
            console.error(error);
            if (!silencioso) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de conexión',
                    text: 'No se pudo conectar con el servidor de votaciones.',
                    background: '#1e293b', color: '#fff'
                });
            }
        } finally {
            if (!silencioso) setCargandoPregunta(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!numDoc.trim()) return;

        setLoading(true);
        try {
            const res = await accionistaVotoService.login(numDoc.trim());
            setAccionistaInfo({ nombre: res.nombre_titular, numero: res.numero_accionista });
            setIsAuthenticated(true);
            await fetchPreguntaActiva();
            Swal.fire({
                icon: 'success',
                title: `Bienvenido, ${res.nombre_titular}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#1e293b', color: '#fff'
            });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: error.response?.data?.detail || 'Documento no válido o sin registro de asistencia.',
                background: '#1e293b', color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        accionistaVotoService.logout();
        setIsAuthenticated(false);
        setAccionistaInfo(null);
        setPreguntaActiva(null);
        setNumDoc('');
    };

    const handleVotar = async (_opcionId: number, opcionTexto: string) => {
        if (!preguntaActiva?.pregunta || !accionistaInfo) return;

        const confirm = await Swal.fire({
            title: `¿Votar: "${opcionTexto}"?`,
            text: "El voto es definitivo y no se puede cambiar.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, enviar voto',
            cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#fff',
            reverseButtons: true
        });

        if (!confirm.isConfirmed) return;

        setEnviandoVoto(true);
        try {
            await accionistaVotoService.emitirVoto(
                preguntaActiva.pregunta.id,
                opcionTexto,
                accionistaInfo.numero
            );
            Swal.fire({
                icon: 'success',
                title: 'Voto Registrado',
                text: 'Su voto ha sido contabilizado exitosamente.',
                background: '#1e293b', color: '#fff',
                timer: 3000,
                showConfirmButton: false
            });
            // Recargar para mostrar estado "ya_voto"
            await fetchPreguntaActiva(true);
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || 'No se pudo registrar su voto.',
                background: '#1e293b', color: '#fff'
            });
        } finally {
            setEnviandoVoto(false);
        }
    };

    // ---------------- UI: PANTALLA DE LOGIN ----------------
    if (!isAuthenticated) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark py-4" style={{
                backgroundImage: 'radial-gradient(circle at 50% 0%, #1e3a8a 0%, #0f172a 60%)'
            }}>
                <Container className="px-3" style={{ maxWidth: '400px' }}>
                    <div className="text-center mb-5">
                        <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
                            <Vote size={48} />
                        </div>
                        <h1 className="h3 text-white fw-bold mb-2">Portal de Votación</h1>
                        <p className="text-white-50 small mb-0">Ingrese su documento para continuar.</p>
                    </div>

                    <Card className="bg-glass border-glass shadow-lg rounded-4 overflow-hidden">
                        <Card.Body className="p-4 p-md-5">
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="text-white-50 small text-uppercase fw-bold letter-spacing-wide mb-3 text-center d-block">
                                        Número de Identificación
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Ej. 0956377444"
                                        className="py-3 fs-2 text-center fw-bold shadow-sm"
                                        value={numDoc}
                                        onChange={(e) => setNumDoc(e.target.value)}
                                        required
                                        autoFocus
                                        style={{
                                            borderRadius: '15px',
                                            backgroundColor: '#ffffff',
                                            color: '#0f172a',
                                            border: 'none',
                                            letterSpacing: '2px'
                                        }}
                                    />
                                    <Form.Text className="text-white-50 small mt-3 text-center d-block">
                                        Digite el documento con el que registró su asistencia hoy.
                                    </Form.Text>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-3 fw-bold rounded-3 shadow-lg hover-scale d-flex align-items-center justify-content-center gap-2"
                                    disabled={loading || !numDoc.trim()}
                                >
                                    {loading ? <Spinner animation="border" size="sm" /> : (
                                        <>Entrar a Votar <ChevronRight size={20} /></>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                    <div className="text-center mt-5">
                        <p className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
                            &copy; {import.meta.env.VITE_APP_YEAR || '2026'} {import.meta.env.VITE_APP_CREDITS}<br />
                            Sistema de Votación Electrónica
                        </p>
                    </div>
                </Container>
            </div>
        );
    }

    // ---------------- UI: PANTALLA PRINCIPAL VOTACIÓN ----------------
    return (
        <div className="min-vh-100 d-flex flex-column bg-dark" style={{
            backgroundImage: 'radial-gradient(circle at 50% -20%, #1e3a8a 0%, #0f172a 80%)'
        }}>
            {/* Header Móvil */}
            <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-10 bg-black bg-opacity-25" style={{ backdropFilter: 'blur(10px)' }}>
                <div className="d-flex align-items-center gap-2">
                    <Vote size={24} className="text-primary" />
                    <span className="text-white fw-bold small">LANDUNI S.A.</span>
                </div>
                <Button variant="link" onClick={handleLogout} className="text-white-50 p-0 text-decoration-none d-flex align-items-center gap-2 small">
                    <span className="d-none d-sm-inline">Salir</span> <LogOut size={18} />
                </Button>
            </div>

            <Container className="flex-grow-1 d-flex flex-column py-4 px-3" style={{ maxWidth: '600px' }}>

                {/* Info Accionista */}
                <div className="mb-4 text-center">
                    <div className="d-inline-flex align-items-center justify-content-center p-2 rounded-circle bg-white bg-opacity-10 mb-2">
                        <UserCheck size={20} className="text-info" />
                    </div>
                    <h2 className="text-white h5 mb-1 fw-bold">{accionistaInfo?.nombre}</h2>
                    <span className="badge bg-white bg-opacity-10 text-white-50 border border-white border-opacity-10">
                        Accionista #{accionistaInfo?.numero}
                    </span>
                </div>

                {/* Área de Votación */}
                {cargandoPregunta && !preguntaActiva ? (
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-white-50">
                        <Spinner animation="border" className="mb-3 text-primary" />
                        <p>Cargando sesión de votación...</p>
                    </div>
                ) : !preguntaActiva?.activa ? (
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <Card className="bg-glass border-glass w-100 py-5 rounded-4 shadow-lg border-opacity-10 text-white-50">
                            <Card.Body className="py-4">
                                <Search size={48} className="text-white-50 opacity-50 mb-4 mx-auto" style={{ display: 'block' }} />
                                <h3 className="h5 text-white mb-2">Asamblea en Espera</h3>
                                <p className="mb-0 text-white-50 px-3">
                                    {preguntaActiva?.mensaje || 'Aún no hay preguntas abiertas. La pregunta aparecerá automáticamente en su pantalla tan pronto inicie la votación.'}
                                </p>
                            </Card.Body>
                        </Card>
                    </div>
                ) : preguntaActiva.ya_voto ? (
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <Card className="bg-glass border-glass border-success border-opacity-25 w-100 py-5 rounded-4 shadow-lg">
                            <Card.Body className="py-4">
                                <div className="mx-auto mb-4 bg-success bg-opacity-10 text-success p-3 rounded-circle d-inline-flex" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <CheckCircle2 size={56} />
                                </div>
                                <h3 className="h4 text-white mb-2 fw-bold">Voto Registrado</h3>
                                <p className="mb-4 text-white-50 px-3">
                                    Su respuesta ha sido contabilizada para esta pregunta. Por favor, espere a la siguiente votación.
                                </p>
                                <div className="p-3 bg-black bg-opacity-25 rounded-3 border border-white border-opacity-5 text-start mx-auto" style={{ maxWidth: '80%' }}>
                                    <small className="text-white-50 text-uppercase letter-spacing-wide d-block mb-1" style={{ fontSize: '0.65rem' }}>Pregunta Procesada</small>
                                    <div className="text-white fw-medium small lh-sm">{preguntaActiva.pregunta?.enunciado}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                ) : (
                    <div className="flex-grow-1 d-flex flex-column">
                        <Card className="bg-glass border-glass border-primary border-opacity-25 w-100 rounded-4 shadow-lg mb-4 flex-grow-1 d-flex flex-column">
                            <div className="p-4 border-bottom border-white border-opacity-10 text-center bg-primary bg-opacity-5">
                                <div className="badge border border-primary text-primary bg-primary bg-opacity-10 px-3 py-2 text-uppercase mb-3 rounded-pill animated-pulse">
                                    <span className="dot bg-primary rounded-circle d-inline-block me-2" style={{ width: '8px', height: '8px' }}></span>
                                    Votación Abierta
                                </div>
                                <h3 className="text-white h4 fw-bold lh-base mx-2 mb-0">
                                    {preguntaActiva.pregunta?.enunciado}
                                </h3>
                            </div>
                            <Card.Body className="p-4 d-flex flex-column gap-3 justify-content-center flex-grow-1">
                                {preguntaActiva.pregunta?.opciones.map((opcion) => {
                                    // Coloreado dinámico para botones grandes
                                    const lowerOp = opcion.texto.toLowerCase();
                                    let btnVariant = 'outline-primary';
                                    let bgClass = 'primary';
                                    if (['si', 'a favor'].includes(lowerOp)) { btnVariant = 'outline-success'; bgClass = 'success'; }
                                    else if (['no', 'en contra'].includes(lowerOp)) { btnVariant = 'outline-danger'; bgClass = 'danger'; }
                                    else if (['abstencion', 'abstención'].includes(lowerOp)) { btnVariant = 'outline-info'; bgClass = 'info'; }
                                    else if (['nulo', 'blanco'].includes(lowerOp)) { btnVariant = 'outline-secondary'; bgClass = 'secondary'; }

                                    return (
                                        <Button
                                            key={opcion.id}
                                            variant={btnVariant}
                                            disabled={enviandoVoto}
                                            onClick={() => handleVotar(opcion.id, opcion.texto)}
                                            className={`w-100 py-4 fs-5 fw-bold rounded-4 option-button bg-opacity-10 bg-${bgClass} text-uppercase letter-spacing-wide shadow-none`}
                                            style={{
                                                borderWidth: '2px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            {opcion.texto}
                                        </Button>
                                    );
                                })}
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </Container>
        </div>
    );
};
