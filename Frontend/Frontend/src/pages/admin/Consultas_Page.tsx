import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Badge, Alert } from 'react-bootstrap';
import { Search, User, ArrowRight, Users, UserCheck, Shield } from 'lucide-react';
import { buscarPorDocumentoJerarquico } from '../../services/accionistas.service';
import type { Accionista } from '../../services/accionistas.service';

export const Consultas_Page: React.FC = () => {
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultados, setResultados] = useState<Accionista[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!busqueda.trim()) return;

        setLoading(true);
        setError(null);
        setResultados([]);

        try {
            const data = await buscarPorDocumentoJerarquico(busqueda);
            if (data.length === 0) {
                setError("No se encontraron vínculos para este documento.");
            } else {
                setResultados(data);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al realizar la consulta.");
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener todos los vínculos del accionista
    const obtenerTodosVinculos = (acc: Accionista, documentoABuscar: string) => {
        const matches: { type: string, name: string, doc: string, icon: any, isMatch: boolean }[] = [];

        // 1. Titular
        matches.push({
            type: 'Titular de Acción',
            name: acc.nombre_titular,
            doc: acc.num_doc || '',
            icon: <User size={18} className="text-primary" />,
            isMatch: acc.num_doc === documentoABuscar
        });

        // 2. Representantes
        acc.representantes?.forEach(rep => {
            matches.push({
                type: 'Representante / Apoderado',
                name: rep.nombre,
                doc: rep.identificacion,
                icon: <Shield size={18} className="text-info" />,
                isMatch: rep.identificacion === documentoABuscar
            });
        });

        // 3. Familiares / Relacionados
        acc.relacionados?.forEach(rel => {
            matches.push({
                type: rel.tipo_vinculo_rel?.nombre || 'Persona Relacionada',
                name: rel.nombre,
                doc: rel.num_doc || '',
                icon: <Users size={18} className="text-success" />,
                isMatch: rel.num_doc === documentoABuscar
            });
        });

        return matches;
    };

    return (
        <Container fluid className="px-4 py-4 min-vh-100">
            <header className="mb-4 d-flex align-items-center gap-3">
                <div
                    className="bg-primary bg-opacity-25 d-flex align-items-center justify-content-center rounded-circle text-primary shadow-sm"
                    style={{ width: '48px', height: '48px', minWidth: '48px', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                >
                    <Search size={24} />
                </div>
                <div>
                    <h1 className="h3 fw-bold text-main mb-0">Consultas de Vínculos</h1>
                    <p className="text-dim small mb-0 ms-1 opacity-75">Búsqueda jerárquica de accionistas, representantes y familiares.</p>
                </div>
            </header>

            <Card className="bg-glass border-glass shadow-lg mb-4 rounded-4 overflow-hidden">
                <Card.Body className="p-3">
                    <Form onSubmit={handleSearch}>
                        <Row className="align-items-center g-2">
                            <Col md={9}>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        placeholder="Ingrese Cédula, RUC o Pasaporte..."
                                        className="glass-search-input py-2 ps-5 border-main-opacity text-main"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        style={{ background: 'var(--input-bg)', fontSize: '1rem' }}
                                    />
                                    <div className="position-absolute top-50 start-0 translate-middle-y ps-3">
                                        <User className="text-dim opacity-50" size={18} />
                                    </div>
                                </div>
                            </Col>
                            <Col md={3}>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 hover-scale shadow-sm"
                                    disabled={loading}
                                >
                                    {loading ? <Spinner animation="border" size="sm" /> : <Search size={18} />}
                                    BUSCAR
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {error && (
                <Alert variant="danger" className="bg-danger bg-opacity-10 border-danger border-opacity-25 text-danger rounded-4 p-4 animate__animated animate__fadeIn">
                    <div className="d-flex align-items-center gap-3">
                        <Shield size={24} />
                        <div>
                            <div className="fw-bold">Consulta sin resultados</div>
                            <div>{error}</div>
                        </div>
                    </div>
                </Alert>
            )}

            <div className="row g-4 mb-5">
                {resultados.map((acc) => {
                    const todosVinculos = obtenerTodosVinculos(acc, busqueda);

                    return (
                        <div key={acc.id} className="col-lg-4 animate__animated animate__fadeInUp">
                            <Card className="bg-glass border-glass rounded-4 overflow-hidden h-100 shadow-lg">
                                <div className="bg-primary bg-opacity-10 p-4 border-bottom border-main-opacity">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <Badge bg="primary" className="mb-2 px-3 py-2 rounded-pill shadow-sm">
                                            VÍNCULO DETECTADO
                                        </Badge>
                                        <div className="text-dim small opacity-75">Accionista #{acc.numero_accionista}</div>
                                    </div>
                                    <h3 className="h4 text-main fw-bold mb-0">{acc.nombre_titular}</h3>
                                    <div className="text-dim">{acc.num_doc}</div>
                                </div>
                                <Card.Body className="p-4">
                                    <Row className="mb-4">
                                        <Col xs={6}>
                                            <div className="text-dim small text-uppercase fw-bold letter-spacing-1 mb-1">Acciones</div>
                                            <div className="h4 text-info fw-bold mb-0">{acc.total_acciones.toLocaleString()}</div>
                                        </Col>
                                        <Col xs={6}>
                                            <div className="text-dim small text-uppercase fw-bold letter-spacing-1 mb-1">Participación</div>
                                            <div className="h4 text-success fw-bold mb-0">{acc.porcentaje_base}%</div>
                                        </Col>
                                    </Row>

                                    <div className="mb-3">
                                        <div className="text-dim small text-uppercase fw-bold letter-spacing-1 mb-3">Árbol de Vínculos y Relaciones:</div>

                                        <div className="d-flex flex-column gap-3">
                                            {todosVinculos.map((v, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-4 border d-flex align-items-center gap-3 transition-all ${v.isMatch
                                                        ? 'bg-primary bg-opacity-20 border-primary shadow-lg scale-102'
                                                        : 'bg-glass border-glass opacity-75'
                                                        }`}
                                                    style={{
                                                        borderLeft: v.isMatch ? '4px solid var(--primary-accent)' : '1px solid var(--glass-border)',
                                                        transform: v.isMatch ? 'scale(1.02)' : 'scale(1)'
                                                    }}
                                                >
                                                    <div className={`p-2 rounded-3 shadow-sm border ${v.isMatch ? 'bg-primary text-white border-primary' : 'bg-glass text-dim border-glass'}`}>
                                                        {v.icon}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className={`fw-bold small text-uppercase letter-spacing-2 mb-0 ${v.isMatch ? 'text-info' : 'text-dim'}`}>
                                                            {v.type} {v.isMatch && <Badge bg="info" className="ms-2 py-1 px-2 text-dark" style={{ fontSize: '0.6rem' }}>COINCIDENCIA</Badge>}
                                                        </div>
                                                        <div className={`mb-0 fw-bold ${v.isMatch ? 'text-main fs-5' : 'text-dim'}`}>{v.name}</div>
                                                        <div className="small text-dim opacity-50">{v.doc}</div>
                                                    </div>
                                                    {v.isMatch && (
                                                        <div className="ms-auto">
                                                            <ArrowRight className="text-primary" size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card.Body>
                                <div className="card-footer bg-transparent border-top border-main-opacity p-3 d-flex justify-content-between">
                                    {acc.asistencias && acc.asistencias.length > 0 ? (
                                        <Badge bg="success" className="d-flex align-items-center gap-1 border border-success border-opacity-25 px-3 py-2">
                                            <UserCheck size={14} /> ASISTENCIA REGISTRADA
                                        </Badge>
                                    ) : (
                                        <Badge bg="secondary" className="bg-opacity-25 d-flex align-items-center gap-1 px-3 py-2">
                                            <Users size={14} /> SIN ASISTENCIA
                                        </Badge>
                                    )}
                                    <Button variant="link" className="text-primary text-decoration-none shadow-none p-0 d-flex align-items-center gap-1">
                                        Ver Expediente <ArrowRight size={14} />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </Container>
    );
};

export default Consultas_Page;
