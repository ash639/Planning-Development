import { io, Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/auth.store';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
    private socket: Socket | null = null;
    private locationSubscription: any = null;

    connect() {
        const { user, token } = useAuthStore.getState();
        if (!token || !user) return;

        if (this.socket) return;

        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.socket?.emit('join_room', user.organizationId);
        });

        if (user.role === 'AGENT') {
            this.startTracking();
        }
    }

    async startTracking() {
        const { user } = useAuthStore.getState();
        if (!user) return;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Update location every 10 seconds
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 10
                },
                (location) => {
                    this.socket?.emit('send_location', {
                        room: user.organizationId,
                        agentId: user.id,
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                        timestamp: new Date().toISOString()
                    });
                }
            );
        } catch (e) {
            console.error('Socket tracking error:', e);
        }
    }

    disconnect() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export default new SocketService();
