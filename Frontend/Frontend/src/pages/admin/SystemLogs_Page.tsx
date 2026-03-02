import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { Activity, Trash2, Search, Filter } from 'lucide-react';
import Swal from 'sweetalert2';
import '../../styles/Glassmorphism.css';
import { logsService } from '../../services/logs.service';
import type { LogEntry } from '../../services/logs.service';

export const SystemLogs_Page: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const cargarLogs = async () => {
        try {
            setLoading(true);
            const data = await logsService.obtenerLogs({ limit: 100 });
            setLogs(data);
        } catch (error) {
            console.error('Error cargando logs:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los logs del sistema.',
                background: 'var(--bg-card-solid)', color: 'var(--text-main)'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarLogs();
    }, []);

    const getNivelColor = (nivel: string) => {
        switch (nivel?.toUpperCase()) {
            case 'INFO': return 'success';
            case 'WARNING': return 'warning';
            case 'ERROR': return 'danger';
            case 'CRITICAL': return 'danger';
            default: return 'secondary';
        }
    };

    const handleEliminarLog = (_id: number) => {
        // Implementación pendiente de backend (si se permite borrar auditoría)
        Swal.fire({
            icon: 'info',
            title: 'No disponible',
            text: 'La eliminación de registros de auditoría no está activa por razones de seguridad.',
            background: 'var(--bg-card-solid)', color: 'var(--text-main)'
        });
    };

    const logsFiltrados = logs.filter(log =>
        log.accion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        log.origen?.toLowerCase().includes(busqueda.toLowerCase()) ||
        log.mensaje?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="admin-dashboard p-4 min-vh-100">
            <header className="mb-4 d-flex justify-content-between align-items-end border-bottom border-main-opacity pb-3">
                <div>
                    <h1 className="h3 fw-bold text-main mb-2 d-flex align-items-center gap-2">
                        <Activity size={24} className="text-secondary" /> Logs del Sistema
                    </h1>
                    <p className="text-dim mb-0">Auditoría completa de todas las acciones realizadas dentro de la asamblea.</p>
                </div>
            </header>

            <Card className="bg-glass border-glass rounded-4 shadow-sm mb-4">
                <Card.Body className="p-4 border-bottom border-main-opacity">
                    <Row className="g-3 align-items-center">
                        <Col lg={4}>
                            <div className="position-relative">
                                <Search size={18} className="text-dim position-absolute top-50 start-0 translate-middle-y ms-3" />
                                <Form.Control
                                    className="bg-surface text-main border-main-opacity ps-5 shadow-none rounded-pill"
                                    placeholder="Buscar por usuario, acción o módulo..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>
                        </Col>
                        <Col lg={8} className="text-end">
                            <Button variant="outline-primary" className="border-main-opacity rounded-pill hover-scale d-inline-flex align-items-center gap-2">
                                <Filter size={18} /> Filtrar Fechas
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>

                <Card.Body className="p-0">
                    {!loading ? (
                        <Table responsive hover className="table-borderless mb-0 align-middle text-main bg-transparent">
                            <thead className="bg-surface border-bottom border-main-opacity">
                                <tr>
                                    <th className="text-dim small ps-4 py-3 bg-transparent">ID / Fecha Hora</th>
                                    <th className="text-dim small py-3 bg-transparent">Módulo</th>
                                    <th className="text-dim small py-3 bg-transparent">Acción Realizada</th>
                                    <th className="text-dim small py-3 bg-transparent">Usuario Autor</th>
                                    <th className="text-dim small py-3 text-end pe-4 bg-transparent">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent">
                                {logsFiltrados.length > 0 ? logsFiltrados.map((log) => (
                                    <tr key={log.id} className="border-bottom border-main-opacity bg-transparent">
                                        <td className="ps-4 bg-transparent">
                                            <div className="d-flex flex-column">
                                                <span className="text-main fw-bold">#{log.id.toString().padStart(4, '0')}</span>
                                                <small className="text-dim">{new Date(log.fecha).toLocaleString()}</small>
                                            </div>
                                        </td>
                                        <td className="bg-transparent">
                                            <Badge bg={getNivelColor(log.nivel)} className="bg-opacity-25 text-main border border-main-opacity px-2 py-1 rounded-1 fw-normal text-uppercase letter-spacing-wide small">
                                                {log.origen}
                                            </Badge>
                                        </td>
                                        <td className="text-main fw-medium bg-transparent">
                                            {log.accion && <div>{log.accion}</div>}
                                            {log.mensaje && (
                                                <div className={log.accion ? "text-dim small fw-normal mt-1" : "text-dim small fw-normal"}>
                                                    {log.mensaje}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-dim bg-transparent">{log.usuario_email || `ID: ${log.usuario_id || 'N/A'}`}</td>
                                        <td className="text-end pe-4 bg-transparent">
                                            <Button
                                                variant="link"
                                                className="text-danger p-2 hover-scale bg-danger bg-opacity-10 rounded-circle"
                                                onClick={() => handleEliminarLog(log.id)}
                                                title="Eliminar Log de Auditoría"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-dim border-0 bg-transparent">
                                            No se encontraron registros de logs para esta búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center py-5 text-dim">Cargando registros...</div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};
