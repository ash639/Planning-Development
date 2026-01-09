import axios from 'axios';
import { API_URL } from '../config/api.config';
import { useAuthStore } from '../store/auth.store';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
