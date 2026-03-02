import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Table, Modal, Form, Spinner, Tabs, Tab, Badge, Row, Col } from 'react-bootstrap';
import { Trash2, Shield, Users, Save, X, Plus, Edit } from 'lucide-react';
import {
    listarRolesSistema, crearRolSistema, eliminarRolSistema, actualizarRolSistema,
    listarTiposVinculo, crearTipoVinculo, eliminarTipoVinculo, actualizarTipoVinculo,
} from '../../services/roles.service';
import type { RolSistema, TipoVinculo } from '../../services/roles.service';
import { MENU_STRUCTURE } from '../../config/menu.config';
import Swal from 'sweetalert2';

export const RolesPage: React.FC = () => {
    // ESTADOS DE DATOS
    const [roles, setRoles] = useState<RolSistema[]>([]);
    const [vinculos, setVinculos] = useState<TipoVinculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('sistema');
    const [error, setError] = useState<string | null>(null);

    // ESTADOS MODALES SITEMA
    const [showSistModal, setShowSistModal] = useState(false);
    const [editingRol, setEditingRol] = useState<RolSistema | null>(null);
    const [formDataSist, setFormDataSist] = useState<{ nombre: string, permisos: Record<string, boolean> }>({
        nombre: '',
        permisos: {}
    });

    // ESTADOS MODALES VINCULOS
    const [showVincModal, setShowVincModal] = useState(false);
    const [editingVinculo, setEditingVinculo] = useState<TipoVinculo | null>(null);
    const [formDataVinc, setFormDataVinc] = useState({
        nombre: '',
        abreviatura: '',
        descripcion: '',
        grupo: 'familiar'
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        if (roles.length > 0 || vinculos.length > 0) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const [ro, vi] = await Promise.all([listarRolesSistema(), listarTiposVinculo()]);
            setRoles(ro);
            setVinculos(vi);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al cargar los datos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalizedPerms = { ...formDataSist.permisos };

            // Si es admin, forzar todos los permisos a true basados en el MENU_STRUCTURE
            if (formDataSist.nombre.toLowerCase() === 'admin') {
                const forceAll = (items: any[]) => {
                    items.forEach(item => {
                        finalizedPerms[item.key] = true;
                        if (item.subItems) forceAll(item.subItems);
                    });
                };
                forceAll(MENU_STRUCTURE);
            }

            const dataToSave = {
                ...formDataSist,
                permisos: finalizedPerms
            };

            if (editingRol) {
                await actualizarRolSistema(editingRol.id, dataToSave);
            } else {
                await crearRolSistema(dataToSave);
            }
            setShowSistModal(false);
            setEditingRol(null);
            setFormDataSist({ nombre: '', permisos: {} });
            cargarDatos();
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.detail || 'Error al procesar rol', 'error');
        }
    };

    const handleDeleteSist = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: '¿Desea eliminar este Rol del sistema?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        try {
            await eliminarRolSistema(id);
            cargarDatos();
            Swal.fire({
                title: 'Eliminado',
                text: 'El rol ha sido eliminado.',
                icon: 'success',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.detail || 'Error al eliminar rol', 'error');
        }
    };

    const handleChangeSist = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormDataSist(prev => ({
                ...prev,
                permisos: { ...prev.permisos, [name]: checked }
            }));
        } else {
            setFormDataSist(prev => ({ ...prev, [name]: value }));
        }
    };

    // --- ACCIONES VÍNCULOS ACCIONISTAS ---
    const handleVincSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVinculo) {
                await actualizarTipoVinculo(editingVinculo.id, formDataVinc);
            } else {
                await crearTipoVinculo(formDataVinc);
            }
            setShowVincModal(false);
            setEditingVinculo(null);
            setFormDataVinc({ nombre: '', abreviatura: '', descripcion: '', grupo: 'familiar' });
            cargarDatos();
            Swal.fire({
                title: '¡Éxito!',
                text: `Vínculo ${editingVinculo ? 'actualizado' : 'creado'} correctamente.`,
                icon: 'success',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.detail || 'Error al procesar vínculo', 'error');
        }
    };

    const handleDeleteVinc = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: 'Se eliminará este tipo de vínculo permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cerrar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (!result.isConfirmed) return;

        try {
            await eliminarTipoVinculo(id);
            cargarDatos();
            Swal.fire({
                title: 'Eliminado',
                text: 'El vínculo ha sido borrado.',
                icon: 'success',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.detail || 'No se puede eliminar porque está siendo usado.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <Container fluid className="px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-main mb-0" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={32} className="text-primary" />
                    Gestión de Roles y Vínculos
                    {refreshing && <Spinner animation="border" size="sm" className="ms-3 text-primary" />}
                </h2>
            </div>

            {error && <div className="alert alert-danger bg-danger bg-opacity-10 border-danger text-danger">{error}</div>}

            <Card className="bg-glass border-glass rounded-4 overflow-hidden mb-4">
                <Card.Body className="p-4">
                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'sistema')} className="mb-4 profile-tabs custom-tabs">
                        <Tab eventKey="sistema" title={<span><Shield size={18} className="me-2" />Roles de Accesos</span>}>
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="primary" onClick={() => setShowSistModal(true)} className="d-flex align-items-center rounded-pill">
                                    <Plus size={18} className="me-2" /> Añadir Rol
                                </Button>
                            </div>
                            <div className="glass-table-container shadow-lg">
                                <Table responsive hover className="glass-table align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre del Rol</th>
                                            <th className="text-center">Permisos de Módulos (Sidebar)</th>
                                            <th className="text-end">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.map(r => (
                                            <tr key={r.id}>
                                                <td><span className="text-dim">#{r.id}</span></td>
                                                <td><span className="fw-bold text-main">{r.nombre.toUpperCase()}</span></td>
                                                <td className="text-center">
                                                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                                                        {Object.entries(r.permisos || {}).map(([key, val]) => {
                                                            if (!val) return null;
                                                            // Buscar el título en el MENU_STRUCTURE
                                                            const findTitle = (items: any[]): string | undefined => {
                                                                for (const it of items) {
                                                                    if (it.key === key) return it.title;
                                                                    if (it.subItems) {
                                                                        const t = findTitle(it.subItems);
                                                                        if (t) return t;
                                                                    }
                                                                }
                                                            };
                                                            const label = findTitle(MENU_STRUCTURE) || key;
                                                            return (
                                                                <span key={key} className="badge-glass-primary px-2 py-1 text-uppercase" style={{ fontSize: '0.65rem' }}>
                                                                    {label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <Button
                                                            variant="outline-primary"
                                                            onClick={() => {
                                                                setEditingRol(r);
                                                                setFormDataSist({
                                                                    nombre: r.nombre,
                                                                    permisos: r.permisos || {}
                                                                });
                                                                setShowSistModal(true);
                                                            }}
                                                            className="btn-circle-action border-primary text-primary ms-auto"
                                                        >
                                                            <Edit size={16} />
                                                        </Button>
                                                        {r.nombre.toLowerCase() !== 'admin' && (
                                                            <Button
                                                                variant="outline-danger"
                                                                onClick={() => handleDeleteSist(r.id)}
                                                                className="btn-circle-action border-danger text-danger"
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {roles.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-dim py-4">No hay roles definidos</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Tab>

                        <Tab eventKey="vinculos" title={<span><Users size={18} className="me-2" />Vínculos de Accionistas</span>}>
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="success" onClick={() => setShowVincModal(true)} className="d-flex align-items-center rounded-pill">
                                    <Plus size={18} className="me-2" /> Añadir Vínculo
                                </Button>
                            </div>
                            <div className="glass-table-container shadow-lg">
                                <Table responsive hover className="glass-table align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre del Vínculo</th>
                                            <th>Abrev.</th>
                                            <th>Categoría</th>
                                            <th>Descripción</th>
                                            <th className="text-end">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vinculos.map(v => (
                                            <tr key={v.id}>
                                                <td><span className="text-dim">#{v.id}</span></td>
                                                <td><span className="fw-bold text-info" style={{ letterSpacing: '0.01em' }}>{v.nombre}</span></td>
                                                <td><Badge bg="secondary" className="bg-opacity-25 text-dim">{v.abreviatura || '---'}</Badge></td>
                                                <td>
                                                    <div className="d-flex gap-1 flex-wrap">
                                                        {(v.grupo || '').split(',').map(g => (
                                                            <span key={g} className={`badge-glass-${g === 'representante' ? 'info' : 'success'} p-1 px-3`} style={{ fontSize: '0.65rem' }}>
                                                                {g === 'representante' ? 'REPRESENTANTES' : 'FAMILIARES'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td><span className="text-dim">{v.descripcion || 'Sin descripción'}</span></td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <Button
                                                            variant="outline-primary"
                                                            onClick={() => {
                                                                setEditingVinculo(v);
                                                                setFormDataVinc({
                                                                    nombre: v.nombre,
                                                                    abreviatura: v.abreviatura || '',
                                                                    descripcion: v.descripcion || '',
                                                                    grupo: (v.grupo as any) || 'familiar'
                                                                });
                                                                setShowVincModal(true);
                                                            }}
                                                            className="btn-circle-action border-primary text-primary ms-auto"
                                                        >
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            onClick={() => handleDeleteVinc(v.id)}
                                                            className="btn-circle-action border-danger text-danger"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {vinculos.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center text-dim py-4">No hay vínculos definidos</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* MODAL CREAR ROL SISTEMA */}
            <Modal show={showSistModal} onHide={() => setShowSistModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton className="border-bottom-glass pb-3">
                    <Modal.Title className="text-main d-flex align-items-center">
                        <Shield className="me-2 text-primary" size={24} /> {editingRol ? 'Editar Rol' : 'Crear Nuevo Rol'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSistSubmit}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="text-dim small mb-2 text-uppercase letter-spacing-1">Nombre del Rol</Form.Label>
                            <Form.Control
                                type="text"
                                name="nombre"
                                value={formDataSist.nombre}
                                onChange={handleChangeSist}
                                required
                                className="input-glass-solid"
                                placeholder="Ej. Auditor, Digitador..."
                            />
                        </Form.Group>
                        <h6 className="text-main mb-3">Permisos de Accesos al Sidebar:</h6>
                        <div className="d-flex flex-column gap-3 text-dim">
                            {MENU_STRUCTURE.map(item => (
                                <div key={item.key} className="mb-1">
                                    <Form.Check
                                        type="switch"
                                        label={<span className="fw-bold text-main">{item.title}</span>}
                                        name={item.key}
                                        checked={formDataSist.nombre.toLowerCase() === 'admin' ? true : !!formDataSist.permisos[item.key]}
                                        onChange={handleChangeSist}
                                        disabled={formDataSist.nombre.toLowerCase() === 'admin'}
                                    />
                                    {item.subItems && (
                                        <div className="ps-4 mt-2 d-flex flex-column gap-2 border-start border-main-opacity ms-2">
                                            {item.subItems.map(sub => (
                                                <Form.Check
                                                    key={sub.key}
                                                    type="switch"
                                                    label={sub.title}
                                                    name={sub.key}
                                                    checked={formDataSist.nombre.toLowerCase() === 'admin' ? true : !!formDataSist.permisos[sub.key]}
                                                    onChange={handleChangeSist}
                                                    disabled={formDataSist.nombre.toLowerCase() === 'admin'}
                                                    className="small"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Modal.Body>
                    <Modal.Footer className="border-top-glass pt-3">
                        <Button variant="outline-light" onClick={() => setShowSistModal(false)} className="border-glass rounded-pill px-4 text-main">
                            <X size={18} className="me-2 text-dim" /> Cancelar
                        </Button>
                        <Button variant="primary" type="submit" className="rounded-pill px-4">
                            <Save size={18} className="me-2" /> {editingRol ? 'Actualizar Cambios' : 'Guardar Rol'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL CREAR VINCULO */}
            <Modal show={showVincModal} onHide={() => { setShowVincModal(false); setEditingVinculo(null); }} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton className="border-bottom-glass pb-3">
                    <Modal.Title className="text-main d-flex align-items-center">
                        <Users className="me-2 text-success" size={24} /> {editingVinculo ? 'Editar Vínculo' : 'Crear Nuevo Vínculo'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVincSubmit}>
                    <Modal.Body className="pt-4">
                        <Row>
                            <Col md={8}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="text-dim small mb-2 text-uppercase letter-spacing-1">Nombre del Vínculo</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="nombre"
                                        value={formDataVinc.nombre}
                                        onChange={(e) => setFormDataVinc({ ...formDataVinc, nombre: e.target.value })}
                                        required
                                        className="input-glass-solid"
                                        placeholder="Ej. Hijo, Heredero, Administrador..."
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="text-dim small mb-2 text-uppercase letter-spacing-1">Abreviatura</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="abreviatura"
                                        value={formDataVinc.abreviatura}
                                        onChange={(e) => setFormDataVinc({ ...formDataVinc, abreviatura: e.target.value.toUpperCase() })}
                                        className="input-glass-solid text-center fw-bold"
                                        placeholder="EJ. AC, H, RL"
                                        maxLength={10}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-4">
                            <Form.Label className="text-dim small mb-2 text-uppercase letter-spacing-1">Grupos o Categorías</Form.Label>
                            <div className="d-flex gap-4 p-3 bg-surface rounded-3 border border-main-opacity">
                                <Form.Check
                                    type="checkbox"
                                    label={<span className="text-main fw-bold">Familiares / Herederos</span>}
                                    id="grp-familiar"
                                    checked={(formDataVinc.grupo || '').includes('familiar')}
                                    onChange={(e) => {
                                        let groups = (formDataVinc.grupo || '').split(',').filter(g => g !== '');
                                        if (e.target.checked) {
                                            if (!groups.includes('familiar')) groups.push('familiar');
                                        } else {
                                            groups = groups.filter(g => g !== 'familiar');
                                        }
                                        setFormDataVinc({ ...formDataVinc, grupo: groups.join(',') });
                                    }}
                                />
                                <Form.Check
                                    type="checkbox"
                                    label={<span className="text-main fw-bold">Apoderados / Representantes</span>}
                                    id="grp-representante"
                                    checked={(formDataVinc.grupo || '').includes('representante')}
                                    onChange={(e) => {
                                        let groups = (formDataVinc.grupo || '').split(',').filter(g => g !== '');
                                        if (e.target.checked) {
                                            if (!groups.includes('representante')) groups.push('representante');
                                        } else {
                                            groups = groups.filter(g => g !== 'representante');
                                        }
                                        setFormDataVinc({ ...formDataVinc, grupo: groups.join(',') });
                                    }}
                                />
                            </div>
                            <Form.Text className="text-dim opacity-75 small mt-2 d-block">
                                Seleccione una o ambas categorías. Define en qué listados aparecerá este vínculo.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="text-dim small mb-2 text-uppercase letter-spacing-1">Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="descripcion"
                                value={formDataVinc.descripcion}
                                onChange={(e) => setFormDataVinc({ ...formDataVinc, descripcion: e.target.value })}
                                className="input-glass-solid"
                                placeholder="Opcional. Breve detalle de uso."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-top-glass pt-3">
                        <Button variant="outline-light" onClick={() => { setShowVincModal(false); setEditingVinculo(null); }} className="border-glass rounded-pill px-4 text-main">
                            <X size={18} className="me-2 text-dim" /> Cancelar
                        </Button>
                        <Button variant="success" type="submit" className="rounded-pill px-4 text-white">
                            <Save size={18} className="me-2" /> {editingVinculo ? 'Actualizar Vínculo' : 'Guardar Vínculo'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <style>{`
                .custom-tabs .nav-link {
                    color: var(--text-dim);
                    border: none;
                    border-bottom: 2px solid transparent;
                    padding: 1rem 1.5rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                .custom-tabs .nav-link:hover {
                    color: var(--text-main);
                    border-color: var(--glass-border);
                }
                .custom-tabs .nav-link.active {
                    color: var(--text-main);
                    background: transparent;
                    border-bottom: 2px solid var(--primary-accent);
                }
                .btn-circle-action {
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50% !important;
                    padding: 0 !important;
                    transition: all 0.2s ease;
                    background: var(--bg-surface);
                }
                .btn-circle-action:hover {
                    background: var(--bg-card-solid);
                    transform: scale(1.05);
                }
                .btn-circle-action.border-danger:hover {
                    background: rgba(220, 53, 69, 0.1);
                }
                .input-glass-solid {
                    background-color: var(--bg-surface) !important;
                    border: 1px solid var(--glass-border) !important;
                    color: var(--text-main) !important;
                    border-radius: 0.5rem !important;
                    padding: 0.6rem 1rem !important;
                }
                .input-glass-solid:focus {
                    background-color: var(--bg-card-solid) !important;
                    border-color: var(--primary-accent) !important;
                    box-shadow: 0 0 0 4px var(--primary-accent-opacity) !important;
                    outline: none !important;
                }
                textarea.input-glass-solid {
                    min-height: 100px;
                    background-color: var(--bg-surface) !important;
                }
            `}</style>
        </Container>
    );
};
export default RolesPage;
