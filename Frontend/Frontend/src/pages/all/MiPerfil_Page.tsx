import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { UserCircle, Key, Shield, Save } from 'lucide-react';
import { userService } from '../../services/user.service';
import Swal from 'sweetalert2';
import { authService } from '../../services/auth.service';

interface PerfilData {
    nombres: string;
    apellidos: string;
    email: string;
    cedula: string;
    firma_email: string;
}

export const MiPerfilPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [formData, setFormData] = useState<PerfilData>({
        nombres: '',
        apellidos: '',
        email: '',
        cedula: '',
        firma_email: ''
    });
    const [pwdData, setPwdData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        setLoadingData(true);
        try {
            // El backend tiene GET /mi-perfil o podemos extraerlo del user actual en localStorage o desde auth
            const response = await fetch(`${import.meta.env.VITE_API_URL}/mi-perfil`, {
                headers: {
                    Authorization: `Bearer ${authService.getCurrentUser()?.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFormData({
                    nombres: data.nombres || '',
                    apellidos: data.apellidos || '',
                    email: data.email || '',
                    cedula: data.cedula || '',
                    firma_email: data.firma_email || ''
                });
            }
        } catch (error) {
            console.error('Error al cargar perfil:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleActualizarDatos = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const sendData = {
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                email: formData.email,
                cedula: formData.cedula,
                firma_email: formData.firma_email // if any
            };

            await userService.updateMyProfile(sendData);

            Swal.fire({
                icon: 'success',
                title: 'Perfil actualizado',
                text: 'Tus datos personales han sido actualizados exitosamente.',
                background: '#1e293b',
                color: '#fff',
                timer: 2000,
                showConfirmButton: false
            });

            // Refrescar perfil para ver los cambios asentados
            cargarPerfil();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || 'No se pudo actualizar el perfil',
                background: '#1e293b',
                color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleActualizarPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pwdData.new_password !== pwdData.confirm_password) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseñas no coinciden',
                text: 'La nueva contraseña y su confirmación deben ser iguales.',
                background: '#1e293b',
                color: '#fff'
            });
            return;
        }

        if (pwdData.new_password.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña débil',
                text: 'La contraseña debe tener al menos 6 caracteres.',
                background: '#1e293b',
                color: '#fff'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authService.getCurrentUser()?.access_token}`
                },
                body: JSON.stringify({
                    current_password: pwdData.current_password,
                    new_password: pwdData.new_password
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Fallo al cambiar la contraseña');
            }

            Swal.fire({
                icon: 'success',
                title: 'Contraseña actualizada',
                text: 'Su acceso ha sido protegido exitosamente.',
                background: '#1e293b',
                color: '#fff',
                timer: 2000,
                showConfirmButton: false
            });

            setPwdData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'La contraseña actual no es correcta.',
                background: '#1e293b',
                color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };


    return (
        <Container fluid className="py-4">
            <header className="mb-4">
                <h1 className="h3 fw-bold text-white mb-2 d-flex align-items-center gap-2">
                    <UserCircle className="text-primary" /> Mi Perfil
                </h1>
                <p className="text-white-50">Gestiona tus datos personales y credenciales de acceso</p>
            </header>

            {loadingData ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            ) : (
                <Row className="g-4">
                    {/* COLUMNA IZQUIERDA: Datos Personales */}
                    <Col lg={7}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm h-100">
                            <Card.Body className="p-4 border-bottom border-white border-opacity-10">
                                <h2 className="h5 text-white mb-0 d-flex align-items-center gap-2">
                                    <UserCircle size={20} className="text-info" /> Información Personal
                                </h2>
                            </Card.Body>
                            <Card.Body className="p-4">
                                <Form onSubmit={handleActualizarDatos}>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small text-white-50 text-uppercase fw-bold">Nombres</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    className="input-glass-solid"
                                                    value={formData.nombres}
                                                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small text-white-50 text-uppercase fw-bold">Apellidos</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    className="input-glass-solid"
                                                    value={formData.apellidos}
                                                    onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small text-white-50 text-uppercase fw-bold">Cédula</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    className="input-glass-solid"
                                                    value={formData.cedula}
                                                    onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small text-white-50 text-uppercase fw-bold">Correo Electrónico</Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    className="input-glass-solid"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="mt-4 pt-3 border-top border-white border-opacity-10 d-flex justify-content-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="px-4 py-2 hover-scale rounded-pill"
                                            disabled={loading}
                                        >
                                            {loading ? 'Guardando...' : <><Save size={18} className="me-2 d-inline" /> Guardar Cambios</>}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* COLUMNA DERECHA: Seguridad */}
                    <Col lg={5}>
                        <Card className="bg-glass border-glass rounded-4 shadow-sm mb-4">
                            <Card.Body className="p-4 border-bottom border-white border-opacity-10">
                                <h2 className="h5 text-white mb-0 d-flex align-items-center gap-2">
                                    <Shield size={20} className="text-success" /> Seguridad y Contraseña
                                </h2>
                            </Card.Body>
                            <Card.Body className="p-4">
                                <Form onSubmit={handleActualizarPassword}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-white-50 text-uppercase fw-bold">Contraseña Actual</Form.Label>
                                        <Form.Control
                                            type="password"
                                            className="input-glass-solid"
                                            placeholder="Ingresa tu contraseña actual"
                                            value={pwdData.current_password}
                                            onChange={e => setPwdData({ ...pwdData, current_password: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-white-50 text-uppercase fw-bold">Nueva Contraseña</Form.Label>
                                        <Form.Control
                                            type="password"
                                            className="input-glass-solid"
                                            placeholder="Mínimo 6 caracteres"
                                            value={pwdData.new_password}
                                            onChange={e => setPwdData({ ...pwdData, new_password: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small text-white-50 text-uppercase fw-bold">Confirmar Nueva Contraseña</Form.Label>
                                        <Form.Control
                                            type="password"
                                            className="input-glass-solid"
                                            placeholder="Repite la nueva contraseña"
                                            value={pwdData.confirm_password}
                                            onChange={e => setPwdData({ ...pwdData, confirm_password: e.target.value })}
                                            required
                                        />
                                    </Form.Group>

                                    <div className="d-flex justify-content-end">
                                        <Button
                                            type="submit"
                                            variant="success"
                                            className="px-4 py-2 hover-scale rounded-pill w-100 bg-opacity-75 border-0"
                                            disabled={loading}
                                        >
                                            {loading ? 'Actualizando...' : <><Key size={18} className="me-2 d-inline" /> Actualizar Contraseña</>}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};
