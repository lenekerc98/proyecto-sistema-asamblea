import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal, Spinner, Badge } from 'react-bootstrap';
import { Plus, Trash2, Edit2, Save, FileText, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { plantillasService, type EmailPlantilla } from '../../services/plantillas.service';
import { configService } from '../../services/config.service';
import { userService } from '../../services/user.service';
import { authService } from '../../services/auth.service';
import JoditEditor from 'jodit-react';
import Swal from 'sweetalert2';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/Glassmorphism.css';
import '../../styles/EmailPlantillas.css';

export const EmailPlantillas_Page: React.FC = () => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [plantillas, setPlantillas] = useState<EmailPlantilla[]>([]);
    const [firma, setFirma] = useState('');
    const [savingFirma, setSavingFirma] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentPlantilla, setCurrentPlantilla] = useState<Partial<EmailPlantilla>>({
        nombre: '', asunto: '', cuerpo: '', asignacion: 'global'
    });


    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dataPlantillas, dataConfig] = await Promise.all([
                plantillasService.listar(),
                configService.getAsambleaConfig()
            ]);
            setPlantillas(dataPlantillas);

            // Cargar firma del usuario actual (si existe en el perfil)
            const user = authService.getCurrentUser();
            if (user && user.firma_email) {
                setFirma(user.firma_email);
            } else {
                setFirma(dataConfig.firma_email || '');
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
            Swal.fire({ icon: 'error', title: 'Error de Conexión', text: 'No se pudieron cargar las plantillas o la conexión a la base de datos ha fallado.', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            setPlantillas([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFirma = async () => {
        setSavingFirma(true);
        const user = authService.getCurrentUser();
        if (!user || !user.id) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo identificar al usuario actual', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            setSavingFirma(false);
            return;
        }

        try {
            const updatedUser = await userService.updateUser(user.id, { firma_email: firma });
            // Actualizar localStorage para reflejar la nueva firma
            const newUser = { ...user, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(newUser));

            Swal.fire({ icon: 'success', title: 'Tu Firma ha sido Guardada', timer: 1500, showConfirmButton: false, background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la firma', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        } finally {
            setSavingFirma(false);
        }
    };

    const handleEliminar = async (id: number) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar Plantilla?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                await plantillasService.eliminar(id);
                setPlantillas(plantillas.filter(p => p.id !== id));
                Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false, background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            }
        }
    };

    const handleOpenModal = (plantilla?: EmailPlantilla) => {
        if (plantilla) {
            setCurrentPlantilla(plantilla);
        } else {
            setCurrentPlantilla({ nombre: '', asunto: '', cuerpo: '', asignacion: 'global' });
        }
        setShowModal(true);
    };

    const handleSavePlantilla = async () => {
        try {
            if (currentPlantilla.id) {
                await plantillasService.actualizar(currentPlantilla.id, currentPlantilla);
            } else {
                await plantillasService.crear(currentPlantilla);
            }
            setShowModal(false);
            loadData();
            Swal.fire({ icon: 'success', title: 'Plantilla Guardada', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la plantilla', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
        }
    };

    const plantillasFiltradas = plantillas.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.asignacion.toLowerCase().includes(busqueda.toLowerCase())
    );

    const editorConfig = {
        theme: theme === 'light' ? 'default' : 'dark',
        readonly: false,
        minHeight: 400,
        height: 500, // Fijar la altura permite mostrar la barra de scroll vertical
        placeholder: 'Escriba o pegue el contenido aquí...',
        defaultActionOnPaste: 'insert_as_html' as const,
        colorPickerDefaultTab: 'background' as const,
        toolbarSticky: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-surface">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="admin-dashboard p-4 min-vh-100">
            {/* Sección: Firma Personal (Ancho Completo) */}
            <Row className="g-4 mb-5">
                <Col lg={12}>
                    <Card className="bg-glass border-glass rounded-4 shadow-lg overflow-hidden">
                        <Card.Header className="bg-surface border-bottom border-main-opacity p-4 d-flex justify-content-between align-items-center">
                            <div>
                                <h2 className="h5 text-main fw-bold mb-1">Mi Firma Personal</h2>
                                <p className="text-dim small mb-0">Esta firma se adjuntará automáticamente al pie de todos los correos que envíes.</p>
                            </div>
                            <div className="text-end">
                                <Button
                                    variant="success"
                                    className="fw-bold py-2 btn-gradient-success d-flex align-items-center justify-content-center gap-2 border-0 shadow rounded-pill hover-scale px-4"
                                    onClick={handleSaveFirma}
                                    disabled={savingFirma}
                                >
                                    {savingFirma ? <Spinner size="sm" animation="border" /> : <Save size={20} />}
                                    GUARDAR MI FIRMA
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4 bg-surface bg-opacity-10">
                            <Form.Group>
                                <Form.Label className="text-dim small mb-3 d-flex align-items-center gap-2 fw-bold">
                                    <ImageIcon size={14} className="text-primary" /> DISEÑO DE FIRMA (SIMULADOR DE PAPEL)
                                </Form.Label>
                                <div className="quill-paper-theme rounded-4 border border-main-opacity overflow-hidden mb-0">
                                    <JoditEditor
                                        value={firma}
                                        config={{ ...editorConfig, placeholder: "Diseñe su firma aquí (se recomienda copiar y pegar desde su correo)..." }}
                                        onBlur={newContent => setFirma(newContent)}
                                    />
                                </div>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Sección: Listado de Plantillas */}
            <Row className="g-4">
                <Col lg={12}>
                    <header className="mb-4 d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 fw-bold text-main mb-1">Plantillas de Correo</h2>
                            <p className="text-dim small mb-0">Gestione los mensajes automáticos que el sistema envía.</p>
                        </div>
                        <Button variant="primary" onClick={() => handleOpenModal()} className="btn-gradient-primary d-flex align-items-center gap-2 px-4 shadow-sm border-0 rounded-pill hover-scale">
                            <Plus size={20} /> NUEVA PLANTILLA
                        </Button>
                    </header>

                    {/* Barra de Búsqueda */}
                    <Card className="bg-glass border-glass rounded-4 shadow-sm mb-4">
                        <Card.Body className="p-3">
                            <Row className="g-3 align-items-center">
                                <Col md={6}>
                                    <div className="position-relative">
                                        <Search size={18} className="text-dim position-absolute top-50 start-0 translate-middle-y ms-3" />
                                        <Form.Control
                                            className="bg-surface text-main border-main-opacity ps-5 shadow-none rounded-pill"
                                            placeholder="Buscar por nombre o asunto..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                        />
                                    </div>
                                </Col>
                                <Col md={6} className="text-end">
                                    <Button variant="outline-primary" className="border-main-opacity rounded-pill hover-scale d-inline-flex align-items-center gap-2 px-3">
                                        <Filter size={18} /> Filtrar
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Tabla de Plantillas */}
                    <div className="glass-table-container shadow-lg">
                        <Table responsive hover className="glass-table align-middle">
                            <thead>
                                <tr>
                                    <th className="ps-4 py-3">Nombre</th>
                                    <th className="py-3">Asunto</th>
                                    <th className="py-3 text-center">Asignación</th>
                                    <th className="text-end pe-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plantillasFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-5 text-dim border-0">
                                            {loading ? 'Cargando datos...' : 'No se encontraron plantillas registradas.'}
                                        </td>
                                    </tr>
                                ) : (
                                    plantillasFiltradas.map(p => (
                                        <tr key={p.id}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                                                        <FileText size={18} className="text-primary" />
                                                    </div>
                                                    <span className="text-main fw-bold">{p.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="text-dim small">{p.asunto}</td>
                                            <td className="text-center">
                                                <Badge className="badge-primary-glass text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                    {p.asignacion}
                                                </Badge>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button variant="link" className="btn-circle-action text-info" onClick={() => handleOpenModal(p)} title="Editar">
                                                        <Edit2 size={16} />
                                                    </Button>
                                                    <Button variant="link" className="btn-circle-action text-danger border-danger border-opacity-10" onClick={() => handleEliminar(p.id)} title="Eliminar">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Col>
            </Row>

            {/* Modal para Crear/Editar Plantilla */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered contentClassName="glass-modal">
                <Modal.Header closeButton className="border-bottom border-main-opacity">
                    <Modal.Title className="fw-bold text-main">
                        {currentPlantilla.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 bg-surface bg-opacity-10">
                    <Form>
                        <Row className="g-4">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="text-dim small fw-bold mb-2">NOMBRE INTERNO</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="bg-surface text-main border-main-opacity shadow-none py-2"
                                        placeholder="Ej: Invitación a Votación"
                                        value={currentPlantilla.nombre}
                                        onChange={e => setCurrentPlantilla({ ...currentPlantilla, nombre: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="text-dim small fw-bold mb-2">ASIGNACIÓN</Form.Label>
                                    <Form.Select
                                        className="bg-surface text-main border-main-opacity shadow-none py-2"
                                        value={currentPlantilla.asignacion}
                                        onChange={e => setCurrentPlantilla({ ...currentPlantilla, asignacion: e.target.value })}
                                    >
                                        <option value="global" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Global</option>
                                        <option value="asistencia" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Asistencia</option>
                                        <option value="votacion" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Votación</option>
                                        <option value="recordatorio" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Recordatorio</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="text-dim small fw-bold mb-2">ASUNTO DEL EMAIL</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="bg-surface text-main border-main-opacity shadow-none py-2"
                                        placeholder="El título que el cliente leerá..."
                                        value={currentPlantilla.asunto}
                                        onChange={e => setCurrentPlantilla({ ...currentPlantilla, asunto: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="text-dim small fw-bold mb-2">CONTENIDO DEL CUERPO</Form.Label>
                                    <div className="quill-paper-theme">
                                        <JoditEditor
                                            value={currentPlantilla.cuerpo || ''}
                                            config={editorConfig}
                                            onBlur={val => setCurrentPlantilla({ ...currentPlantilla, cuerpo: val })}
                                        />
                                    </div>
                                    <div className="mt-3 p-3 rounded-4 bg-primary bg-opacity-5 border border-primary border-opacity-10">
                                        <small className="text-primary-emphasis fw-medium">
                                            💡 <strong>Tips:</strong> Puedes usar {"{nombre}"}, {"{entidad}"} o {"{token}"} para personalizar el mensaje según el destinatario.
                                        </small>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-top border-main-opacity bg-surface bg-opacity-10">
                    <Button variant="outline-primary" onClick={() => setShowModal(false)} className="border-main-opacity rounded-pill px-4">
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSavePlantilla} className="btn-gradient-primary border-0 rounded-pill px-4">
                        <Save size={18} className="me-2" />
                        {currentPlantilla.id ? 'Guardar Cambios' : 'Crear Plantilla'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
