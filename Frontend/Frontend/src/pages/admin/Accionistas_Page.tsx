import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Card, Button, Table, Modal,
    Form, Spinner, Badge, Row, Col
} from 'react-bootstrap';
import {
    Search, Plus, Download, Upload,
    Users, Trash2, Edit
} from 'lucide-react';
import {
    listarAccionistas, eliminarAccionista,
    descargarPlantilla, importarAccionistas, agregarRelacionado,
    limpiarAccionistas, eliminarRelacionado, agregarRepresentante,
    eliminarRepresentante, listarTiposRepresentacion
} from '../../services/accionistas.service';
import type { Accionista, PersonaRelacionadaCreate, RepresentanteCreate, TipoRepresentacion } from '../../services/accionistas.service';
import Swal from 'sweetalert2';
import { ShareholderFormModal } from '../../components/Admin/ShareholderFormModal';
import { listarTiposVinculo } from '../../services/roles.service';
import type { TipoVinculo } from '../../services/roles.service';

export const AccionistasPage: React.FC = () => {
    // ESTADOS DE DATOS
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [tiposVinculo, setTiposVinculo] = useState<TipoVinculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // ESTADOS MODALES
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRelModal, setShowRelModal] = useState(false);
    const [selectedAccionista, setSelectedAccionista] = useState<Accionista | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

    const [formRel, setFormRel] = useState<PersonaRelacionadaCreate>({
        nombre: '',
        tipo_doc: 'c',
        num_doc: '',
        tipo_vinculo_id: 0
    });

    const [showRepModal, setShowRepModal] = useState(false);
    const [tiposRepresentacion, setTiposRepresentacion] = useState<TipoRepresentacion[]>([]);
    const [formRep, setFormRep] = useState<RepresentanteCreate>({
        nombre: '',
        identificacion: '',
        tipo_id: 0,
        tiene_poder_firmado: true
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [accs, vincs, reps] = await Promise.all([
                listarAccionistas(),
                listarTiposVinculo(),
                listarTiposRepresentacion()
            ]);
            setAccionistas(accs);
            setTiposVinculo(vincs);
            setTiposRepresentacion(reps);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const results = await listarAccionistas(busqueda);
            setAccionistas(results);
        } catch (error) {
            console.error('Error en búsqueda:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const stats = {
        totalSocios: accionistas.length,
        totalAcciones: accionistas.reduce((acc, curr) => acc + (curr.total_acciones || 0), 0),
        totalPorcentaje: accionistas.reduce((acc, curr) => acc + (curr.porcentaje_base || 0), 0).toFixed(2)
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await importarAccionistas(file);
            alert(res.mensaje);
            cargarDatos();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al importar');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLimpiarBase = async () => {
        const result = await Swal.fire({
            title: '¿Estás SEGURO?',
            text: "Se borrará TODA la base de accionistas del periodo. Esta acción no se puede deshacer y borrará también representantes, asistencias y vinculados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, borrar todo',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const res = await limpiarAccionistas();
            Swal.fire({
                title: '¡Éxito!',
                text: res.mensaje,
                icon: 'success',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
            cargarDatos();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al limpiar la base');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-main mb-0 d-flex align-items-center gap-2">
                    <Users size={32} className="text-primary" />
                    Gestión de Accionistas
                </h2>
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-danger"
                        className="d-flex align-items-center gap-2 border-danger border-opacity-25"
                        onClick={handleLimpiarBase}
                    >
                        <Trash2 size={18} />
                        Borrar Todo
                    </Button>
                    <Button
                        variant="outline-primary"
                        onClick={descargarPlantilla}
                        className="d-flex align-items-center gap-2 border-primary border-opacity-25"
                    >
                        <Download size={18} />
                        <span className="d-none d-md-inline">Plantilla</span>
                    </Button>
                    <Button variant="outline-success" onClick={() => fileInputRef.current?.click()} className="d-flex align-items-center px-3">
                        <Upload size={18} className="me-2" /> Importar
                        <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.csv" />
                    </Button>
                    <Button variant="primary" onClick={() => { setSelectedAccionista(null); setShowCreateModal(true); }} className="d-flex align-items-center px-3">
                        <Plus size={18} className="me-2" /> Alta Manual
                    </Button>
                </div>
            </div>

            <Row className="mb-4 g-3">
                <Col md={4}>
                    <Card className="stat-card-glass h-100 p-3">
                        <div className="text-dim small text-uppercase mb-1">Total Accionistas</div>
                        <div className="h3 mb-0 text-main fw-bold">{stats.totalSocios}</div>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="stat-card-glass h-100 p-3">
                        <div className="text-dim small text-uppercase mb-1">Total Acciones</div>
                        <div className="h3 mb-0 text-info fw-bold">{stats.totalAcciones.toLocaleString()}</div>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="stat-card-glass h-100 p-3">
                        <div className="text-dim small text-uppercase mb-1">% Accionariado Base</div>
                        <div className={`h3 mb-0 fw-bold ${parseFloat(stats.totalPorcentaje) > 100 ? 'text-danger' : 'text-success'}`}>
                            {stats.totalPorcentaje}%
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card className="bg-glass border-glass mb-4">
                <Card.Body className="p-3">
                    <Form onSubmit={handleSearch}>
                        <div className="position-relative">
                            <Search className="search-icon-wrapper" size={20} />
                            <Form.Control
                                type="text"
                                placeholder="Buscar por Nombre, Cédula o Número..."
                                className="glass-search-input"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            <div className="glass-table-container">
                <Table responsive hover className="glass-table align-middle">
                    <thead>
                        <tr>
                            <th className="ps-4 text-dim">#</th>
                            <th className="text-dim">Accionista</th>
                            <th className="text-dim">Identificación</th>
                            <th className="text-dim">Correo</th>
                            <th className="text-center text-dim">Acciones</th>
                            <th className="text-center text-dim">%</th>
                            <th className="text-end pe-4 text-dim">Opciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !accionistas.length ? (
                            <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                        ) : accionistas.map(acc => (
                            <React.Fragment key={acc.id}>
                                <tr>
                                    <td className="ps-4 text-dim">{acc.numero_accionista}</td>
                                    <td>
                                        <div className="d-flex align-items-center cursor-pointer" onClick={() => toggleRow(acc.id)}>
                                            <span className="fw-bold text-main">{acc.nombre_titular}</span>
                                        </div>
                                    </td>
                                    <td className="text-dim">{acc.num_doc}</td>
                                    <td className="text-dim small">{acc.correo || <span className="text-dim opacity-50 fst-italic">Sin correo</span>}</td>
                                    <td className="text-center text-info fw-bold">{acc.total_acciones?.toLocaleString()}</td>
                                    <td className="text-center"><Badge bg="primary" className="bg-opacity-10 text-primary">{acc.porcentaje_base}%</Badge></td>
                                    <td className="text-end pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Button
                                                variant="link"
                                                className="btn-circle-action p-0"
                                                onClick={() => { setSelectedAccionista(acc); setShowCreateModal(true); }}
                                                title="Editar Datos"
                                            >
                                                <Edit size={16} className="text-main opacity-75" />
                                            </Button>
                                            <Button
                                                variant="link"
                                                className="btn-circle-action p-0"
                                                style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                                onClick={async () => {
                                                    const res = await Swal.fire({
                                                        title: '¿Eliminar Accionista?',
                                                        text: `¿Seguro que desea eliminar a ${acc.nombre_titular}?`,
                                                        icon: 'warning',
                                                        showCancelButton: true,
                                                        confirmButtonColor: '#ef4444',
                                                        confirmButtonText: 'Sí, eliminar',
                                                        background: 'var(--bg-card-solid)',
                                                        color: 'var(--text-main)'
                                                    });
                                                    if (res.isConfirmed) {
                                                        await eliminarAccionista(acc.id);
                                                        cargarDatos();
                                                    }
                                                }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} className="text-danger opacity-75" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedRows[acc.id] && (
                                    <tr>
                                        <td colSpan={7} className="ps-5 py-4 border-start border-primary border-4 bg-glass-heavy">
                                            <Row>
                                                <Col md={6}>
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="text-primary small text-uppercase mb-0 fw-bold">Vínculos Familiares y Herederos:</h6>
                                                        <Button variant="outline-success" size="sm" className="py-0 px-2 small" onClick={() => { setSelectedAccionista(acc); setShowRelModal(true); }}>
                                                            <Plus size={14} /> Agregar
                                                        </Button>
                                                    </div>
                                                    <div className="d-flex flex-column gap-2">
                                                        {acc.relacionados?.map(rel => (
                                                            <div key={rel.id} className="d-flex justify-content-between align-items-center bg-surface p-2 rounded-3 border border-main-opacity">
                                                                <span className="small text-main">{rel.nombre} <Badge bg="info" className="bg-opacity-10 text-info ms-1">{rel.tipo_vinculo_rel?.nombre}</Badge></span>
                                                                <Button variant="link" className="text-danger p-0 ms-2" onClick={() => eliminarRelacionado(acc.id, rel.id).then(cargarDatos)}><Trash2 size={14} /></Button>
                                                            </div>
                                                        ))}
                                                        {(!acc.relacionados || acc.relacionados.length === 0) && <span className="text-dim small italic opacity-50 fst-italic">Sin familiares vinculados.</span>}
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="text-warning small text-uppercase mb-0 fw-bold">Representantes y Apoderados:</h6>
                                                        <Button variant="outline-warning" size="sm" className="py-0 px-2 small" onClick={() => { setSelectedAccionista(acc); setShowRepModal(true); }}>
                                                            <Plus size={14} /> Agregar
                                                        </Button>
                                                    </div>
                                                    <div className="d-flex flex-column gap-2">
                                                        {acc.representantes?.map(rep => (
                                                            <div key={rep.id} className="d-flex justify-content-between align-items-center bg-surface p-2 rounded-3 border border-main-opacity">
                                                                <div className="d-flex flex-column">
                                                                    <span className="small text-main fw-bold">{rep.nombre}</span>
                                                                    <span className="extra-small text-dim">{rep.identificacion} - {rep.tipo_representacion}</span>
                                                                </div>
                                                                <Button variant="link" className="text-danger p-0 ms-2" onClick={() => eliminarRepresentante(acc.id, rep.id).then(cargarDatos)}><Trash2 size={14} /></Button>
                                                            </div>
                                                        ))}
                                                        {(!acc.representantes || acc.representantes.length === 0) && <span className="text-dim small italic opacity-50 fst-italic">Sin representantes registrados.</span>}
                                                    </div>
                                                </Col>
                                            </Row>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* MODAL CREAR/EDITAR VÍNCULO */}
            <Modal show={showRelModal} onHide={() => setShowRelModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton closeVariant="white" className="border-bottom-glass">
                    <Modal.Title className="text-main small text-uppercase">Vincular a: {selectedAccionista?.nombre_titular}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={async (e) => { e.preventDefault(); await agregarRelacionado(selectedAccionista!.id, formRel); setShowRelModal(false); cargarDatos(); }}>
                    <Modal.Body className="p-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="text-dim small fw-bold">NOMBRE COMPLETO</Form.Label>
                            <Form.Control required className="input-glass-solid" value={formRel.nombre} onChange={e => setFormRel({ ...formRel, nombre: e.target.value })} />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-dim small fw-bold">TIPO DOC</Form.Label>
                                    <Form.Select className="input-glass-solid" value={formRel.tipo_doc} onChange={e => setFormRel({ ...formRel, tipo_doc: e.target.value })}>
                                        <option value="c">Cédula</option>
                                        <option value="r">RUC</option>
                                        <option value="p">Pasaporte</option>
                                        <option value="e">Exterior</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-dim small fw-bold">NÚMERO DOC</Form.Label>
                                    <Form.Control required className="input-glass-solid" value={formRel.num_doc} onChange={e => setFormRel({ ...formRel, num_doc: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group>
                            <Form.Label className="text-dim small fw-bold">VÍNCULO</Form.Label>
                            <Form.Select required className="input-glass-solid" value={formRel.tipo_vinculo_id} onChange={e => setFormRel({ ...formRel, tipo_vinculo_id: parseInt(e.target.value) })}>
                                <option value="">Seleccione tipo...</option>
                                {tiposVinculo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-top-glass">
                        <Button variant="outline-light" onClick={() => setShowRelModal(false)} className="border-glass text-main">Cerrar</Button>
                        <Button variant="primary" type="submit">Guardar Vínculo</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL CREAR REPRESENTANTE */}
            <Modal show={showRepModal} onHide={() => setShowRepModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton closeVariant="white" className="border-bottom-glass">
                    <Modal.Title className="text-main small text-uppercase">Agregar Representante a: {selectedAccionista?.nombre_titular}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!formRep.tipo_id) return Swal.fire({
                        title: 'Error',
                        text: 'Debe seleccionar un tipo de poder',
                        icon: 'error',
                        background: 'var(--bg-card-solid)',
                        color: 'var(--text-main)'
                    });
                    await agregarRepresentante(selectedAccionista!.id, formRep);
                    setShowRepModal(false);
                    cargarDatos();
                    setFormRep({ nombre: '', identificacion: '', tipo_id: 0, tiene_poder_firmado: true });
                }}>
                    <Modal.Body className="p-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="text-dim small fw-bold">NOMBRE DEL REPRESENTANTE</Form.Label>
                            <Form.Control required className="input-glass-solid" value={formRep.nombre} onChange={e => setFormRep({ ...formRep, nombre: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-dim small fw-bold">IDENTIFICACIÓN</Form.Label>
                            <Form.Control required className="input-glass-solid" value={formRep.identificacion} onChange={e => setFormRep({ ...formRep, identificacion: e.target.value })} />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label className="text-dim small fw-bold">TIPO DE PODER / VÍNCULO</Form.Label>
                            <Form.Select required className="input-glass-solid" value={formRep.tipo_id} onChange={e => setFormRep({ ...formRep, tipo_id: Number(e.target.value) })}>
                                <option value="">Seleccione...</option>
                                {tiposRepresentacion.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-top-glass">
                        <Button variant="outline-light" onClick={() => setShowRepModal(false)} className="border-glass text-main">Cerrar</Button>
                        <Button variant="primary" type="submit">Guardar Representante</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL GESTIÓN ACCIONISTA (ALTA/EDICIÓN) */}
            <ShareholderFormModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onSuccess={cargarDatos}
                editData={selectedAccionista}
            />
        </Container>
    );
};

export default AccionistasPage;
