import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { crearAccionista, actualizarAccionista } from '../../services/accionistas.service';
import type { Accionista, AccionistaCreate } from '../../services/accionistas.service';

interface ShareholderFormModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    editData: Accionista | null;
}

const INITIAL_STATE: AccionistaCreate = {
    periodo: '2025',
    numero_accionista: 0,
    nombre_titular: '',
    tipo_doc: 'c',
    num_doc: '',
    correo: '',
    telefono: '',
    total_acciones: 0,
    porcentaje_base: 0
};

export const ShareholderFormModal: React.FC<ShareholderFormModalProps> = ({
    show, onHide, onSuccess, editData
}) => {
    const [formData, setFormData] = useState<AccionistaCreate>(INITIAL_STATE);
    const [loading, setLoading] = useState(false);

    // Estados locales para strings numéricos para permitir escribir libremente (9.5)
    const [totalAccionesStr, setTotalAccionesStr] = useState("0");
    const [porcentajeStr, setPorcentajeStr] = useState("0");

    useEffect(() => {
        if (editData) {
            setFormData({
                periodo: editData.periodo || '2025',
                numero_accionista: editData.numero_accionista,
                nombre_titular: editData.nombre_titular,
                tipo_doc: editData.tipo_doc || 'c',
                num_doc: editData.num_doc || '',
                correo: editData.correo || '',
                telefono: editData.telefono || '',
                total_acciones: editData.total_acciones,
                porcentaje_base: editData.porcentaje_base
            });
            setTotalAccionesStr(editData.total_acciones.toString());
            setPorcentajeStr(editData.porcentaje_base.toString());
        } else {
            setFormData(INITIAL_STATE);
            setTotalAccionesStr("0");
            setPorcentajeStr("0");
        }
    }, [editData, show]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones de longitud
        const numDoc = formData.num_doc || '';
        if (formData.tipo_doc === 'c' && numDoc.length !== 10) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'La Cédula debe tener exactamente 10 dígitos', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            return;
        }
        if (formData.tipo_doc === 'r' && numDoc.length !== 13) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'El RUC debe tener exactamente 13 dígitos', background: 'var(--bg-card-solid)', color: 'var(--text-main)' });
            return;
        }

        setLoading(true);
        try {
            // Normalizar y parsear antes de enviar
            const finalData = {
                ...formData,
                total_acciones: parseInt(totalAccionesStr.replace(',', '.')) || 0,
                porcentaje_base: parseFloat(porcentajeStr.replace(',', '.')) || 0
            };

            if (editData) {
                await actualizarAccionista(editData.id, finalData);
            } else {
                await crearAccionista(finalData);
            }
            onSuccess();
            onHide();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || 'Error al procesar la solicitud',
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg" contentClassName="modal-glass-content">
            <Modal.Header closeButton closeVariant="white" className="border-bottom-glass">
                <Modal.Title className="text-main small text-uppercase">
                    {editData ? 'Editar Accionista' : 'Alta Manual de Accionista'}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body className="p-4 text-main">
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">NOMBRE TITULAR</Form.Label>
                                <Form.Control
                                    required
                                    className="input-glass-solid"
                                    value={formData.nombre_titular}
                                    onChange={e => setFormData({ ...formData, nombre_titular: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">NÚMERO ACCIONISTA</Form.Label>
                                <Form.Control
                                    required
                                    type="number"
                                    className="input-glass-solid"
                                    value={formData.numero_accionista}
                                    onChange={e => setFormData({ ...formData, numero_accionista: parseInt(e.target.value) || 0 })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">TIPO DOC</Form.Label>
                                <Form.Select
                                    className="input-glass-solid"
                                    value={formData.tipo_doc}
                                    onChange={e => setFormData({ ...formData, tipo_doc: e.target.value })}
                                >
                                    <option value="c">Cédula</option>
                                    <option value="r">RUC</option>
                                    <option value="p">Pasaporte</option>
                                    <option value="e">Exterior</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">DOCUMENTO IDENTIDAD</Form.Label>
                                <Form.Control
                                    required
                                    className="input-glass-solid"
                                    value={formData.num_doc}
                                    onChange={e => setFormData({ ...formData, num_doc: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">TELÉFONO</Form.Label>
                                <Form.Control
                                    className="input-glass-solid"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">CORREO ELECTRÓNICO</Form.Label>
                                <Form.Control
                                    type="email"
                                    className="input-glass-solid"
                                    value={formData.correo}
                                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">TOTAL ACCIONES</Form.Label>
                                <Form.Control
                                    required
                                    type="text"
                                    inputMode="numeric"
                                    className="input-glass-solid"
                                    value={totalAccionesStr}
                                    onChange={e => setTotalAccionesStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-dim small fw-bold">% PORCENTAJE</Form.Label>
                                <Form.Control
                                    required
                                    type="text"
                                    inputMode="decimal"
                                    className="input-glass-solid"
                                    value={porcentajeStr}
                                    onChange={e => setPorcentajeStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer className="border-top-glass">
                    <Button variant="outline-light" onClick={onHide} disabled={loading} className="border-glass text-main">Cerrar</Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Procesando...' : editData ? 'Actualizar' : 'Dar de Alta'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
