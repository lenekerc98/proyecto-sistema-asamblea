import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, Spinner, Modal } from 'react-bootstrap';
import {
    Search,
    UserPlus,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { userService } from '../../services/user.service';
import { RegisterForm } from '../../components/Auth/RegisterForm';

interface UserManagementProps {
    user?: any;
}

export const UserManagement: React.FC<UserManagementProps> = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Register Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [editFormData, setEditFormData] = useState({
        nombres: '',
        apellidos: '',
        email: '',
        cedula: '',
        activo: true,
        rol_id: 0,
        enviar_correo_password: false
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditClick = (user: any) => {
        setSelectedUser(user);
        setEditFormData({
            nombres: user.nombres || '',
            apellidos: user.apellidos || '',
            email: user.email || '',
            cedula: user.cedula || '',
            activo: user.is_active !== false,
            rol_id: user.rol_id || 0,
            enviar_correo_password: false
        });
        setShowEditModal(true);
    };

    const handleEditChange = (e: React.ChangeEvent<any>) => {
        const { name, value, type } = e.target;
        const checked = e.target.checked;

        setEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'rol_id' ? Number(value) : value)
        }));
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setSaving(true);
        try {
            await userService.updateUser(selectedUser.id, editFormData);
            setShowEditModal(false);

            if (editFormData.enviar_correo_password) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Enlace Enviado!',
                    text: 'Se ha enviado un correo al usuario para que cambie su contraseña.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)',
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: '¡Usuario Actualizado!',
                    text: 'Los datos se guardaron correctamente.',
                    background: 'var(--bg-card-solid)',
                    color: 'var(--text-main)',
                    timer: 2000,
                    showConfirmButton: false
                });
            }

            fetchUsers(); // Refrescar la tabla
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar el usuario. Verifique la consola.');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch =
            (u.nombres + ' ' + u.apellidos).toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.cedula?.toLowerCase().includes(searchTerm.toLowerCase());

        const userRole = u.rol || (u.rol_id === 0 ? 'admin' : u.rol_id === 1 ? 'registro' : u.rol_id === 3 ? 'accionistas' : 'user');
        const matchesRole = roleFilter === 'all' || userRole === roleFilter;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="user-management p-4">
            <header className="mb-4 d-flex justify-content-between align-items-end border-bottom border-main-opacity pb-3">
                <div>
                    <h1 className="h3 fw-bold text-main mb-1">Gestión de Usuarios</h1>
                    <p className="text-dim mb-0">Administra los accesos y roles de la plataforma.</p>
                </div>
                <Button
                    className="btn-primary login-btn-gradient px-4 py-2 rounded-3 d-flex align-items-center gap-2"
                    onClick={() => setShowRegisterModal(true)}
                >
                    <UserPlus size={18} />
                    <span>Nuevo Usuario</span>
                </Button>
            </header>

            <Card className="bg-glass border-glass rounded-4 mb-4">
                <Card.Body className="p-3">
                    <Row className="g-3">
                        <Col md={6} lg={8}>
                            <div className="position-relative">
                                <div className="search-icon-wrapper">
                                    <Search size={18} />
                                </div>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar por nombre, correo o Cedula..."
                                    className="glass-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </Col>
                        <Col md={3} lg={2}>
                            <Form.Select
                                className="glass-search-input py-2"
                                style={{ paddingLeft: '1rem' }}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">Todos los Roles</option>
                                <option value="admin">Administrador</option>
                                <option value="user">Usuario</option>
                                <option value="registro">Registro</option>
                                <option value="accionistas">Accionista</option>
                            </Form.Select>
                        </Col>
                        <Col md={3} lg={2}>
                            <Button
                                variant="outline-light"
                                className="w-100 border-glass rounded-3 py-2 d-flex align-items-center justify-content-center gap-2"
                                onClick={fetchUsers}
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Refrescar
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <div className="glass-table-container shadow-lg">
                <Table responsive hover className="glass-table align-middle text-main">
                    <thead>
                        <tr>
                            <th className="text-dim">Usuario</th>
                            <th className="text-dim">Cedula</th>
                            <th className="text-dim">Rol</th>
                            <th className="text-dim">Estado</th>
                            <th className="text-center text-dim">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-dim">Cargando usuarios...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="user-avatar-sm rounded-circle bg-primary-glass d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: 40, height: 40 }}>
                                                {u.nombres?.[0]}{u.apellidos?.[0]}
                                            </div>
                                            <div>
                                                <div className="fw-bold text-main">{u.nombres} {u.apellidos}</div>
                                                <div className="extra-small text-dim">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="small text-dim">{u.cedula || 'No registrado'}</div>
                                    </td>
                                    <td>
                                        <Badge className={`px-2 py-1 ${(u.rol_id === 0 || u.rol === 'admin') ? 'badge-glass-primary' :
                                            (u.rol_id === 1 || u.rol === 'registro') ? 'badge-glass-warning' :
                                                (u.rol_id === 3 || u.rol === 'accionistas') ? 'badge-glass-info' :
                                                    'badge-glass-success'
                                            } text-uppercase`}>
                                            {u.rol_id === 0 || u.rol === 'admin' ? 'Administrador' :
                                                u.rol_id === 1 || u.rol === 'registro' ? 'Registro' :
                                                    u.rol_id === 3 || u.rol === 'accionistas' ? 'Accionista' :
                                                        'Usuario'}
                                        </Badge>
                                    </td>
                                    <td>
                                        {u.is_active !== false ? (
                                            <Badge className="badge-glass-success d-inline-flex align-items-center gap-1">
                                                <UserCheck size={12} /> Activo
                                            </Badge>
                                        ) : (
                                            <Badge className="badge-glass-danger d-inline-flex align-items-center gap-1">
                                                <UserX size={12} /> Inactivo
                                            </Badge>
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-center gap-2">
                                            <Button variant="link" className="p-1 text-dim hover-primary" onClick={() => handleEditClick(u)}>
                                                <Edit size={18} />
                                            </Button>
                                            <Button variant="link" className="p-1 text-dim hover-danger">
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-5">
                                    <p className="text-dim mb-0">No se encontraron usuarios con esos criterios.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Modal Editar Usuario */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered contentClassName="modal-glass-content">
                <Modal.Header closeButton className="border-bottom-glass">
                    <Modal.Title className="text-main fw-bold">Editar Usuario</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleUpdateUser} className="text-start">
                        <Form.Group className="mb-3">
                            <Form.Label className="text-main fw-semibold small">Nombres</Form.Label>
                            <Form.Control
                                type="text"
                                name="nombres"
                                value={editFormData.nombres}
                                onChange={handleEditChange}
                                className="input-glass-solid shadow-none"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-main fw-semibold small">Apellidos</Form.Label>
                            <Form.Control
                                type="text"
                                name="apellidos"
                                value={editFormData.apellidos}
                                onChange={handleEditChange}
                                className="input-glass-solid shadow-none"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-main fw-semibold small">Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={editFormData.email}
                                onChange={handleEditChange}
                                className="input-glass-solid shadow-none"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-main fw-semibold small">Cédula</Form.Label>
                            <Form.Control
                                type="text"
                                name="cedula"
                                value={editFormData.cedula}
                                onChange={handleEditChange}
                                className="input-glass-solid shadow-none"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-main fw-semibold small">Rol de Usuario</Form.Label>
                            <Form.Select
                                name="rol_id"
                                value={editFormData.rol_id}
                                onChange={handleEditChange}
                                className="input-glass-solid shadow-none"
                            >
                                <option value={0}>Administrador</option>
                                <option value={1}>Registro</option>
                                <option value={3}>Accionista</option>
                                <option value={4}>Usuario Normal</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Check
                                type="checkbox"
                                name="activo"
                                label={<span className="text-main">Usuario Activo en el Sistema</span>}
                                checked={editFormData.activo}
                                onChange={handleEditChange}
                                className="custom-switch"
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Check
                                type="checkbox"
                                name="enviar_correo_password"
                                label={<span className="text-main">Enviar enlace de cambio de contraseña por correo</span>}
                                checked={editFormData.enviar_correo_password}
                                onChange={handleEditChange}
                                className="custom-switch"
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-3 mt-4">
                            <Button variant="outline-light" onClick={() => setShowEditModal(false)} className="border-glass px-4 py-2">
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" disabled={saving} className="px-4 py-2 border-0 shadow-sm" style={{ backgroundColor: '#176BFF' }}>
                                {saving ? <Spinner size="sm" animation="border" /> : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal Registrar Usuario */}
            <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered contentClassName="modal-glass-content" size="lg">
                <Modal.Header closeButton className="border-bottom-glass">
                    <Modal.Title className="text-main fw-bold">Nuevo Usuario</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <RegisterForm
                        showEmailCheckbox={true}
                        onSuccess={(enviarCorreo: boolean) => {
                            setShowRegisterModal(false);
                            if (enviarCorreo) {
                                Swal.fire({
                                    icon: 'success',
                                    title: '¡Usuario Registrado!',
                                    text: 'Se ha enviado un correo con el enlace para crear la contraseña.',
                                    background: 'var(--bg-card-solid)',
                                    color: 'var(--text-main)',
                                });
                            } else {
                                Swal.fire({
                                    icon: 'success',
                                    title: '¡Usuario Registrado!',
                                    text: 'El usuario fue creado y puede acceder con su contraseña.',
                                    background: 'var(--bg-card-solid)',
                                    color: 'var(--text-main)',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                            fetchUsers();
                        }}
                    />
                </Modal.Body>
            </Modal>
        </div>
    );
};
