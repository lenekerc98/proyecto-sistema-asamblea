import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import Swal from 'sweetalert2';
import {
    Container, Card, Table, Form,
    Row, Col, Badge, Spinner, Button
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
    Vote, HelpCircle,
    Users, BarChart3, Activity, Settings, Search,
    ChevronRight, ChevronDown, MonitorPlay, PauseCircle,
    SkipForward
} from 'lucide-react';
import { listarAccionistas } from '../../services/accionistas.service';
import { votacionesService, type Pregunta, type ResultadoVotacion, type VotoDetalle } from '../../services/votaciones.service';
import { configService } from '../../services/config.service';
import type { Accionista } from '../../services/accionistas.service';
import { useTheme } from '../../context/ThemeContext';

interface GrupoAsistente {
    identificacion: string;
    nombre: string;
    es_titular: boolean;
    lista_accionistas: Accionista[];
    total_acciones: number;
    porcentaje_total: number;
    votos_pendientes: number;
    votos_emitidos: number;
    opciones_voto: Set<string>;
}

const normalize = (text: string) =>
    text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s/g, '') : '';

export const VotacionesPage: React.FC = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingResultados, setLoadingResultados] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [selectedPregunta, setSelectedPregunta] = useState<Pregunta | null>(null);
    const [resultados, setResultados] = useState<ResultadoVotacion | null>(null);
    const [votosDetalle, setVotosDetalle] = useState<VotoDetalle[]>([]);
    const [vistaProyector, setVistaProyector] = useState<string>('espera');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const selectedPreguntaRef = useRef<Pregunta | null>(null);

    const cargarResultados = async (preguntaId: number) => {
        try {
            const res = await votacionesService.obtenerResultados(preguntaId);
            setResultados(res);
            try {
                const detalle = await votacionesService.obtenerDetalleVotos(preguntaId);
                setVotosDetalle(detalle.votos || []);
            } catch (errDetalle) {
                console.warn("No se pudo cargar el detalle de votos:", errDetalle);
            }
        } catch (error) {
            console.error('Error en polling de resultados:', error);
        }
    };

    const cargarDatosIniciales = async () => {
        setLoading(true);
        try {
            const dataAcc = await listarAccionistas('');
            setAccionistas(dataAcc.filter(a => a.asistencias && a.asistencias.length > 0));

            const dataPreg = await votacionesService.listarPreguntas();
            setPreguntas(dataPreg);
            if (dataPreg.length > 0) {
                const activa = dataPreg.find(p => p.estado === 'activa');
                const inicial = activa || dataPreg[0];
                setSelectedPregunta(inicial);
                selectedPreguntaRef.current = inicial;
                cargarResultados(inicial.id);
            }

            const config = await configService.getAsambleaConfig();
            if (config.vista_proyector) {
                setVistaProyector(config.vista_proyector);
            }
        } catch (error) {
            console.error('Error cargando iniciales:', error);
            // Si hay error de sesión, el interceptor ya redirigió, pero evitamos que el loading sea eterno
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatosIniciales();

        const interval = setInterval(() => {
            if (selectedPreguntaRef.current) {
                cargarResultados(selectedPreguntaRef.current.id);
            }
        }, 5000); // 5 segundos es más seguro para no saturar

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        selectedPreguntaRef.current = selectedPregunta;
        if (selectedPregunta) {
            setLoadingResultados(true);
            cargarResultados(selectedPregunta.id).finally(() => setLoadingResultados(false));
        }
    }, [selectedPregunta]);

    const handleSiguientePregunta = async () => {
        if (!selectedPregunta || preguntas.length === 0) return;

        const currentIndex = preguntas.findIndex(p => p.id === selectedPregunta.id);
        if (currentIndex < preguntas.length - 1) {
            const nextPreg = preguntas[currentIndex + 1];

            const confirm = await Swal.fire({
                title: '¿Desea seguir con la siguiente pregunta?',
                text: `Se activará la pregunta: "${nextPreg.enunciado}"`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, activar siguiente',
                cancelButtonText: 'Cancelar',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });

            if (!confirm.isConfirmed) return;

            try {
                // Actualizar estado de la siguiente pregunta a activa
                await votacionesService.actualizarPregunta(nextPreg.id, { estado: 'activa' });

                // Recargar lista de preguntas para tener estados actualizados
                const dataPreg = await votacionesService.listarPreguntas();
                setPreguntas(dataPreg);

                const updatedNext = dataPreg.find(p => p.id === nextPreg.id);
                if (updatedNext) setSelectedPregunta(updatedNext);

                // Cambiar vista del proyector automáticamente
                handleCambiarVista('pregunta_activa');

                Swal.fire({
                    icon: 'success',
                    title: 'Siguiente Pregunta Activada',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)'
                });
            } catch (error) {
                console.error('Error al activar siguiente pregunta:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo activar la siguiente pregunta.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)'
                });
            }
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Fin de la Asamblea',
                text: 'No hay más preguntas configuradas en el sistema.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        }
    };

    const handleCerrarVotacion = async () => {
        if (!selectedPregunta) return;

        const confirm = await Swal.fire({
            title: '¿Cerrar Votación?',
            text: "Los accionistas ya no podrán emitir más votos para esta pregunta.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (!confirm.isConfirmed) return;

        try {
            await votacionesService.actualizarPregunta(selectedPregunta.id, { estado: 'cerrada' });
            Swal.fire({
                icon: 'success', title: 'Votación Cerrada', toast: true, position: 'top-end',
                showConfirmButton: false, timer: 3000, background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            const dataPreg = await votacionesService.listarPreguntas();
            setPreguntas(dataPreg);
            const updated = dataPreg.find(p => p.id === selectedPregunta.id);
            if (updated) setSelectedPregunta(updated);
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cerrar la votación.', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        }
    };

    const handleAbrirVotacion = async () => {
        if (!selectedPregunta) return;

        const confirm = await Swal.fire({
            title: '¿Abrir Votación?',
            text: "Los accionistas podrán comenzar a emitir sus votos ahora.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, abrir ahora',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (!confirm.isConfirmed) return;

        try {
            await votacionesService.actualizarPregunta(selectedPregunta.id, { estado: 'activa' });

            // Al abrir, automáticamente cambiar proyector a resultados
            handleCambiarVista('pregunta_activa');

            Swal.fire({
                icon: 'success', title: 'Votación Abierta', toast: true, position: 'top-end',
                showConfirmButton: false, timer: 3000, background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            const dataPreg = await votacionesService.listarPreguntas();
            setPreguntas(dataPreg);
            const updated = dataPreg.find(p => p.id === selectedPregunta.id);
            if (updated) setSelectedPregunta(updated);
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo abrir la votación.', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        }
    };

    const handleCambiarVista = async (vista: string) => {
        try {
            await configService.cambiarVistaProyector(vista);
            setVistaProyector(vista);
            Swal.fire({
                icon: 'success', title: `Vista: ${vista.replace('_', ' ').toUpperCase()}`, toast: true, position: 'bottom-end',
                showConfirmButton: false, timer: 1500, background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
        } catch (error) {
            console.error('Error cambiar vista:', error);
        }
    };

    const totalQuorumPorcentaje = useMemo(() => {
        return accionistas.reduce((acc, current) => {
            const asis = current.asistencias?.[0];
            if (asis && asis.asistio) {
                return acc + (current.porcentaje_base || 0);
            }
            return acc;
        }, 0);
    }, [accionistas]);

    const gruposAsistentes = useMemo(() => {
        const grupos: Record<string, GrupoAsistente> = {};
        const term = busqueda.toLowerCase().trim();

        const filtrados = accionistas.filter(a =>
            a.nombre_titular.toLowerCase().includes(term) ||
            a.num_doc?.includes(term) ||
            a.asistencias?.[0]?.asistente_nombre?.toLowerCase().includes(term) ||
            a.asistencias?.[0]?.asistente_identificacion?.toLowerCase().includes(term)
        );

        filtrados.forEach(acc => {
            const asis = acc.asistencias?.[0];
            if (!asis || !asis.asistio) return;

            const iden = asis.asistente_identificacion || acc.num_doc || 'SIN_ID';
            const nom = asis.asistente_nombre || acc.nombre_titular;

            if (!grupos[iden]) {
                grupos[iden] = {
                    identificacion: iden, nombre: nom, es_titular: asis.es_titular,
                    lista_accionistas: [], total_acciones: 0, porcentaje_total: 0,
                    votos_pendientes: 0, votos_emitidos: 0, opciones_voto: new Set<string>()
                };
            }
            grupos[iden].lista_accionistas.push(acc);
            grupos[iden].total_acciones += acc.total_acciones || 0;
            grupos[iden].porcentaje_total += acc.porcentaje_base || 0;

            const voto = votosDetalle.find(v => v.accionista_id === acc.id);
            if (voto) {
                grupos[iden].votos_emitidos += 1;
                grupos[iden].opciones_voto.add(normalize(voto.opcion));
            } else {
                grupos[iden].votos_pendientes += 1;
            }
        });
        return Object.values(grupos);
    }, [accionistas, busqueda, votosDetalle]);

    const toggleGroup = (iden: string) => {
        setExpandedGroups(prev => ({ ...prev, [iden]: !prev[iden] }));
    };

    return (
        <Container fluid className="px-4 py-4 min-vh-100">
            {/* Header section identical to previous premium designs */}
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-main-opacity pb-3">
                <h2 className="text-main mb-0 d-flex align-items-center gap-3">
                    <div className="p-2 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 d-flex align-items-center justify-content-center">
                        <Vote size={28} className="text-primary" />
                    </div>
                    Panel de Control de Votaciones
                </h2>
                <Badge className="badge-glass-primary text-uppercase px-3 py-2 fs-6">
                    SESIÓN EN VIVO
                </Badge>
            </div>

            <Row className="mb-4 g-3">
                <Col lg={8}>
                    <Card className="bg-glass border-glass h-100 p-4 shadow-lg">
                        <div className="d-flex align-items-start gap-3 mb-4">
                            <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
                                <HelpCircle size={24} />
                            </div>
                            <div className="flex-grow-1">
                                <Form.Group>
                                    <Form.Label className="text-dim small text-uppercase fw-bold mb-2">Pregunta Activa</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select
                                            className="input-glass-solid fs-5 flex-grow-1"
                                            value={selectedPregunta?.id || ''}
                                            onChange={(e) => {
                                                const p = preguntas.find(p => p.id === parseInt(e.target.value));
                                                if (p) setSelectedPregunta(p);
                                            }}
                                        >
                                            {!selectedPregunta && <option value="" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>No hay preguntas disponibles</option>}
                                            {preguntas.map(p => (
                                                <option key={p.id} value={p.id} style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>{p.enunciado}</option>
                                            ))}
                                        </Form.Select>
                                        <Button
                                            variant="outline-primary"
                                            className="border-glass px-3"
                                            onClick={() => navigate('/admin/votes/config')}
                                            title="Configurar Preguntas"
                                        >
                                            <Settings size={20} />
                                        </Button>
                                    </div>
                                </Form.Group>
                            </div>
                        </div>

                        <div className="p-4 rounded-4 border border-main-opacity shadow-inner bg-surface">
                            <h4 className="text-main h6 mb-4 d-flex align-items-center justify-content-between opacity-75 text-uppercase letter-spacing-wide">
                                <span className="d-flex align-items-center gap-2">
                                    <Activity size={18} className="text-info" />
                                    Avance de Escrutinio Real (Base 100% = Quórum)
                                </span>
                                {loadingResultados && <Spinner animation="border" size="sm" variant="info" />}
                            </h4>

                            <div className="vote-progress-bars">
                                {(!selectedPregunta?.opciones || selectedPregunta.opciones.length === 0) ? (
                                    <div className="text-center text-dim small py-3">Sin opciones configuradas.</div>
                                ) : (
                                    <Row className="align-items-center">
                                        <Col md={5}>
                                            <div style={{ height: '250px', position: 'relative' }}>
                                                {/* Mensaje centrado en el anillo */}
                                                <div className="position-absolute top-50 start-50 translate-middle text-center d-flex flex-column align-items-center justify-content-center" style={{ zIndex: 0 }}>
                                                    <span className="text-dim small fw-bold text-uppercase">Total</span>
                                                    <span className="text-main fw-bold fs-5">100%</span>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
                                                    <PieChart>
                                                        <Pie
                                                            data={((): { name: string, value: number, colorHex: string }[] => {
                                                                let totalVoted = 0;
                                                                const chartData = selectedPregunta.opciones.map((opcionObj, index) => {
                                                                    const normText = normalize(opcionObj.texto);
                                                                    const resMatch = resultados?.resultados?.find(r => normalize(r.opcion) === normText);
                                                                    const porcentaje = resMatch ? resMatch.porcentaje_total : 0;
                                                                    totalVoted += porcentaje;

                                                                    let colorHex = '#3b82f6';
                                                                    if (['si', 'afavor', 'a favor'].map(normalize).includes(normText)) colorHex = '#10b981';
                                                                    else if (['no', 'encontra', 'en contra'].map(normalize).includes(normText)) colorHex = '#ef4444';
                                                                    else if (['abstencion', 'abstención'].map(normalize).includes(normText)) colorHex = '#0ea5e9';
                                                                    else if (['nulo', 'blanco'].map(normalize).includes(normText)) colorHex = '#64748b';
                                                                    else {
                                                                        const hexColors = ['#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                                                        colorHex = hexColors[index % hexColors.length];
                                                                    }

                                                                    return {
                                                                        name: opcionObj.texto,
                                                                        value: porcentaje,
                                                                        colorHex
                                                                    };
                                                                });

                                                                if (totalVoted < 99.9) {
                                                                    chartData.push({
                                                                        name: 'Por Votar / Pendientes',
                                                                        value: Math.max(0, 100 - totalVoted),
                                                                        colorHex: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
                                                                    });
                                                                } else if (chartData.every(d => d.value === 0)) {
                                                                    return [{ name: 'Sin Votos', value: 100, colorHex: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }];
                                                                }

                                                                return chartData.filter(d => d.value > 0);
                                                            })()}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            innerRadius={65}
                                                            outerRadius={85}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                            cornerRadius={5}
                                                        >
                                                            {((): any[] => {
                                                                let totalVoted = 0;
                                                                const chartData = selectedPregunta.opciones.map((opcionObj, index) => {
                                                                    const normText = normalize(opcionObj.texto);
                                                                    const resMatch = resultados?.resultados?.find(r => normalize(r.opcion) === normText);
                                                                    const porcentaje = resMatch ? resMatch.porcentaje_total : 0;
                                                                    totalVoted += porcentaje;

                                                                    let colorHex = '#3b82f6';
                                                                    if (['si', 'afavor', 'a favor'].map(normalize).includes(normText)) colorHex = '#10b981';
                                                                    else if (['no', 'encontra', 'en contra'].map(normalize).includes(normText)) colorHex = '#ef4444';
                                                                    else if (['abstencion', 'abstención'].map(normalize).includes(normText)) colorHex = '#0ea5e9';
                                                                    else if (['nulo', 'blanco'].map(normalize).includes(normText)) colorHex = '#64748b';
                                                                    else {
                                                                        const hexColors = ['#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                                                        colorHex = hexColors[index % hexColors.length];
                                                                    }
                                                                    return { value: porcentaje, colorHex };
                                                                });

                                                                if (totalVoted < 99.9) chartData.push({ value: Math.max(0, 100 - totalVoted), colorHex: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' });
                                                                else if (chartData.every(d => d.value === 0)) return [<Cell key="empty" fill={theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'} />];

                                                                return chartData.filter(d => d.value > 0).map((d, index) => (
                                                                    <Cell key={`cell-${index}`} fill={d.colorHex} style={d.colorHex !== 'rgba(255,255,255,0.05)' && d.colorHex !== 'rgba(0,0,0,0.05)' ? { filter: `drop-shadow(0px 0px 8px ${d.colorHex}55)` } : {}} />
                                                                ));
                                                            })()}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            contentStyle={{
                                                                backgroundColor: 'var(--bg-card-solid)',
                                                                borderColor: 'var(--glass-border)',
                                                                color: 'var(--text-main)',
                                                                borderRadius: '12px',
                                                                backdropFilter: 'blur(10px)',
                                                                boxShadow: 'var(--card-shadow)'
                                                            }}
                                                            itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                                                            formatter={(value: any) => [`${(Number(value) || 0).toFixed(2)}%`, 'Porcentaje']}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Col>
                                        <Col md={7}>
                                            <div className="d-flex flex-column gap-3">
                                                {selectedPregunta.opciones.map((opcionObj, index) => {
                                                    const normText = normalize(opcionObj.texto);
                                                    const resMatch = resultados?.resultados?.find(r => normalize(r.opcion) === normText);
                                                    const porcentaje = resMatch ? resMatch.porcentaje_total : 0;

                                                    let colorClass = 'primary';
                                                    if (['si', 'afavor', 'a favor'].map(normalize).includes(normText)) colorClass = 'success';
                                                    else if (['no', 'encontra', 'en contra'].map(normalize).includes(normText)) colorClass = 'danger';
                                                    else if (['abstencion', 'abstención'].map(normalize).includes(normText)) colorClass = 'info';
                                                    else if (['nulo', 'blanco'].map(normalize).includes(normText)) colorClass = 'secondary';
                                                    else {
                                                        const colors = ['primary', 'warning', 'info', 'success', 'danger'];
                                                        colorClass = colors[index % colors.length];
                                                    }

                                                    return (
                                                        <div key={opcionObj.id} className="pe-3">
                                                            <div className="d-flex justify-content-between text-dim small mb-2">
                                                                <span className="fw-bold text-main text-uppercase letter-spacing-wide d-flex align-items-center gap-2">
                                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: `var(--bs-${colorClass})`, display: 'inline-block', boxShadow: `0 0 8px var(--bs-${colorClass})` }}></span>
                                                                    {opcionObj.texto}
                                                                </span>
                                                                <span className={`text-${colorClass} fw-bold fs-5 d-flex align-items-center gap-2`}>
                                                                    {porcentaje.toFixed(2)}%
                                                                </span>
                                                            </div>
                                                            <div className="progress bg-surface shadow-inner" style={{ height: '8px', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div
                                                                    className={`progress-bar bg-${colorClass} progress-bar-striped progress-bar-animated`}
                                                                    style={{
                                                                        width: `${porcentaje}%`,
                                                                        transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Col>
                                    </Row>
                                )}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col lg={4} className="d-flex flex-column gap-3">
                    <Card className="bg-glass border-glass flex-grow-1 p-4 d-flex flex-column justify-content-center text-center shadow-lg">
                        {(() => {
                            const currentIndex = preguntas.findIndex(p => p.id === selectedPregunta?.id);
                            const hasNext = currentIndex !== -1 && currentIndex < preguntas.length - 1;

                            if (hasNext) {
                                return (
                                    <div className="mx-auto mb-4 d-flex flex-column align-items-center gap-3">
                                        <Button
                                            variant="success"
                                            className="rounded-circle p-4 shadow-lg hover-scale transition-all d-flex align-items-center justify-content-center border-0 border-glass"
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                                            }}
                                            onClick={handleSiguientePregunta}
                                            title="Ir a la siguiente pregunta"
                                        >
                                            <SkipForward size={48} className="text-white" />
                                        </Button>
                                        <div className="p-2 px-3 rounded-pill bg-warning bg-opacity-10 border border-warning border-opacity-20">
                                            <span className="text-warning fw-bold small text-uppercase letter-spacing-wide">
                                                {selectedPregunta?.estado === 'cerrada' ? 'Pasar a la siguiente pregunta' : 'Saltar a la siguiente pregunta'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="mx-auto mb-4 p-4 rounded-circle bg-primary bg-opacity-5 border border-primary border-opacity-10 shadow-sm" style={{ width: 'fit-content' }}>
                                    <Users size={40} className="text-primary opacity-75" />
                                </div>
                            );
                        })()}
                        <div className="text-dim small text-uppercase fw-bold letter-spacing-wide mb-1">Socios que han Votado</div>
                        <div className="display-2 mb-0 text-main fw-bold">
                            {resultados?.total_participantes || 0}
                        </div>
                        <div className="text-dim small mt-2 fs-5">
                            De <strong className="text-main">{accionistas.length}</strong> habilitados en sala
                        </div>
                        <div className="mt-4 pt-2">
                            <Button
                                variant={selectedPregunta?.estado === 'pendiente' ? 'success' : 'primary'}
                                className="w-100 py-3 fw-bold rounded-pill shadow-lg hover-scale transition-all"
                                onClick={selectedPregunta?.estado === 'pendiente' ? handleAbrirVotacion : handleCerrarVotacion}
                                disabled={!selectedPregunta || selectedPregunta.estado === 'cerrada'}
                            >
                                {selectedPregunta?.estado === 'cerrada' ? 'VOTACIÓN FINALIZADA' :
                                    selectedPregunta?.estado === 'pendiente' ? 'ABRIR RECEPCIÓN DE VOTOS' :
                                        'CERRAR RECEPCIÓN DE VOTOS'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-glass border-glass p-4 rounded-4 shadow-lg">
                        <h4 className="text-main h6 mb-3 d-flex align-items-center gap-2 opacity-90 text-uppercase letter-spacing-wide">
                            <MonitorPlay size={18} className="text-warning" />
                            Control del Proyector
                        </h4>
                        <div className="d-flex flex-column gap-2">
                            <Button
                                variant={vistaProyector === 'espera' ? 'warning' : 'outline-warning'}
                                className="w-100 border-opacity-50 text-start d-flex align-items-center gap-2 px-3 fw-bold py-2"
                                onClick={() => handleCambiarVista('espera')}
                            >
                                <PauseCircle size={18} /> MODO ESPERA
                            </Button>
                            <Button
                                variant={vistaProyector === 'quorum' ? 'info' : 'outline-info'}
                                className="w-100 border-opacity-50 text-start d-flex align-items-center gap-2 px-3 fw-bold py-2"
                                onClick={() => handleCambiarVista('quorum')}
                            >
                                <Users size={18} /> MOSTRAR QUÓRUM Y QR
                            </Button>
                            <Button
                                variant={vistaProyector === 'pregunta_activa' ? 'primary' : 'outline-primary'}
                                className="w-100 border-opacity-50 text-start d-flex align-items-center gap-2 px-3 fw-bold py-2"
                                onClick={() => handleCambiarVista('pregunta_activa')}
                            >
                                <BarChart3 size={18} /> MOSTRAR RESULTADOS
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card className="bg-glass border-glass rounded-4 mb-3 shadow-lg">
                <Card.Body className="p-3">
                    <div className="position-relative">
                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-dim" size={18} />
                        <Form.Control
                            type="text"
                            placeholder="Buscar por nombre o identificación del asistente..."
                            className="bg-surface text-main rounded-pill ps-5 py-2 glass-search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </Card.Body>
            </Card>

            <Card className="bg-glass border-glass overflow-hidden rounded-4 border-0 shadow-lg">
                <div className="p-4 border-bottom border-main-opacity d-flex justify-content-between align-items-center bg-surface">
                    <h5 className="text-main mb-0 d-flex align-items-center gap-2 opacity-90 fw-bold">
                        <Users size={20} className="text-primary" />
                        RELACIÓN DE ASISTENTES Y ACCIONES REPRESENTADAS
                    </h5>
                    <Badge bg="info" className="px-3 py-2 fs-6">{gruposAsistentes.length} PERSONAS EN SALA</Badge>
                </div>
                <div className="glass-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <Table responsive hover className="glass-table align-middle mb-0">
                        <thead className="bg-surface">
                            <tr>
                                <th className="ps-4 text-center text-dim" style={{ width: '60px' }}>#</th>
                                <th className="text-dim">PERSONA ASISTENTE / VOTANTE</th>
                                <th className="text-dim">IDENTIFICACIÓN</th>
                                <th className="text-center text-dim">TOTAL ACCIONES</th>
                                <th className="text-center text-dim">% (SOBRE QUÓRUM)</th>
                                <th className="text-center text-dim">ESTADO VOTO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" size="sm" variant="info" /></td></tr>
                            ) : gruposAsistentes.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-5 text-dim">No hay asistentes registrados o que coincidan con la búsqueda.</td></tr>
                            ) : gruposAsistentes.map((grupo, idx) => {
                                const isExpanded = expandedGroups[grupo.identificacion];
                                return (
                                    <React.Fragment key={grupo.identificacion}>
                                        <tr
                                            onClick={() => toggleGroup(grupo.identificacion)}
                                            style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-surface)' : 'transparent', transition: 'all 0.3s' }}
                                        >
                                            <td className="ps-4 text-center text-dim small">{idx + 1}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    {isExpanded ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary opacity-50" />}
                                                    <div className="fw-bold text-main">{grupo.nombre}</div>
                                                    {!grupo.es_titular && <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.65em' }}>APODERADO</Badge>}
                                                </div>
                                            </td>
                                            <td><div className="small text-dim font-monospace">{grupo.identificacion}</div></td>
                                            <td className="text-center"><div className="fw-bold text-main fs-5">{grupo.total_acciones.toLocaleString()}</div></td>
                                            <td className="text-center">
                                                <Badge className="badge-glass-primary fs-6 py-2 px-3">
                                                    {totalQuorumPorcentaje > 0 ? ((grupo.porcentaje_total / totalQuorumPorcentaje) * 100).toFixed(4) : "0.0000"}%
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                    {grupo.votos_pendientes > 0 && grupo.votos_emitidos === 0 ? (
                                                        <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">PENDIENTE</Badge>
                                                    ) : grupo.votos_pendientes > 0 && grupo.votos_emitidos > 0 ? (
                                                        <Badge bg="warning" className="px-3 py-2 rounded-pill shadow-sm">PARCIAL</Badge>
                                                    ) : (
                                                        <Badge bg={grupo.opciones_voto.size === 1 ? (Array.from(grupo.opciones_voto)[0] === 'si' ? 'success' : 'danger') : 'info'} className="px-3 py-2 rounded-pill text-uppercase shadow-sm">
                                                            {grupo.opciones_voto.size === 1 ? Array.from(grupo.opciones_voto)[0] : 'MIXTO'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && grupo.lista_accionistas.map((acc) => {
                                            const votoAcc = votosDetalle.find(v => v.accionista_id === acc.id);
                                            return (
                                                <tr key={acc.id} className=" bg-opacity-5 border-0">
                                                    <td></td>
                                                    <td className="ps-5 text-dim small border-0">
                                                        <span className="text-primary me-2">↳</span>
                                                        {acc.nombre_titular} {acc.num_doc !== grupo.identificacion && <span className="text-dim opacity-50 ms-2">({acc.num_doc})</span>}
                                                    </td>
                                                    <td className="border-0"></td>
                                                    <td className="text-center text-dim small border-0">{acc.total_acciones?.toLocaleString()}</td>
                                                    <td className="text-center text-dim small border-0">
                                                        {votoAcc?.peso_relativo !== undefined && votoAcc?.peso_relativo !== null ?
                                                            votoAcc.peso_relativo.toFixed(4) :
                                                            (totalQuorumPorcentaje > 0 ? ((acc.porcentaje_base / totalQuorumPorcentaje) * 100).toFixed(4) : "0.0000")
                                                        }%
                                                    </td>
                                                    <td className="text-center border-0">
                                                        <Badge bg={votoAcc ? (normalize(votoAcc.opcion) === 'si' ? 'success' : 'danger') : 'secondary'} className={`bg-opacity-25 px-2 py-1 ${votoAcc ? 'text-main' : 'text-dim opacity-50 border border-main-opacity'}`} style={{ fontSize: '0.75rem' }}>
                                                            {votoAcc ? votoAcc.opcion.toUpperCase() : 'NO VOTÓ'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            </Card>
        </Container>
    );
};

export default VotacionesPage;
