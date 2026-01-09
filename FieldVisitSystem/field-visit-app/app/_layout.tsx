import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth.store';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SocketService from '../src/services/socket.service';

export default function RootLayout() {
    const { token, isLoading, checkAuth } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (token) {
            SocketService.connect();
        } else {
            SocketService.disconnect();
        }
    }, [token]);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inRoot = segments.length === 0;

        console.log('Auth Check:', { token: !!token, inAuthGroup, inRoot, path: segments.join('/') });

        if (!token && !inAuthGroup && !inRoot) {
            console.log('Redirecting to Welcome (Not Auth, Not Auth Group, Not Root)');
            // Redirect to Welcome page if not authenticated and not in auth group or root
            router.replace('/');
        } else if (token && (inAuthGroup || inRoot)) {
            console.log('Redirecting to Dashboard (Auth)');
            // Redirect authenticated users to their dashboard
            const { user } = useAuthStore.getState();
            if (user?.role === 'SUPER_ADMIN') {
                router.replace('/(super-admin)/welcome');
            } else if (user?.role === 'ADMIN') {
                router.replace('/(admin)/dashboard');
            } else {
                router.replace('/(agent)/home');
            }
        }
    }, [token, isLoading, segments]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <StatusBar style="auto" />
            <Slot />
        </SafeAreaProvider>
    );
}
