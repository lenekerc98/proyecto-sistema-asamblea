import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { Users, FileText, Building2, TrendingUp, Globe, Plane } from 'lucide-react';
import { listarAccionistas } from '../../services/accionistas.service';
import type { Accionista } from '../../services/accionistas.service';
import { Button } from 'react-bootstrap';
import '../../styles/Glassmorphism.css';

export const AccionistasDashboard_Page: React.FC = () => {
    const [accionistas, setAccionistas] = useState<Accionista[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDatos = async () => {
            try {
                const data = await listarAccionistas();
                setAccionistas(data);
            } catch (error) {
                console.error("Error al obtener accionistas", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    // Cálculos para Dashboard
    const totalAccionistas = accionistas.length;
    const conCedula = accionistas.filter(a => a.tipo_doc?.toLowerCase() === 'c').length;
    const conRuc = accionistas.filter(a => a.tipo_doc?.toLowerCase() === 'r').length;
    const conPasaporte = accionistas.filter(a => a.tipo_doc?.toLowerCase() === 'p').length;
    const conExterior = accionistas.filter(a => a.tipo_doc?.toLowerCase() === 'e').length;
    const totalAccionesNum = accionistas.reduce((sum, current) => sum + (Number(current.total_acciones) || 0), 0);

    const stats = [
        { title: 'TOTAL EMPADRONADOS', value: totalAccionistas.toLocaleString(), subtitle: '', icon: <Users size={22} />, color: 'primary' },
        { title: 'CÉDULA DE IDENTIDAD', value: conCedula.toLocaleString(), subtitle: 'Personas Naturales', icon: <FileText size={22} />, color: 'success' },
        { title: 'RUC (SOCIEDADES)', value: conRuc.toLocaleString(), subtitle: 'Personas Jurídicas', icon: <Building2 size={22} />, color: 'warning' },
        { title: 'PASAPORTE', value: conPasaporte.toLocaleString(), subtitle: 'Documento Extranjero', icon: <Globe size={22} />, color: 'info' },
        { title: 'EXTERIOR', value: conExterior.toLocaleString(), subtitle: 'Residenciados fuera', icon: <Plane size={22} />, color: 'secondary' },
        { title: 'TOTAL ACCIONES', value: totalAccionesNum.toLocaleString(), subtitle: 'En el parque accionario', icon: <TrendingUp size={22} />, color: 'danger' },
    ];

    return (
        <div className="admin-dashboard p-4 min-vh-100">
            <header className="mb-5 d-flex justify-content-between align-items-center">
                <div>
                    <h1 className="h3 fw-bold text-white mb-2">Dashboard de Accionistas</h1>
                    <p className="text-white-50 mb-0">Estadísticas y censos del padrón actual.</p>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <Button variant="link" className="text-decoration-none bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 rounded-pill px-4 py-2 d-flex align-items-center gap-2 hover-scale">
                        <Users size={16} /> Padron 2026
                    </Button>
                </div>
            </header>

            <Row className="g-4">
                {stats.map((stat, idx) => (
                    <Col key={idx} xs={12} sm={6} lg={4}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm hover-scale h-100 border-opacity-10 overflow-hidden position-relative">
                            <Card.Body className="p-4 d-flex flex-column h-100">
                                <div className={`mb-4 p-3 bg-${stat.color} bg-opacity-10 rounded-3 border border-${stat.color} border-opacity-25 d-inline-flex align-self-start text-${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-white-50 text-uppercase letter-spacing-wide mb-2 fw-bold" style={{ fontSize: '0.65rem' }}>{stat.title}</h3>
                                    <p className="display-6 fw-bold text-white mb-0">{stat.value}</p>
                                    {stat.subtitle && (
                                        <p className="small text-white-50 mb-0 mt-2 opacity-75">{stat.subtitle}</p>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};
