import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Configurar interceptor para manejar caducidad de sesión o reinicio de servidor
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // El servidor detectó token inválido o inexistente
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            // Solo redireccionar si no estamos ya en login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const authService = {
    async login(email: string, password: string, _remember: boolean = false) {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const response = await axios.post(`${API_URL}/login`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (response.data.access_token) {
            try {
                const profileResponse = await axios.get(`${API_URL}/mi-perfil`, {
                    headers: { Authorization: `Bearer ${response.data.access_token}` }
                });
                const userData = { ...response.data, ...profileResponse.data, email };
                // Usamos localStorage siempre para mantener la sesión en nuevas pestañas/ventanas
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
            } catch (error) {
                console.error("Error al obtener perfil", error);
                const userData = { ...response.data, email };
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
            }
        }

        return response.data;
    },

    async register(userData: any) {
        // Enviar a crear-usuarios en lugar de usuarios/
        const response = await axios.post(`${API_URL}/crear-usuarios/`, userData);
        return response.data;
    },

    async requestPasswordReset(email: string) {
        const response = await axios.post(`${API_URL}/reset-password-request`, { email });
        return response.data;
    },

    async confirmPasswordReset(token: string, newPassword: string) {
        const response = await axios.post(`${API_URL}/reset-password-confirm`, { token, new_password: newPassword });
        return response.data;
    },

    async confirmNewPassword(token: string, newPassword: string) {
        const response = await axios.post(`${API_URL}/set-new-password`, { token, new_password: newPassword });
        return response.data;
    },

    async getProfile(token: string) {
        const response = await axios.get(`${API_URL}/mi-perfil`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    logout() {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
    },

    getCurrentUser() {
        // Buscar en localStorage primero (sesión persistente)
        let userStr = localStorage.getItem('user');
        // Si no está, buscar en sessionStorage (sesión de pestaña)
        if (!userStr) {
            userStr = sessionStorage.getItem('user');
        }

        if (userStr) return JSON.parse(userStr);
        return null;
    },
};

export const authHeader = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        return { Authorization: `Bearer ${user.access_token}` };
    }
    return {};
};
