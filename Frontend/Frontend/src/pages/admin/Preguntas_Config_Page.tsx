import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Container, Card, Table, Button, Form, Modal, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { ListOrdered, Plus, Edit, Trash2, HelpCircle, Save, X } from 'lucide-react';
import { votacionesService, type Pregunta } from '../../services/votaciones.service';

export const PreguntasConfigPage: React.FC = () => {
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPregunta, setCurrentPregunta] = useState<Partial<Pregunta>>({
        enunciado: '',
        numero_orden: 1,
        tipo_votacion: 'binaria',
        estado: 'pendiente'
    });

    // Gestión temporal de opciones en el modal
    const [tempOpciones, setTempOpciones] = useState<string[]>([]);
    const [newOpcText, setNewOpcText] = useState('');

    useEffect(() => {
        cargarPreguntas();
    }, []);

    const cargarPreguntas = async () => {
        setLoading(true);
        try {
            const data = await votacionesService.listarPreguntas();
            setPreguntas(data);
        } catch (error) {
            console.error('Error cargando preguntas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (pregunta?: Pregunta) => {
        if (pregunta) {
            setIsEditing(true);
            setCurrentPregunta(pregunta);
            setTempOpciones(pregunta.opciones.map(o => o.texto));
        } else {
            setIsEditing(false);
            setCurrentPregunta({
                enunciado: '',
                numero_orden: preguntas.length + 1,
                tipo_votacion: 'binaria',
                estado: 'pendiente'
            });
            setTempOpciones(['SÍ', 'NO', 'ABSTENCIÓN']); // Default binario
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!currentPregunta.enunciado) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'El enunciado de la pregunta es obligatorio.',
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            return;
        }

        try {
            if (isEditing && currentPregunta.id) {
                await votacionesService.actualizarPregunta(currentPregunta.id, currentPregunta);
                Swal.fire({
                    icon: 'success',
                    title: 'Pregunta Actualizada',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: 'var(--bg-card-solid)', color: 'var(--text-main)'
                });
            } else {
                await votacionesService.crearPregunta({
                    ...currentPregunta,
                    opciones: tempOpciones,
                    periodo: "2025"
                } as any);
                Swal.fire({
                    icon: 'success',
                    title: 'Pregunta Creada',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: 'var(--bg-card-solid)', color: 'var(--text-main)'
                });
            }
            setShowModal(false);
            cargarPreguntas();
        } catch (error) {
            console.error('Error guardando pregunta:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar la pregunta.',
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar Pregunta?',
            text: "Esto borrará también sus votos asociados. Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (!confirm.isConfirmed) return;

        try {
            await votacionesService.eliminarPregunta(id);
            Swal.fire({
                icon: 'success',
                title: 'Pregunta Eliminada',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            cargarPreguntas();
        } catch (error) {
            console.error('Error eliminando:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        }
    };

    const handleMassUpdate = async (nuevoEstado: string) => {
        if (preguntas.length === 0) return;

        const confirm = await Swal.fire({
            title: `¿Cambiar todas a ${nuevoEstado.toUpperCase()}?`,
            text: `Esta acción actualizará el estado de las ${preguntas.length} preguntas simultáneamente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, actualizar todas',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            await Promise.all(
                preguntas.map(p => votacionesService.actualizarPregunta(p.id, { estado: nuevoEstado }))
            );

            Swal.fire({
                icon: 'success',
                title: 'Actualización Masiva Completada',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            cargarPreguntas();
        } catch (error) {
            console.error('Error en actualización masiva:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error Parcial',
                text: 'Algunas preguntas podrían no haberse actualizado correctamente.',
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
            cargarPreguntas();
        } finally {
            setLoading(false);
        }
    };

    const addTempOpcion = () => {
        if (!newOpcText.trim()) return;
        setTempOpciones([...tempOpciones, newOpcText.trim().toUpperCase()]);
        setNewOpcText('');
    };

    const removeTempOpcion = (index: number) => {
        setTempOpciones(tempOpciones.filter((_, i) => i !== index));
    };

    const handleAddOpcionReal = async () => {
        if (!newOpcText.trim() || !currentPregunta.id) return;
        try {
            const nueva = await votacionesService.agregarOpcion(currentPregunta.id, newOpcText.trim().toUpperCase());
            setCurrentPregunta({
                ...currentPregunta,
                opciones: [...(currentPregunta.opciones || []), nueva]
            });
            setNewOpcText('');
        } catch (error) {
            console.error('Error agregando opción:', error);
        }
    };

    const handleRemoveOpcionReal = async (opcionId: number) => {
        try {
            await votacionesService.eliminarOpcion(opcionId);
            if (currentPregunta.opciones) {
                setCurrentPregunta({
                    ...currentPregunta,
                    opciones: currentPregunta.opciones.filter(o => o.id !== opcionId)
                });
            }
        } catch (error) {
            console.error('Error eliminando opción:', error);
        }
    };

    return (
        <Container fluid className="px-4 py-4 h-100 overflow-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-main mb-0 d-flex align-items-center gap-3">
                    <div className="p-2 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 d-flex align-items-center justify-content-center">
                        <ListOrdered size={28} className="text-primary" />
                    </div>
                    Configuración de Preguntas
                </h2>
                <div className="d-flex gap-2">
                    <div className="bg-white bg-opacity-5 p-1 rounded-pill border border-white border-opacity-10 d-flex gap-1 me-2">
                        <Button
                            variant="outline-warning"
                            size="sm"
                            className="rounded-pill px-3 border-0 text-uppercase fw-bold"
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => handleMassUpdate('pendiente')}
                        >
                            Todas Pendientes
                        </Button>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-3 border-0 text-uppercase fw-bold"
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => handleMassUpdate('cerrada')}
                        >
                            Todas Cerradas
                        </Button>
                        <Button
                            variant="outline-success"
                            size="sm"
                            className="rounded-pill px-3 border-0 text-uppercase fw-bold"
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => handleMassUpdate('activa')}
                        >
                            Todas Activas
                        </Button>
                    </div>
                    <Button
                        variant="primary"
                        className="rounded-pill px-4 d-flex align-items-center gap-2 shadow-lg"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus size={18} />
                        Nueva Pregunta
                    </Button>
                </div>
            </div>

            <Card className="bg-glass border-glass overflow-hidden shadow-sm">
                <Table responsive hover className="glass-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th className="ps-4" style={{ width: '80px' }}>Orden</th>
                            <th>Enunciado / Punto de Orden</th>
                            <th className="text-center">Tipo</th>
                            <th className="text-center">Estado</th>
                            <th className="text-center">Opciones</th>
                            <th className="text-end pe-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                        ) : preguntas.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-5 text-muted">No hay preguntas configuradas.</td></tr>
                        ) : preguntas.map((p) => (
                            <tr key={p.id}>
                                <td className="ps-4">
                                    <Badge className="badge-glass-primary fs-6">#{p.numero_orden}</Badge>
                                </td>
                                <td>
                                    <div className="text-main fw-bold">{p.enunciado}</div>
                                </td>
                                <td className="text-center">
                                    <span className="text-dim small text-uppercase">{p.tipo_votacion}</span>
                                </td>
                                <td className="text-center">
                                    {p.estado === 'activa' ? (
                                        <Badge className="badge-glass-success text-uppercase">Activa</Badge>
                                    ) : p.estado === 'cerrada' ? (
                                        <Badge className="badge-glass-danger text-uppercase">Cerrada</Badge>
                                    ) : (
                                        <Badge className="badge-glass-warning text-uppercase">Pendiente</Badge>
                                    )}
                                </td>
                                <td className="text-center">
                                    <div className="d-flex gap-1 justify-content-center flex-wrap">
                                        {p.opciones.map(o => (
                                            <span key={o.id} className="badge-glass-primary py-1 px-2 rounded-2" style={{ fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {o.texto}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-end pe-4">
                                    <div className="d-flex gap-2 justify-content-end">
                                        <Button variant="link" className="text-info p-0" onClick={() => handleOpenModal(p)}>
                                            <Edit size={18} />
                                        </Button>
                                        <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(p.id)}>
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>

            {/* MODAL CREAR/EDITAR */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton closeVariant="white" className="border-bottom-glass">
                    <Modal.Title className="text-main">
                        {isEditing ? 'Editar Pregunta' : 'Nueva Pregunta de Votación'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form className="d-flex flex-column gap-3">
                        <Row>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="text-dim small fw-bold">N° ORDEN</Form.Label>
                                    <Form.Control
                                        type="number"
                                        className="input-glass-solid"
                                        value={currentPregunta.numero_orden}
                                        onChange={(e) => setCurrentPregunta({ ...currentPregunta, numero_orden: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="text-dim small fw-bold">TIPO VOTACIÓN</Form.Label>
                                    <Form.Select
                                        className="input-glass-solid"
                                        value={currentPregunta.tipo_votacion}
                                        onChange={(e) => setCurrentPregunta({ ...currentPregunta, tipo_votacion: e.target.value })}
                                    >
                                        <option value="binaria">Binaria (SÍ/NO)</option>
                                        <option value="multiple">Múltiple Selección</option>
                                        <option value="eleccion">Elección de Dignidades</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group>
                            <Form.Label className="text-dim small fw-bold">ENUNCIADO / PREGUNTA</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                className="input-glass-solid"
                                placeholder="Ej: ¿Aprueba el informe de presidencia?"
                                value={currentPregunta.enunciado}
                                onChange={(e) => setCurrentPregunta({ ...currentPregunta, enunciado: e.target.value })}
                            />
                        </Form.Group>

                        <div className="p-4 rounded-4 border-glass mt-2 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)' }}>
                            <Form.Label className="text-main small fw-bold mb-3 d-flex align-items-center gap-2 opacity-90">
                                <HelpCircle size={14} className="text-primary" />
                                GESTIÓN DE OPCIONES
                            </Form.Label>

                            <div className="d-flex gap-2 mb-3">
                                <Form.Control
                                    type="text"
                                    className="input-glass-solid border-primary border-opacity-30"
                                    placeholder="Nueva opción..."
                                    value={newOpcText}
                                    onChange={(e) => setNewOpcText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            isEditing ? handleAddOpcionReal() : addTempOpcion();
                                        }
                                    }}
                                />
                                <Button variant="primary" size="sm" onClick={isEditing ? handleAddOpcionReal : addTempOpcion}>
                                    <Plus size={18} />
                                </Button>
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                {(isEditing ? (currentPregunta as any).opciones : tempOpciones.map((t, i) => ({ id: -i, texto: t }))).map((opc: any, idx: number) => {
                                    const text = opc.texto.toUpperCase();
                                    let badgeClass = "badge-glass-primary";
                                    if (['SÍ', 'SI', 'A FAVOR'].includes(text)) badgeClass = "badge-glass-success";
                                    if (['NO', 'EN CONTRA'].includes(text)) badgeClass = "badge-glass-danger";
                                    if (['ABSTENCIÓN', 'ABSTENCION'].includes(text)) badgeClass = "badge-glass-info";

                                    return (
                                        <Badge
                                            key={opc.id || idx}
                                            className={`${badgeClass} d-flex align-items-center gap-2 py-2 px-3 fs-7 border border-white border-opacity-10 rounded-3 shadow-sm`}
                                            style={{ cursor: 'default' }}
                                        >
                                            <span className="fw-bold">{opc.texto}</span>
                                            <X
                                                size={14}
                                                className="text-danger pointer-cursor opacity-75 hover-opacity-100 ms-1"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => isEditing ? handleRemoveOpcionReal(opc.id) : removeTempOpcion(idx)}
                                            />
                                        </Badge>
                                    );
                                })}
                                {(isEditing ? (currentPregunta as any).opciones?.length === 0 : tempOpciones.length === 0) && (
                                    <span className="text-white-50 small italic opacity-50">Añade al menos una opción...</span>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <Form.Group>
                                <Form.Label className="text-dim small fw-bold">ESTADO</Form.Label>
                                <Form.Select
                                    className="input-glass-solid"
                                    value={currentPregunta.estado}
                                    onChange={(e) => setCurrentPregunta({ ...currentPregunta, estado: e.target.value })}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="activa">Activa (Votando)</option>
                                    <option value="cerrada">Cerrada / Escrutada</option>
                                </Form.Select>
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-top-glass p-4">
                    <Button variant="link" className="text-dim text-decoration-none" onClick={() => setShowModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" className="rounded-pill px-5 shadow-lg d-flex align-items-center gap-2" onClick={handleSave}>
                        <Save size={18} />
                        Guardar Pregunta
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PreguntasConfigPage;
