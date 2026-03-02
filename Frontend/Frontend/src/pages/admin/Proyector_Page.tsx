import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Row, Col, Spinner } from 'react-bootstrap';
import { Vote, MonitorPlay, Users } from 'lucide-react';
import { votacionesService } from '../../services/votaciones.service';
import { configService } from '../../services/config.service';
import type { Pregunta, ResultadoVotacion } from '../../services/votaciones.service';
import '../../styles/Glassmorphism.css';

import { listarAccionistas } from '../../services/accionistas.service';

const AnimatedNumber: React.FC<{ value: number; decimals?: number; suffix?: string }> = ({ value, decimals = 2, suffix = "%" }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeProgress;
            setDisplayValue(current);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue.toFixed(decimals)}{suffix}</span>;
};

// Función auxiliar para normalizar textos y comparar votos (elimina acentos y espacios)
const normalize = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s/g, '');

export const Proyector_Page: React.FC = () => {
    const [preguntaActiva, setPreguntaActiva] = useState<Pregunta | null>(null);
    const [resultados, setResultados] = useState<ResultadoVotacion | null>(null);
    const [vistaActual, setVistaActual] = useState<string>('espera');
    const [quorumActual, setQuorumActual] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Referencias para efectos visuales sin disparar re-renders circulares
    const lastQuorumRef = useRef(0);
    const lastVotosCountRef = useRef(0);
    const [showFlashQuorum, setShowFlashQuorum] = useState(false);
    const [showFlashVotos, setShowFlashVotos] = useState(false);

    // Vínculo para que los accionistas voten
    const votacionUrl = `${window.location.origin}/votar`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(votacionUrl)}&format=svg`;

    const fetchDatos = async () => {
        try {
            const config = await configService.getAsambleaConfig();
            const v = config.vista_proyector || 'espera';
            setVistaActual(v);

            // 1. Quórum
            let realTimeQuorum = 0;
            if (config.asamblea_iniciada && config.quorum_final_calculado) {
                realTimeQuorum = config.quorum_final_calculado;
            } else {
                const dataAcc = await listarAccionistas('');
                realTimeQuorum = dataAcc
                    .filter(a => a.asistencias && a.asistencias.length > 0)
                    .reduce((acc, curr) => acc + (curr.porcentaje_base || 0), 0);
            }

            if (realTimeQuorum > lastQuorumRef.current && lastQuorumRef.current > 0) {
                setShowFlashQuorum(true);
                setTimeout(() => setShowFlashQuorum(false), 1500);
            }
            lastQuorumRef.current = realTimeQuorum;
            setQuorumActual(realTimeQuorum);

            // 2. Votación
            if (v === 'pregunta_activa') {
                const preguntas = await votacionesService.listarPreguntas();
                const activa = preguntas.find((p: Pregunta) => p.estado === 'activa');

                if (activa) {
                    setPreguntaActiva(activa);
                    const res = await votacionesService.obtenerResultados(activa.id);

                    if (res.total_participantes > lastVotosCountRef.current) {
                        setShowFlashVotos(true);
                        setTimeout(() => setShowFlashVotos(false), 1000);
                        lastVotosCountRef.current = res.total_participantes;
                    }
                    setResultados(res);
                } else {
                    setPreguntaActiva(null);
                    setResultados(null);
                    lastVotosCountRef.current = 0;
                }
            }
        } catch (error) {
            console.error("Error en polling de proyector:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        fetchDatos();
        const interval = setInterval(fetchDatos, 3000); // Polling cada 3 seg
        return () => {
            clearInterval(interval);
            document.body.style.overflow = 'auto';
        };
    }, []);

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-black">
                <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} />
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex flex-column bg-black text-white" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a8a 0%, #000000 80%)',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Cabecera Proyector */}
            <div className="p-4 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-10 bg-black bg-opacity-50 shadow-lg">
                <div className="d-flex align-items-center gap-3">
                    <Vote size={36} className="text-primary" />
                    <h1 className="h3 mb-0 fw-bold letter-spacing-wide">ASAMBLEA GENERAL LANDUNI S.A.</h1>
                </div>

                <div className="d-flex align-items-center gap-4">
                    {/* QUORUM SIEMPRE VISIBLE EN HEADER SI ESTAMOS EN VOTACIÓN */}
                    {vistaActual === 'pregunta_activa' && (
                        <div className={`px-4 py-2 rounded-3 border border-white border-opacity-10 bg-white bg-opacity-5 transition-all ${showFlashQuorum ? 'bg-info bg-opacity-20 scale-105' : ''}`}>
                            <span className="text-white-50 small text-uppercase fw-bold me-3">Quórum:</span>
                            <span className="fs-4 fw-bold text-info"><AnimatedNumber value={quorumActual} /></span>
                        </div>
                    )}

                    {preguntaActiva && (
                        <div className="badge bg-danger px-4 py-2 fs-5 rounded-pill animated-pulse d-flex align-items-center gap-2">
                            <span className="dot bg-white rounded-circle d-inline-block" style={{ width: '10px', height: '10px' }}></span>
                            VOTACIÓN EN CURSO
                        </div>
                    )}
                </div>
            </div>

            {/* Contenido Principal */}
            <Container fluid className="flex-grow-1 d-flex flex-column justify-content-center p-5">
                {vistaActual === 'espera' && (
                    <div className="text-center animate-in fade-in zoom-in duration-700">
                        <div className="mx-auto mb-5 p-5 rounded-circle bg-primary bg-opacity-5 border border-primary border-opacity-10 d-inline-flex align-items-center justify-content-center shadow-lg" style={{ width: '160px', height: '160px' }}>
                            <MonitorPlay size={80} className="text-primary opacity-50 mx-auto" style={{ display: 'block' }} />
                        </div>
                        <h2 className="display-3 fw-bold text-white mb-3 text-uppercase letter-spacing-wider">Sesión en Pausa</h2>
                        <div className="p-3 px-5 d-inline-block rounded-pill bg-white bg-opacity-5 border border-white border-opacity-10 shadow-inner">
                            <p className="fs-3 text-info fw-bold mb-0">Por favor, espere a que se active la siguiente votación...</p>
                        </div>
                        <p className="fs-5 text-white-50 mt-4 opacity-75">La asamblea continuará en breve.</p>
                    </div>
                )}

                {vistaActual === 'quorum' && (
                    <Row className="g-5 align-items-center h-100">
                        <Col lg={7} className="d-flex flex-column justify-content-center text-center">
                            <Users size={100} className="mb-4 text-info mx-auto" style={{ display: 'block' }} />
                            <h2 className="display-4 fw-bold text-white mb-3 text-uppercase">Registro de Asistencia</h2>
                            <p className="fs-3 text-white-50 mb-5">Por favor, acérquese a la mesa de registro para marcar su entrada.</p>

                            <Card className="border-white border-opacity-10 rounded-4 mt-4 d-inline-block mx-auto p-5 shadow-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
                                <h4 className="text-info text-uppercase letter-spacing-wide fs-4 mb-3 fw-bold">
                                    Quórum Actual Formado
                                </h4>
                                <div className={`display-1 fw-bold transition-all ${showFlashQuorum ? 'text-info scale-110' : 'text-white'}`}
                                    style={{
                                        textShadow: showFlashQuorum ? '0 0 50px rgba(0, 200, 255, 1)' : 'none',
                                        transition: 'all 0.5s ease'
                                    }}>
                                    <AnimatedNumber value={quorumActual} />
                                </div>
                            </Card>
                        </Col>
                        {/* Panel Derecho: Código QR y Enlace */}
                        <Col lg={5} className="text-center d-flex flex-column align-items-center justify-content-center border-start border-white border-opacity-10 py-5">
                            <h4 className="text-white fs-2 fw-bold mb-2">Escanea para Entrar</h4>
                            <p className="text-white-50 fs-5 mb-5">Ingresa tu número de documento en la App.</p>
                            <div className="bg-white p-4 rounded-4 shadow-lg mb-5 d-inline-block">
                                <img src={qrImageUrl} alt="QR" style={{ width: '350px', height: '350px' }} />
                            </div>
                            <div className="w-100 px-5">
                                <p className="text-white-50 mb-2">O ingresa manualmente a:</p>
                                <div className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-pill py-3 px-4 w-100 text-center">
                                    <span className="fs-3 fw-bold text-info letter-spacing-wide font-monospace">
                                        {votacionUrl.replace(/(^\w+:|^)\/\//, '')}
                                    </span>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {vistaActual === 'pregunta_activa' && !preguntaActiva && (
                    <div className="text-center text-white-50">
                        <MonitorPlay size={80} className="mb-4 opacity-50 mx-auto" style={{ display: 'block' }} />
                        <h2 className="display-4 fw-bold text-white mb-3">En Espera de Votación</h2>
                        <p className="fs-4">El administrador aún no ha abierto ninguna pregunta.</p>
                    </div>
                )}

                {vistaActual === 'pregunta_activa' && preguntaActiva && (
                    <Row className="g-5 align-items-center h-100">
                        <Col lg={7} className="d-flex flex-column justify-content-center">
                            <h2 className="text-primary text-uppercase letter-spacing-wide fw-bold mb-3 fs-4">Pregunta en Curso</h2>
                            <h3 className="display-4 fw-bold lh-sm mb-5 text-white">{preguntaActiva.enunciado}</h3>

                            <Card className="border-white border-opacity-10 rounded-4 mt-2 shadow-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
                                <Card.Body className="p-5">
                                    <h4 className={`text-uppercase letter-spacing-wide fs-5 mb-4 d-flex align-items-center gap-2 transition-all ${showFlashVotos ? 'text-info scale-105 fw-bold' : 'text-white-50'}`}>
                                        <Users size={24} />
                                        Escrutinio Parcial ({resultados?.total_participantes || 0} votos procesados)
                                    </h4>

                                    <div className="d-flex flex-column gap-4">
                                        {preguntaActiva.opciones.map((opcion, index) => {
                                            const normalizedText = normalize(opcion.texto);
                                            const resMatch = resultados?.resultados?.find(r => normalize(r.opcion) === normalizedText);
                                            const porcentaje = resMatch ? resMatch.porcentaje_total : 0;

                                            let colorClass = 'primary';
                                            if (['si', 'afavor'].includes(normalizedText)) colorClass = 'success';
                                            else if (['no', 'encontra'].includes(normalizedText)) colorClass = 'danger';
                                            else if (['abstencion'].includes(normalizedText)) colorClass = 'info';
                                            else if (['nulo', 'blanco'].includes(normalizedText)) colorClass = 'secondary';
                                            else {
                                                const colors = ['primary', 'warning', 'info', 'success', 'danger'];
                                                colorClass = colors[index % colors.length];
                                            }

                                            return (
                                                <div key={opcion.id}>
                                                    <div className="d-flex justify-content-between align-items-end mb-2">
                                                        <span className="fs-3 fw-bold text-white text-uppercase">{opcion.texto}</span>
                                                        <span className={`fs-2 fw-bold text-${colorClass}`}>
                                                            <AnimatedNumber value={porcentaje} />
                                                        </span>
                                                    </div>
                                                    <div className="progress bg-black bg-opacity-50" style={{ height: '26px', borderRadius: '13px', overflow: 'hidden' }}>
                                                        <div
                                                            className={`progress-bar bg-${colorClass} progress-bar-striped progress-bar-animated`}
                                                            style={{
                                                                width: `${porcentaje}%`,
                                                                transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                                boxShadow: showFlashVotos ? `0 0 20px var(--bs-${colorClass})` : 'none'
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={5} className="text-center d-flex flex-column align-items-center justify-content-center border-start border-white border-opacity-10 py-5">
                            <h4 className="text-white fs-2 fw-bold mb-2">Escanea para Votar</h4>
                            <p className="text-white-50 fs-5 mb-5">Ingresa tu número de documento en la App.</p>
                            <div className="bg-white p-4 rounded-4 shadow-lg mb-5 d-inline-block">
                                <img src={qrImageUrl} alt="QR" style={{ width: '380px', height: '380px' }} />
                            </div>
                            <div className="w-100 px-5">
                                <p className="text-white-50 mb-2">Acceso manual:</p>
                                <div className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-pill py-3 px-4 w-100 text-center">
                                    <span className="fs-3 fw-bold text-info letter-spacing-wide">
                                        {votacionUrl.replace(/(^\w+:|^)\/\//, '')}
                                    </span>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}
            </Container>
        </div>
    );
};
