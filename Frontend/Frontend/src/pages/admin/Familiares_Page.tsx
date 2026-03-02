import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Spinner, Badge, Tabs, Tab, Modal, Row, Col } from 'react-bootstrap';
import { Users, Shield, Search, Heart, Trash2, UserPlus, Plus, Edit2 } from 'lucide-react';
import {
    listarTodosLosRelacionados,
    listarTodosLosRepresentantes,
    eliminarRelacionado,
    eliminarRepresentante,
    listarAccionistas,
    agregarRelacionado,
    agregarRepresentante,
    actualizarRelacionado,
    actualizarRepresentante
} from '../../services/accionistas.service';
import type { Representante, Accionista, PersonaRelacionada } from '../../services/accionistas.service';
import { listarTiposVinculo } from '../../services/roles.service';
import type { TipoVinculo } from '../../services/roles.service';
import Swal from 'sweetalert2';

export const Familiares_Page: React.FC = () => {
    // Datos
    const [relacionados, setRelacionados] = useState<PersonaRelacionada[]>([]);
    const [representantes, setRepresentantes] = useState<Representante[]>([]);
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [tiposVinculo, setTiposVinculo] = useState<TipoVinculo[]>([]);

    // UI
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    // Formulario Crear / Editar
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editItemId, setEditItemId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // Formulario Crear
    const [formType, setFormType] = useState<'familiar' | 'representante'>('familiar');
    const [selectedAccionistaId, setSelectedAccionistaId] = useState<number | ''>('');
    const [formData, setFormData] = useState({
        nombre: '',
        num_doc: '',
        tipo_doc: 'c',
        tipo_vinculo_id: 0,
        tipo_id: 0, // Para representantes
        identificacion: '', // Para representantes
        poder: false
    });

    useEffect(() => {
        cargarDatos();
        cargarCatalogos();
    }, []);

    const cargarCatalogos = async () => {
        try {
            const [vincs, accs] = await Promise.all([
                listarTiposVinculo(),
                listarAccionistas()
            ]);
            setTiposVinculo(vincs);
            setAccionistas(accs);
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [rel, rep] = await Promise.all([
                listarTodosLosRelacionados(),
                listarTodosLosRepresentantes()
            ]);
            setRelacionados(rel);
            setRepresentantes(rep);
        } catch (error) {
            console.error('Error cargando datos de vínculos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const [rel, rep] = await Promise.all([
                listarTodosLosRelacionados(busqueda),
                listarTodosLosRepresentantes(busqueda)
            ]);
            setRelacionados(rel);
            setRepresentantes(rep);
        } catch (error) {
            console.error('Error en búsqueda de vínculos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type: 'familiar' | 'representante', item: any) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el vínculo de ${item.nombre}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#0B101E',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                if (type === 'familiar') {
                    await eliminarRelacionado(item.accionista_id, item.id);
                } else {
                    // Nota: para representantes necesitamos el accionista_id. 
                    // Si el item no lo trae directamente, lo buscamos o usamos props de la fila.
                    // Asumiremos que el backend devuelve accionista_id en el representante global
                    await eliminarRepresentante(item.accionista_id || item.titular?.id, item.id);
                }
                Swal.fire({
                    title: 'Eliminado',
                    text: 'El registro ha sido eliminado correctamente.',
                    icon: 'success',
                    background: '#0B101E',
                    color: '#fff',
                    timer: 2000
                });
                cargarDatos();
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo eliminar el registro.',
                    icon: 'error',
                    background: '#0B101E',
                    color: '#fff'
                });
            }
        }
    };

    const handleEdit = (type: 'familiar' | 'representante', item: any) => {
        setFormType(type);
        setIsEditing(true);
        setEditItemId(item.id);
        setSelectedAccionistaId(item.accionista_id || item.titular?.id);
        setFormData({
            nombre: item.nombre,
            num_doc: item.num_doc || '',
            tipo_doc: item.tipo_doc || 'c',
            tipo_vinculo_id: item.tipo_vinculo_id || 0,
            tipo_id: item.tipo_id || 0,
            identificacion: item.identificacion || item.num_doc || '',
            poder: item.tiene_poder_firmado || false
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccionistaId) {
            Swal.fire('Error', 'Debe seleccionar un accionista titular', 'error');
            return;
        }

        setSaving(true);
        try {
            if (isEditing && editItemId) {
                if (formType === 'familiar') {
                    await actualizarRelacionado(Number(selectedAccionistaId), editItemId, {
                        nombre: formData.nombre,
                        tipo_doc: formData.tipo_doc,
                        num_doc: formData.num_doc,
                        tipo_vinculo_id: formData.tipo_vinculo_id
                    });
                } else {
                    await actualizarRepresentante(Number(selectedAccionistaId), editItemId, {
                        nombre: formData.nombre,
                        identificacion: formData.identificacion || formData.num_doc,
                        tipo_id: formData.tipo_id,
                        tiene_poder_firmado: !!formData.poder
                    });
                }
            } else {
                if (formType === 'familiar') {
                    await agregarRelacionado(Number(selectedAccionistaId), {
                        nombre: formData.nombre,
                        tipo_doc: formData.tipo_doc,
                        num_doc: formData.num_doc,
                        tipo_vinculo_id: formData.tipo_vinculo_id
                    });
                } else {
                    await agregarRepresentante(Number(selectedAccionistaId), {
                        nombre: formData.nombre,
                        identificacion: formData.identificacion || formData.num_doc,
                        tipo_id: formData.tipo_id,
                        tiene_poder_firmado: !!formData.poder
                    });
                }
            }

            Swal.fire({
                title: '¡Éxito!',
                text: isEditing ? 'Vínculo actualizado correctamente.' : 'Vínculo creado correctamente.',
                icon: 'success',
                background: '#0B101E',
                color: '#fff',
                timer: 2000
            });
            setShowModal(false);
            cargarDatos();
            // Reset form
            setFormData({ nombre: '', num_doc: '', tipo_doc: 'c', tipo_vinculo_id: 0, tipo_id: 0, identificacion: '', poder: false });
            setSelectedAccionistaId('');
            setIsEditing(false);
            setEditItemId(null);
        } catch (error: any) {
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.detail || 'No se pudo crear el vínculo.',
                icon: 'error',
                background: '#0B101E',
                color: '#fff'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container fluid className="px-4 py-4 min-vh-100 position-relative">
            {/* Background Glows */}
            <div className="position-absolute top-0 end-0 w-25 h-25 bg-info rounded-circle blur-bg opacity-10" style={{ zIndex: -1, filter: 'blur(80px)' }}></div>

            <header className="mb-5 d-flex justify-content-between align-items-end flex-wrap gap-4">
                <div>
                    <h1 className="display-6 fw-bold text-white mb-2 d-flex align-items-center gap-3">
                        <div className="bg-success bg-opacity-25 p-3 rounded-circle text-success">
                            <Heart size={36} />
                        </div>
                        Familiares y Representantes
                    </h1>
                    <p className="text-white-50 ms-2 mb-0">Gestión global de personas vinculadas a los accionistas (Herederos, Apoderados, Familiares).</p>
                </div>

                <div className="d-flex gap-3 align-items-center flex-wrap">
                    <Card className="bg-glass border-glass p-1 rounded-3">
                        <Form onSubmit={handleSearch} className="d-flex gap-2">
                            <div className="position-relative">
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar..."
                                    className="glass-search-input border-0 bg-transparent text-white ps-5 py-2"
                                    style={{ width: '220px' }}
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50" size={18} />
                            </div>
                            <Button variant="primary" type="submit" className="px-3 rounded-3">
                                <Search size={18} />
                            </Button>
                        </Form>
                    </Card>
                    <Button
                        variant="success"
                        className="px-4 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
                        onClick={() => {
                            setIsEditing(false);
                            setEditItemId(null);
                            setFormData({ nombre: '', num_doc: '', tipo_doc: 'c', tipo_vinculo_id: 0, tipo_id: 0, identificacion: '', poder: false });
                            setSelectedAccionistaId('');
                            setShowModal(true);
                        }}
                    >
                        <Plus size={20} /> AGREGAR VÍNCULO
                    </Button>
                </div>
            </header>

            <Tabs defaultActiveKey="relacionados" id="tabs-vinculos" className="mb-4 custom-tabs border-0">
                <Tab eventKey="relacionados" title={
                    <div className="d-flex align-items-center gap-2 px-3 py-2">
                        <Users size={18} /> Familiares y Herederos
                        <Badge bg="success" className="ms-2 bg-opacity-10 text-success border border-success border-opacity-10">{relacionados.length}</Badge>
                    </div>
                }>
                    <Card className="bg-glass border-glass rounded-4 shadow-lg overflow-hidden mt-3">
                        <div className="table-responsive">
                            <Table hover className="glass-table mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-4">Vínculo</th>
                                        <th>Nombre Completo</th>
                                        <th>Identificación</th>
                                        <th>Accionista Relacionado</th>
                                        <th className="text-end pe-4">Opciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : relacionados.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-5 text-white-50 fst-italic">No se encontraron vinculados registrados.</td></tr>
                                    ) : relacionados.map((rel) => (
                                        <tr key={rel.id}>
                                            <td className="ps-4">
                                                <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-1">
                                                    {rel.tipo_vinculo_rel?.nombre || 'Vínculo'}
                                                </Badge>
                                            </td>
                                            <td className="fw-bold text-white fs-6">{rel.nombre}</td>
                                            <td className="text-white-50 font-monospace">{rel.num_doc || '---'}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="text-white small fw-bold">{rel.accionista?.nombre_titular}</span>
                                                    <span className="extra-small text-white-50">Socio #{rel.accionista?.numero_accionista}</span>
                                                </div>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button
                                                        variant="link"
                                                        className="text-primary p-0 hover-scale"
                                                        onClick={() => handleEdit('familiar', rel)}
                                                        title="Editar Vínculo"
                                                    >
                                                        <Edit2 size={18} className="opacity-75" />
                                                    </Button>
                                                    <Button
                                                        variant="link"
                                                        className="text-danger p-0 hover-scale"
                                                        onClick={() => handleDelete('familiar', rel)}
                                                        title="Eliminar Vínculo"
                                                    >
                                                        <Trash2 size={20} className="opacity-75" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card>
                </Tab>

                <Tab eventKey="representantes" title={
                    <div className="d-flex align-items-center gap-2 px-3 py-2">
                        <Shield size={18} /> Apoderados y Representantes
                        <Badge bg="info" className="ms-2 bg-opacity-10 text-info border border-info border-opacity-10">{representantes.length}</Badge>
                    </div>
                }>
                    <Card className="bg-glass border-glass rounded-4 shadow-lg overflow-hidden mt-3">
                        <div className="table-responsive">
                            <Table hover className="glass-table mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-4">Tipo Poder</th>
                                        <th>Nombre del Apoderado</th>
                                        <th>Identificación</th>
                                        <th>Titular de la Acción</th>
                                        <th className="text-end pe-4">Opciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                                    ) : representantes.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-5 text-white-50 fst-italic">No hay representantes registrados.</td></tr>
                                    ) : representantes.map((rep: any) => (
                                        <tr key={rep.id}>
                                            <td className="ps-4">
                                                <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-1">
                                                    {rep.tipo?.nombre || 'Apoderado'}
                                                </Badge>
                                            </td>
                                            <td className="fw-bold text-white fs-6">{rep.nombre}</td>
                                            <td className="text-white-50 font-monospace">{rep.identificacion}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="text-white small fw-bold">{rep.titular?.nombre_titular || 'Socio Titular'}</span>
                                                    <span className="extra-small text-white-50">Socio #{rep.titular?.numero_accionista || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button
                                                        variant="link"
                                                        className="text-primary p-0 hover-scale"
                                                        onClick={() => handleEdit('representante', rep)}
                                                        title="Editar Representación"
                                                    >
                                                        <Edit2 size={18} className="opacity-75" />
                                                    </Button>
                                                    <Button
                                                        variant="link"
                                                        className="text-danger p-0 hover-scale"
                                                        onClick={() => handleDelete('representante', rep)}
                                                        title="Eliminar Representación"
                                                    >
                                                        <Trash2 size={20} className="opacity-75" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card>
                </Tab>
            </Tabs>

            {/* MODAL AGREGAR VÍNCULO */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" contentClassName="modal-glass-content">
                <Modal.Header closeButton closeVariant="white" className="border-bottom border-white border-opacity-10">
                    <Modal.Title className="text-white d-flex align-items-center gap-2">
                        {isEditing ? <Edit2 size={24} className="text-primary" /> : <UserPlus size={24} className="text-success" />}
                        {isEditing ? 'EDITAR VÍNCULO EXISTENTE' : 'NUEVO VÍNCULO GLOBAL'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body className="p-4">
                        <Row className="mb-4">
                            <Col md={12}>
                                <div className="bg-glass-heavy p-3 rounded-3 mb-4 text-center">
                                    <Form.Label className="text-white-50 small fw-bold mb-3 d-block">TIPO DE VÍNCULO A REGISTRAR</Form.Label>
                                    <div className="d-flex justify-content-center gap-3">
                                        <Button
                                            variant={formType === 'familiar' ? 'success' : 'outline-light'}
                                            className={`flex-fill py-3 rounded-3 d-flex align-items-center justify-content-center gap-2 ${formType === 'familiar' ? 'shadow-lg' : 'border-opacity-10'}`}
                                            onClick={() => !isEditing && setFormType('familiar')}
                                            disabled={isEditing}
                                        >
                                            <Users size={20} /> FAMILIAR / HEREDERO
                                        </Button>
                                        <Button
                                            variant={formType === 'representante' ? 'info' : 'outline-light'}
                                            className={`flex-fill py-3 rounded-3 d-flex align-items-center justify-content-center gap-2 ${formType === 'representante' ? 'shadow-lg' : 'border-opacity-10'}`}
                                            onClick={() => !isEditing && setFormType('representante')}
                                            disabled={isEditing}
                                        >
                                            <Shield size={20} /> APODERADO / REPRESENTANTE
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={12} className="mb-4">
                                <Form.Group>
                                    <Form.Label className="text-white-50 small fw-bold">ACCIONISTA TITULAR AL QUE SE VINCULA</Form.Label>
                                    <Form.Select
                                        required
                                        className="input-glass-solid py-3"
                                        value={selectedAccionistaId}
                                        onChange={e => setSelectedAccionistaId(e.target.value ? Number(e.target.value) : '')}
                                    >
                                        <option value="">Seleccione el accionista...</option>
                                        {accionistas.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                Socio #{acc.numero_accionista} - {acc.nombre_titular}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={8} className="mb-3">
                                <Form.Group>
                                    <Form.Label className="text-white-50 small fw-bold">NOMBRE COMPLETO DE LA PERSONA</Form.Label>
                                    <Form.Control
                                        required
                                        className="input-glass-solid py-3"
                                        placeholder="Ej. Juan Pérez..."
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={4} className="mb-3">
                                <Form.Group>
                                    <Form.Label className="text-white-50 small fw-bold">TIPO VÍNCULO / PODER</Form.Label>
                                    {formType === 'familiar' ? (
                                        <Form.Select
                                            required
                                            className="input-glass-solid py-3"
                                            value={formData.tipo_vinculo_id}
                                            onChange={e => setFormData({ ...formData, tipo_vinculo_id: Number(e.target.value) })}
                                        >
                                            <option value="">Seleccione Familia...</option>
                                            {tiposVinculo.filter(v => v.grupo !== 'representante').map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <Form.Select
                                            required
                                            className="input-glass-solid py-3"
                                            value={formData.tipo_id}
                                            onChange={e => setFormData({ ...formData, tipo_id: Number(e.target.value) })}
                                        >
                                            <option value="">Seleccione Poder...</option>
                                            {tiposVinculo.filter(v => v.grupo === 'representante').map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={4} className="mb-3">
                                <Form.Group>
                                    <Form.Label className="text-white-50 small fw-bold">TIPO DOCUMENTO</Form.Label>
                                    <Form.Select
                                        className="input-glass-solid py-3"
                                        value={formData.tipo_doc}
                                        onChange={e => setFormData({ ...formData, tipo_doc: e.target.value })}
                                    >
                                        <option value="c">Cédula</option>
                                        <option value="r">RUC</option>
                                        <option value="p">Pasaporte</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={8} className="mb-3">
                                <Form.Group>
                                    <Form.Label className="text-white-50 small fw-bold">NÚMERO DE IDENTIFICACIÓN</Form.Label>
                                    <Form.Control
                                        required
                                        className="input-glass-solid py-3 font-monospace"
                                        placeholder="Ingrese número de cédula o pasaporte..."
                                        value={formType === 'familiar' ? formData.num_doc : formData.identificacion}
                                        onChange={e => setFormData(formType === 'familiar' ? { ...formData, num_doc: e.target.value } : { ...formData, identificacion: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>

                            {formType === 'representante' && (
                                <Col md={12} className="mt-2">
                                    <Form.Check
                                        type="switch"
                                        id="poder-firmado"
                                        label="Tiene poder físico firmado / notariado"
                                        className="text-white fw-bold"
                                        checked={formData.poder}
                                        onChange={e => setFormData({ ...formData, poder: e.target.checked })}
                                    />
                                </Col>
                            )}
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-top border-white border-opacity-10 p-3">
                        <Button variant="outline-light" onClick={() => setShowModal(false)} className="px-4 py-2 opacity-75">
                            CANCELAR
                        </Button>
                        <Button variant={isEditing ? "primary" : "success"} type="submit" className="px-5 py-2 fw-bold" disabled={saving}>
                            {saving ? <Spinner animation="border" size="sm" className="me-2" /> : isEditing ? <Edit2 size={18} className="me-2" /> : <UserPlus size={18} className="me-2" />}
                            {isEditing ? 'ACTUALIZAR DATOS' : 'GUARDAR VÍNCULO'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Familiares_Page;
