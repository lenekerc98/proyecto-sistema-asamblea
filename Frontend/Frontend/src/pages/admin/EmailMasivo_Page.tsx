import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import { Send, Users, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import { enviarCorreoMasivo, listarDestinatarios } from '../../services/accionistas.service';
import { plantillasService, type EmailPlantilla } from '../../services/plantillas.service';
import JoditEditor from 'jodit-react';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/Glassmorphism.css';
import '../../styles/EmailPlantillas.css';

export const EmailMasivo_Page: React.FC = () => {
    const { theme } = useTheme();
    const [plantillas, setPlantillas] = useState<EmailPlantilla[]>([]);
    const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('');
    const [asunto, setAsunto] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [loadingCount, setLoadingCount] = useState(false);
    const [loadingPlantillas, setLoadingPlantillas] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [destinatarios, setDestinatarios] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const cargarConteo = async () => {
        try {
            setLoadingCount(true);
            const resList = await listarDestinatarios(filtro);
            setDestinatarios(resList);
            setSelectedIds(resList.map((d: any) => d.id)); // Por defecto seleccionar todos
        } catch (error) {
            console.error("Error al obtener datos:", error);
        } finally {
            setLoadingCount(false);
        }
    };

    const cargarPlantillas = async () => {
        try {
            setLoadingPlantillas(true);
            const data = await plantillasService.listar();
            setPlantillas(data);
        } catch (error) {
            console.error("Error al cargar plantillas:", error);
        } finally {
            setLoadingPlantillas(false);
        }
    };

    useEffect(() => {
        cargarConteo();
        cargarPlantillas();
    }, [filtro]);

    const handleSelectPlantilla = (id: string) => {
        setPlantillaSeleccionada(id);
        if (id === '') {
            setAsunto('');
            setMensaje('');
        } else {
            const p = plantillas.find(item => item.id === parseInt(id));
            if (p) {
                setAsunto(p.asunto);
                setMensaje(p.cuerpo);
            }
        }
    };

    const editorConfig = React.useMemo(() => ({
        theme: theme === 'light' ? 'default' : 'dark',
        readonly: false,
        minHeight: 400,
        height: 500, // Fijar altura por defecto para forzar scroll
        placeholder: 'Escriba su mensaje aquí. Las firmas se adjuntarán automáticamente...',
        defaultActionOnPaste: 'insert_as_html' as const,
        colorPickerDefaultTab: 'background' as const,
        toolbarSticky: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
    }), []);

    const handleEnviarMasivo = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!asunto || !mensaje) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El asunto y el mensaje son obligatorios', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            return;
        }

        if (selectedIds.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Sin Destinatarios', text: 'Debe seleccionar al menos una persona de la lista.', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Confirmar Envío Masivo',
            text: `Se enviarán correos a ${selectedIds.length} seleccionados. ¿Está seguro?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, Enviar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (confirm.isConfirmed) {
            try {
                setEnviando(true);
                const res = await enviarCorreoMasivo({ asunto, mensaje, ids_accionistas: selectedIds });
                Swal.fire({
                    icon: 'success',
                    title: 'Envío Finalizado',
                    text: `Se procesaron ${res.total_procesados} correos. Exitosos: ${res.exitosos}, Fallidos: ${res.fallidos}`,
                    background: 'var(--bg-card-solid)', color: 'var(--text-main)'
                });
                setAsunto('');
                setMensaje('');
                setPlantillaSeleccionada('');
                cargarConteo(); // Refrescar lista tras el éxito
            } catch (error: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.detail || 'Error al enviar correos',
                    background: 'var(--bg-card-solid)', color: 'var(--text-main)'
                });
            } finally {
                setEnviando(false);
            }
        }
    };

    return (
        <div className="admin-dashboard p-4">
            <header className="mb-4 d-flex justify-content-between align-items-end">
                <div>
                    <h1 className="h3 fw-bold text-main mb-2 d-flex align-items-center gap-2">
                        <Send size={24} className="text-info" /> Envío Masivo de Correos
                    </h1>
                    <p className="text-dim mb-0">Comuníquese con todos los accionistas empadronados a la vez.</p>
                </div>
            </header>

            <Row className="g-4">
                <Col lg={4}>
                    <Card className="bg-glass border-glass rounded-4 shadow-sm h-100">
                        <Card.Body className="p-4 border-bottom border-main-opacity">
                            <h2 className="h5 text-main fw-bold mb-3 d-flex align-items-center gap-2">
                                <Users size={20} className="text-primary" /> Filtro de Destinatarios
                            </h2>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small">Tipo de Accionista</Form.Label>
                                <Form.Select
                                    className="bg-surface text-main border-main-opacity shadow-none custom-select"
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                >
                                    <option value="todos" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Todos los Empadronados</option>
                                    <option value="asistentes" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Solo con Asistencia Registrada</option>
                                    <option value="naturales" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Personas Naturales (Cédula/Ext/Pas)</option>
                                    <option value="juridicas" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Personas Jurídicas (RUC)</option>
                                </Form.Select>
                            </Form.Group>

                            <div className="p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 mt-4 mb-3">
                                <p className="text-main mb-1 fw-bold fs-5">
                                    {loadingCount ? <Spinner animation="border" size="sm" /> : selectedIds.length}
                                </p>
                                <small className="text-dim">Destinatarios Seleccionados (de {destinatarios.length})</small>
                            </div>

                            <hr className="border-main-opacity" />

                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <small className="text-dim text-uppercase letter-spacing-1">Lista de Personas</small>
                                <Form.Check
                                    type="checkbox"
                                    id="select-all"
                                    label="Todos"
                                    className="text-main small custom-checkbox-glass"
                                    checked={selectedIds.length === destinatarios.length && destinatarios.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(destinatarios.map(d => d.id));
                                        } else {
                                            setSelectedIds([]);
                                        }
                                    }}
                                />
                            </div>

                            <div className="destinatarios-scroll-area rounded-3 border border-main-opacity p-2 bg-surface bg-opacity-10" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                {loadingCount && <div className="text-center py-4"><Spinner animation="border" size="sm" variant="primary" /></div>}
                                {!loadingCount && destinatarios.map(d => (
                                    <div
                                        key={d.id}
                                        className="d-flex align-items-center gap-2 p-2 rounded-2 hover-bg-white-5 mb-1 transition-all"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            if (selectedIds.includes(d.id)) {
                                                setSelectedIds(selectedIds.filter(id => id !== d.id));
                                            } else {
                                                setSelectedIds([...selectedIds, d.id]);
                                            }
                                        }}
                                    >
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedIds.includes(d.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds([...selectedIds, d.id]);
                                                    } else {
                                                        setSelectedIds(selectedIds.filter(id => id !== d.id));
                                                    }
                                                }}
                                                className="custom-checkbox-glass"
                                            />
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="text-main small fw-semibold text-truncate">{d.nombre_titular}</div>
                                            <div className="text-dim extra-small text-truncate">{d.correo}</div>
                                        </div>
                                    </div>
                                ))}
                                {!loadingCount && destinatarios.length === 0 && (
                                    <div className="text-center py-4 text-muted small">No se encontraron destinatarios</div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    <Card className="bg-glass border-glass rounded-4 shadow-sm h-100">
                        <Card.Body className="p-4">
                            <h2 className="h5 text-main fw-bold mb-4 d-flex align-items-center gap-2">
                                <FileText size={20} className="text-success" /> Redacción del Correo
                            </h2>

                            <Form onSubmit={handleEnviarMasivo}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-dim small">Plantilla Prediseñada</Form.Label>
                                    <Form.Select
                                        className="bg-surface text-main border-main-opacity shadow-none custom-select"
                                        value={plantillaSeleccionada}
                                        onChange={(e) => handleSelectPlantilla(e.target.value)}
                                        disabled={loadingPlantillas}
                                    >
                                        <option value="" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>-- Redacción Manual --</option>
                                        {plantillas.map(p => (
                                            <option key={p.id} value={p.id} style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>{p.nombre}</option>
                                        ))}
                                    </Form.Select>
                                    {loadingPlantillas && <div className="mt-1 small text-info"><Spinner animation="border" size="sm" className="me-2" /> Cargando plantillas...</div>}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-dim small">Asunto del Correo</Form.Label>
                                    <Form.Control
                                        className="bg-surface text-main border-main-opacity shadow-none"
                                        placeholder="Ej. Convocatoria General Asamblea 2026"
                                        value={asunto}
                                        onChange={(e) => setAsunto(e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="text-dim small mb-2 d-flex align-items-center gap-2">
                                        CONTENIDO DEL MENSAJE (SIMULADOR DE PAPEL)
                                    </Form.Label>
                                    <div className="quill-paper-theme">
                                        <JoditEditor
                                            value={mensaje}
                                            config={editorConfig}
                                            onBlur={newContent => setMensaje(newContent)}
                                        />
                                    </div>
                                    <div className="mt-2 p-2 rounded-3 bg-surface bg-opacity-10 border border-main-opacity">
                                        <small className="text-dim extra-small">
                                            Las firmas personales se añadirán automáticamente al final del envío.
                                        </small>
                                    </div>
                                </Form.Group>

                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="outline-primary" className="px-4 border-main-opacity hover-scale">Vista Previa</Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="px-4 hover-scale d-flex align-items-center gap-2"
                                        disabled={enviando}
                                    >
                                        {enviando ? <Spinner animation="border" size="sm" /> : <Send size={18} />}
                                        {enviando ? 'Enviando...' : 'Enviar Ya'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default EmailMasivo_Page;
