import React, { useState, useEffect } from 'react';
import {
    Container, Card, Button, Table, Modal,
    Form, Spinner, Badge, Row, Col
} from 'react-bootstrap';
import {
    UserCheck, CheckCircle, Search,
    X, CheckSquare
} from 'lucide-react';
import {
    listarAccionistas, registrarAsistencia, eliminarAsistencia
} from '../../services/accionistas.service';
import type { Accionista, AsistenciaCreate } from '../../services/accionistas.service';
import { configService, type AsambleaConfig } from '../../services/config.service';
import Swal from 'sweetalert2';

export const AsistenciaPage: React.FC = () => {
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [showAsisModal, setShowAsisModal] = useState(false);
    const [selectedAccionista, setSelectedAccionista] = useState<Accionista | null>(null);
    const [config, setConfig] = useState<AsambleaConfig | null>(null);
    const [busquedaRepresentados, setBusquedaRepresentados] = useState('');

    const capitalizeWords = (str: string) => {
        return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
    };

    const [formAsis, setFormAsis] = useState<AsistenciaCreate & { tipo_doc?: string }>({
        numero_accionista: 0,
        numeros_accionista: [],
        asistio: true,
        fuera_de_quorum: false,
        asistente_identificacion: '',
        asistente_nombre: '',
        tipo_doc: 'c',
        es_titular: true,
        observaciones: ''
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [data, conf] = await Promise.all([
                listarAccionistas(busqueda),
                configService.getAsambleaConfig()
            ]);
            setAccionistas(data);
            setConfig(conf);
        } catch (error) {
            console.error('Error cargando datos para asistencia:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleAsisSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await registrarAsistencia(formAsis);
            setShowAsisModal(false);
            cargarDatos();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al registrar asistencia');
        }
    };

    const handleRestablecerAsistencias = async () => {
        const result = await Swal.fire({
            title: '¿Restablecer TODAS las asistencias?',
            text: 'ATENCIÓN: Esto borrará todos los registros de entrada actuales, dejando a todos los accionistas como Ausentes. El proceso es irreversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, borrar todo',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card-solid)',
            color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                // Haremos la llamada directa usando axios, o añadiremos la función en accionistas.service
                const axios = (await import('axios')).default;
                const { authService } = await import('../../services/auth.service');
                const user = authService.getCurrentUser();
                // 1. Restablecer Asistencias
                await axios.delete(`${import.meta.env.VITE_API_URL}/asistencia/restablecer-todas`, {
                    headers: { Authorization: `Bearer ${user.access_token}` }
                });

                // 2. Restablecer Votos (NUEVO)
                await axios.delete(`${import.meta.env.VITE_API_URL}/votaciones/restablecer-todos`, {
                    headers: { Authorization: `Bearer ${user.access_token}` }
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Sistema Restablecido',
                    text: 'Se han eliminado todos los registros de asistencia y votación.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)',
                    timer: 2000,
                    showConfirmButton: false
                });
                cargarDatos();
            } catch (error: any) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.detail || 'No se pudo restablecer las asistencias.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)'
                });
                setLoading(false);
            }
        }
    };

    return (
        <Container fluid className="px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div className="d-flex align-items-center gap-4">
                    <h2 className="text-main mb-0 d-flex align-items-center gap-2">
                        <CheckSquare size={32} className="text-primary" />
                        Registro de Entrada
                    </h2>

                    {/* INDICADOR DE QUÓRUM EN TIEMPO REAL */}
                    {!loading && (
                        <div className="bg-glass border-glass px-4 py-2 rounded-pill d-flex align-items-center gap-3 shadow-lg">
                            <div className="d-flex flex-column">
                                <span className="text-dim lh-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Quórum Actual</span>
                                <span className="text-info fw-bold fs-4 lh-base">
                                    {accionistas
                                        .filter(a => a.asistencias && a.asistencias.length > 0)
                                        .reduce((acc, curr) => acc + (curr.porcentaje_base || 0), 0)
                                        .toFixed(2)}%
                                </span>
                            </div>
                            <div className="vr opacity-25" style={{ height: '30px' }}></div>
                            <div className="d-flex flex-column">
                                <span className="text-dim lh-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Presentes</span>
                                <span className="text-main fw-bold fs-5 lh-base">
                                    {accionistas.filter(a => a.asistencias && a.asistencias.length > 0).length}
                                    <small className="text-dim fw-normal ms-1" style={{ fontSize: '0.8rem' }}>/ {accionistas.length}</small>
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <Button
                    variant="outline-danger"
                    className="d-flex align-items-center gap-2"
                    onClick={handleRestablecerAsistencias}
                >
                    <X size={18} />
                    Restablecer Asistencias
                </Button>
            </div>

            <Card className="bg-glass border-glass mb-4">
                <Card.Body className="p-3">
                    <Form onSubmit={(e) => { e.preventDefault(); cargarDatos(); }}>
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
                <Table responsive hover className="glass-table align-middle text-nowrap">
                    <thead>
                        <tr>
                            <th className="ps-4 text-dim">#</th>
                            <th className="text-dim">ACCIONISTA</th>
                            <th className="text-dim">IDENTIFICACIÓN</th>
                            <th className="text-center text-dim">ACCIONES</th>
                            <th className="text-center text-dim">%</th>
                            <th className="text-dim">ESTADO</th>
                            <th className="text-end pe-4 text-dim">ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                        ) : accionistas.map(acc => {
                            const estaPresente = acc.asistencias && acc.asistencias.length > 0;
                            return (
                                <tr key={acc.id}>
                                    <td className="ps-4 text-dim">{acc.numero_accionista}</td>
                                    <td className="fw-bold text-main">{acc.nombre_titular}</td>
                                    <td className="text-dim">{acc.num_doc}</td>
                                    <td className="text-center text-info fw-bold">{acc.total_acciones}</td>
                                    <td className="text-center text-dim">{acc.porcentaje_base}%</td>
                                    <td>
                                        {estaPresente ? (
                                            <Badge bg="success" className="bg-opacity-25 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">
                                                PRESENTE
                                            </Badge>
                                        ) : (
                                            <Badge bg="secondary" className="bg-opacity-10 text-dim border border-secondary border-opacity-25 px-3 py-2 rounded-pill">
                                                AUSENTE
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="text-end pe-4">
                                        {estaPresente ? (
                                            <Button
                                                variant="outline-danger"
                                                className="btn-circle-action"
                                                onClick={() => eliminarAsistencia(acc.numero_accionista).then(cargarDatos)}
                                                title="Quitar Asistencia"
                                            >
                                                <X size={18} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline-success"
                                                className="btn-circle-action"
                                                onClick={() => {
                                                    // Determinar si es asistencia tardía por defecto
                                                    const asambleaYaIniciada = config?.asamblea_iniciada;
                                                    let tocaInicioAuto = false;
                                                    if (config?.inicio_automatico && config?.limite_registro_asistencia) {
                                                        const limite = new Date(config.limite_registro_asistencia);
                                                        const limiteConProrroga = new Date(limite.getTime() + (config.minutos_prorroga || 0) * 60000);
                                                        tocaInicioAuto = new Date() > limiteConProrroga;
                                                    }
                                                    const esTardia = !!(asambleaYaIniciada || tocaInicioAuto);

                                                    setSelectedAccionista(acc);
                                                    setFormAsis({
                                                        ...formAsis,
                                                        numero_accionista: acc.numero_accionista,
                                                        numeros_accionista: [],
                                                        asistente_nombre: '', // Aparece limpio por seguridad
                                                        asistente_identificacion: '', // Aparece limpio por seguridad
                                                        tipo_doc: acc.tipo_doc || 'c',
                                                        fuera_de_quorum: esTardia,
                                                        observaciones: ''
                                                    });
                                                    setBusquedaRepresentados('');
                                                    setShowAsisModal(true);
                                                }}
                                                title="Marcar Asistencia"
                                            >
                                                <UserCheck size={18} />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>

            {/* MODAL ASISTENCIA */}
            <Modal show={showAsisModal} onHide={() => setShowAsisModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton closeVariant="white" className="border-bottom-glass">
                    <Modal.Title className="text-main d-flex align-items-center gap-2">
                        <CheckCircle className="text-success" /> Registrar Asistencia
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAsisSubmit}>
                    <Modal.Body className="p-4">
                        <div className="mb-4 p-3 rounded-3 border border-main-opacity" style={{ background: 'var(--bg-surface)' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <div className="text-dim small text-uppercase mb-1" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Accionista Seleccionado</div>
                                    <div className="fw-bold fs-5 text-main">{selectedAccionista?.nombre_titular}</div>
                                    <div className="text-dim small">CC/RUC: {selectedAccionista?.num_doc || 'N/A'}</div>
                                </div>
                                <div className="text-end">
                                    <div className="text-info fw-bold mb-0">{selectedAccionista?.total_acciones.toLocaleString()}</div>
                                    <div className="text-dim small" style={{ fontSize: '0.75rem' }}>Acciones ({selectedAccionista?.porcentaje_base}%)</div>
                                </div>
                            </div>
                        </div>

                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <Form.Label className="small text-dim text-uppercase fw-bold m-0">Nombre del Asistente</Form.Label>
                                        <Button
                                            variant="link"
                                            className="p-0 m-0 small text-info text-decoration-none"
                                            style={{ fontSize: '0.75rem' }}
                                            onClick={() => {
                                                if (selectedAccionista) {
                                                    setFormAsis({
                                                        ...formAsis,
                                                        asistente_nombre: selectedAccionista.nombre_titular || '',
                                                        asistente_identificacion: selectedAccionista.num_doc || '',
                                                        tipo_doc: selectedAccionista.tipo_doc || 'c'
                                                    });
                                                }
                                            }}
                                        >
                                            Cargar mismo accionista
                                        </Button>
                                    </div>
                                    <Form.Control
                                        type="text"
                                        className="input-glass-solid"
                                        placeholder="Ingrese nombre completo"
                                        value={formAsis.asistente_nombre}
                                        onChange={e => setFormAsis({ ...formAsis, asistente_nombre: capitalizeWords(e.target.value) })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small text-dim text-uppercase fw-bold">Tipo Doc</Form.Label>
                                    <Form.Select
                                        className="input-glass-solid"
                                        value={formAsis.tipo_doc}
                                        onChange={e => setFormAsis({ ...formAsis, tipo_doc: e.target.value })}
                                    >
                                        <option value="c">Cédula</option>
                                        <option value="r">RUC</option>
                                        <option value="p">Pasaporte</option>
                                        <option value="e">Exterior</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="small text-dim text-uppercase fw-bold">Identificación</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="input-glass-solid"
                                        value={formAsis.asistente_identificacion}
                                        onChange={e => setFormAsis({ ...formAsis, asistente_identificacion: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="small text-dim text-uppercase fw-bold">
                                        Representar además a (Opcional - Seleccione varios)
                                    </Form.Label>

                                    {/* BUSCADOR DE REPRESENTADOS */}
                                    <div className="position-relative mb-2">
                                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-2 text-dim" size={14} />
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar accionista a representar..."
                                            className="input-glass-solid ps-4"
                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.4rem 0.4rem 2rem' }}
                                            value={busquedaRepresentados}
                                            onChange={e => setBusquedaRepresentados(e.target.value)}
                                        />
                                    </div>

                                    <div className="input-glass-solid p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {accionistas
                                            .filter(a =>
                                                a.id !== selectedAccionista?.id &&
                                                (!a.asistencias || a.asistencias.length === 0) &&
                                                (a.nombre_titular.toLowerCase().includes(busquedaRepresentados.toLowerCase()) ||
                                                    a.num_doc?.includes(busquedaRepresentados))
                                            )
                                            .map(a => (
                                                <Form.Check
                                                    key={a.id}
                                                    type="checkbox"
                                                    id={`check-${a.id}`}
                                                    label={`${a.nombre_titular} (CC: ${a.num_doc || 'N/A'}) - ${a.total_acciones} Acciones`}
                                                    checked={formAsis.numeros_accionista?.includes(a.numero_accionista) || false}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        const current = formAsis.numeros_accionista || [];
                                                        if (checked) {
                                                            setFormAsis({ ...formAsis, numeros_accionista: [...current, a.numero_accionista] });
                                                        } else {
                                                            setFormAsis({ ...formAsis, numeros_accionista: current.filter(n => n !== a.numero_accionista) });
                                                        }
                                                    }}
                                                    className="mb-2 text-main"
                                                />
                                            ))}
                                        {accionistas.filter(a =>
                                            a.id !== selectedAccionista?.id &&
                                            (!a.asistencias || a.asistencias.length === 0) &&
                                            (a.nombre_titular.toLowerCase().includes(busquedaRepresentados.toLowerCase()) ||
                                                a.num_doc?.includes(busquedaRepresentados))
                                        ).length === 0 && (
                                                <div className="text-dim small text-center my-2">No hay coincidencias.</div>
                                            )}
                                    </div>
                                </Form.Group>
                            </Col>

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="small text-dim text-uppercase fw-bold">Observaciones</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        className="input-glass-solid"
                                        placeholder="Ej. Poder notariado, representación legal, etc."
                                        value={formAsis.observaciones}
                                        onChange={e => setFormAsis({ ...formAsis, observaciones: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Check
                                        type="switch"
                                        label={<span className="text-dim">Asistencia Tardía (Fuera de Quórum)</span>}
                                        checked={formAsis.fuera_de_quorum}
                                        onChange={e => setFormAsis({ ...formAsis, fuera_de_quorum: e.target.checked })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-top-glass">
                        <Button variant="outline-light" onClick={() => setShowAsisModal(false)} className="border-glass text-main">Cancelar</Button>
                        <Button variant="primary" type="submit" className="px-4 border-0 shadow-sm" style={{ backgroundColor: '#10b981' }}>Confirmar Entrada</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container >
    );
};

export default AsistenciaPage;
