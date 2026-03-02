import React, { useState } from 'react';
import { Row, Col, Card, Form, Button } from 'react-bootstrap';
import { FileText, Download, FileSpreadsheet, File } from 'lucide-react';
import Swal from 'sweetalert2';
import { exportarPadron, exportarAsistencia } from '../../services/accionistas.service';
import '../../styles/Glassmorphism.css';

export const Reporteria_Page: React.FC = () => {
    const [tipoReporte, setTipoReporte] = useState('');
    const [formatoExportacion, setFormatoExportacion] = useState('excel'); // Cambiado a excel por defecto ya que es lo que implementamos
    const [generando, setGenerando] = useState(false);

    const handleGenerarReporte = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tipoReporte) {
            Swal.fire({
                icon: 'warning',
                title: 'Selección Necesaria',
                text: 'Por favor seleccione el tipo de reporte a generar.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
            return;
        }

        try {
            setGenerando(true);

            if (tipoReporte === 'Listado Empadronados') {
                await exportarPadron();
            } else if (tipoReporte === 'Registro Asistencias') {
                await exportarAsistencia();
            } else {
                // Para los otros reportes que aún no tienen endpoint real
                await new Promise(resolve => setTimeout(resolve, 1500));
                Swal.fire({
                    icon: 'info',
                    title: 'En desarrollo',
                    text: `El reporte "${tipoReporte}" está siendo integrado con el nuevo motor de PDF.`,
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)'
                });
                setGenerando(false);
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Reporte Generado',
                text: `El reporte "${tipoReporte}" ha sido descargado exitosamente en formato EXCEL.`,
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } catch (error) {
            console.error("Error generando reporte:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el reporte. Verifique la conexión con el servidor.',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-main)'
            });
        } finally {
            setGenerando(false);
        }
    };

    const getFormatoIcon = () => {
        switch (formatoExportacion) {
            case 'excel': return <FileSpreadsheet className="text-success" />;
            case 'word': return <FileText className="text-info" />;
            default: return <File className="text-danger" />; // PDF
        }
    };

    return (
        <div className="admin-dashboard p-4 min-vh-100">
            <header className="mb-4 d-flex justify-content-between align-items-end border-bottom border-main-opacity pb-3">
                <div>
                    <h1 className="h3 fw-bold text-main mb-2">Centro de Reportería</h1>
                    <p className="text-dim">Exporte los documentos y actas oficiales de la asamblea en diferentes formatos.</p>
                </div>
            </header>

            <Row className="justify-content-center">
                <Col lg={6} xl={4}>
                    <Card className="bg-glass border-glass rounded-4 shadow-lg border-opacity-10 position-relative overflow-hidden">
                        <div className="position-absolute top-0 start-0 w-100 bg-primary" style={{ height: '4px', opacity: 0.8 }}></div>
                        <Card.Body className="p-5">
                            <div className="text-center mb-5">
                                <div className="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-circle text-primary border border-primary border-opacity-25 mb-3">
                                    <Download size={32} />
                                </div>
                                <h2 className="h4 text-main fw-bold">Generador de Documentos</h2>
                                <p className="text-dim small">Configure los parámetros para exportar su informe.</p>
                            </div>

                            <Form onSubmit={handleGenerarReporte}>
                                {/* Combo Box: Tipo de Reporte */}
                                <Form.Group className="mb-4">
                                    <Form.Label className="text-dim fw-medium small text-uppercase letter-spacing-wide">
                                        Seleccione el Tipo de Reporte
                                    </Form.Label>
                                    <Form.Select
                                        className="bg-surface text-main border-main-opacity py-3 shadow-none custom-select"
                                        value={tipoReporte}
                                        onChange={(e) => setTipoReporte(e.target.value)}
                                        style={{ backgroundImage: 'var(--select-icon)' }}
                                    >
                                        <option value="" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>-- Elegir Informe --</option>
                                        <option value="Listado Empadronados" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>📑 Padrón de Accionistas Completo</option>
                                        <option value="Registro Asistencias" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>📋 Log Integral de Asistencias y Horarios</option>
                                        <option value="Quorum Presente" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>👥 Estado actual del Quórum (PDF)</option>
                                        <option value="Resultados Votacion" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>📊 Resultados y Escrutinio de Votaciones (PDF)</option>
                                        <option value="Acta Asamblea" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>📜 Acta Resumen de Asamblea (PDF)</option>
                                    </Form.Select>
                                </Form.Group>

                                {/* Combo Box: Formato Exportación */}
                                <Form.Group className="mb-5">
                                    <Form.Label className="text-dim fw-medium small text-uppercase letter-spacing-wide">
                                        Formato de Exportación
                                    </Form.Label>
                                    <div className="d-flex gx-3 border border-main-opacity rounded-3 overflow-hidden">
                                        <div className="d-flex align-items-center justify-content-center px-4 bg-surface border-end border-main-opacity">
                                            {getFormatoIcon()}
                                        </div>
                                        <Form.Select
                                            className="bg-transparent text-main border-0 py-3 shadow-none w-100 rounded-0 custom-select"
                                            value={formatoExportacion}
                                            onChange={(e) => setFormatoExportacion(e.target.value)}
                                            style={{ backgroundImage: 'var(--select-icon)' }}
                                        >
                                            <option value="pdf" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>Adobe PDF (.pdf) - Documento Seguro</option>
                                            <option value="excel" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>MS Excel (.xlsx) - Hoja de Cálculo</option>
                                            <option value="word" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>MS Word (.docx) - Documento Editable</option>
                                        </Form.Select>
                                    </div>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-3 fw-bold rounded-pill hover-scale d-flex align-items-center justify-content-center gap-2"
                                    disabled={generando}
                                >
                                    {generando ? (
                                        <>Procesando el documento...</>
                                    ) : (
                                        <>
                                            <Download size={20} />
                                            Generar y Descargar Reporte
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};
