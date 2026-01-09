import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,
    login: async (token, user) => {
        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('token', token);
            await SecureStore.setItemAsync('user', JSON.stringify(user));
        } else if (typeof localStorage !== 'undefined') {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }
        set({ token, user, isLoading: false });
    },
    logout: async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
        } else if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        set({ token: null, user: null, isLoading: false });
    },
    checkAuth: async () => {
        try {
            let token, userString;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('token');
                userString = await SecureStore.getItemAsync('user');
            } else if (typeof localStorage !== 'undefined') {
                token = localStorage.getItem('token');
                userString = localStorage.getItem('user');
            }

            if (token && userString) {
                set({ token, user: JSON.parse(userString), isLoading: false });
            } else {
                set({ token: null, user: null, isLoading: false });
            }
        } catch (e) {
            set({ token: null, user: null, isLoading: false });
        }
    },
}));
