
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import api from '../../src/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../src/store/auth.store';
import { useRef } from 'react';

const SOCKET_URL = 'http://localhost:3000';

export default function AgentMapView() {
    const { userId } = useLocalSearchParams();
    const router = useRouter();
    const [agent, setAgent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const [socket, setSocket] = useState<Socket | null>(null);
    const iframeRef = useRef<any>(null);

    useEffect(() => {
        const fetchAgent = async () => {
            try {
                const res = await api.get(`/users/${userId}`);
                setAgent(res.data);
            } catch (e) {
                setAgent({ name: 'Agent', lastKnownLocation: '28.6139, 77.2090', lastLoginAt: new Date().toISOString() });
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchAgent();
    }, [userId]);

    useEffect(() => {
        if (userId && user?.organizationId) {
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);
            newSocket.on('connect', () => {
                newSocket.emit('join_room', user.organizationId);
            });
            newSocket.on('update_location', (data: any) => {
                if (data.userId === userId || data.agentId === userId) {
                    if (iframeRef.current && Platform.OS === 'web') {
                        iframeRef.current.contentWindow?.postMessage({
                            type: 'MOVE_AGENT',
                            lat: data.lat,
                            lng: data.lng
                        }, '*');
                    }
                }
            });
            return () => { newSocket.close(); };
        }
    }, [userId, user?.organizationId]);

    const openMaps = () => {
        if (!agent?.lastKnownLocation) return;
        // Parse "lat, long" string
        const [lat, long] = agent.lastKnownLocation.split(',').map((s: string) => s.trim());
        const url = Platform.select({
            ios: `maps:${lat},${long}`,
            android: `geo:${lat},${long}`,
            web: `https://www.google.com/maps/search/?api=1&query=${lat},${long}`
        });
        if (url) Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Live Tracking</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <View style={styles.content}>
                {loading ? <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 50 }} /> : (
                    <View style={styles.mapContainer}>
                        {agent?.lastKnownLocation ? (
                            <View style={{ flex: 1 }}>
                                {/* @ts-ignore: Render pure HTML iframe on web */}
                                <iframe
                                    ref={iframeRef}
                                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 }}
                                    srcDoc={`
                                        <html>
                                        <head>
                                            <style>
                                                body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: sans-serif; }
                                                .theme-select { position: absolute; top: 10px; right: 10px; z-index: 5; background: white; padding: 8px; border-radius: 8px; border: 1px solid #ddd; font-weight: bold; font-size: 12px; color: #1a237e; }
                                                .info-window { padding: 10px; min-width: 150px; }
                                            </style>
                                        </head>
                                        <body>
                                            <select class="theme-select" onchange="setTheme(this.value)">
                                                <option value="silver">Silver Style</option>
                                                <option value="dark">Dark Mode</option>
                                                <option value="retro">Retro Mode</option>
                                            </select>
                                            <div id="map"></div>
                                            <script>
                                                var map, marker;
                                                var themes = {
                                                    silver: [
                                                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                                                        { "featureType": "landscape", "stylers": [{ "color": "#f5f5f5" }] }
                                                    ],
                                                    dark: [
                                                        { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
                                                        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
                                                    ],
                                                    retro: [
                                                        { "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] }
                                                    ]
                                                };

                                                window.initMap = function() {
                                                    var lat = ${parseFloat(agent.lastKnownLocation.split(',')[0])};
                                                    var lng = ${parseFloat(agent.lastKnownLocation.split(',')[1])};
                                                    var myLatLng = { lat: lat, lng: lng };
                                                    
                                                    map = new google.maps.Map(document.getElementById('map'), {
                                                        zoom: 17,
                                                        center: myLatLng,
                                                        styles: themes.silver,
                                                        mapTypeControl: false,
                                                        streetViewControl: true
                                                    });

                                                    marker = new google.maps.Marker({
                                                        position: myLatLng,
                                                        map: map,
                                                        title: '${agent.name}',
                                                        icon: {
                                                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                                            scale: 7,
                                                            fillColor: "#1a237e",
                                                            fillOpacity: 1,
                                                            strokeWeight: 2,
                                                            strokeColor: "#fff"
                                                        }
                                                    });
                                                };

                                                window.setTheme = (t) => map.setOptions({ styles: themes[t] });

                                                window.addEventListener('message', function(event) {
                                                    if (event.data.type === 'MOVE_AGENT' && marker) {
                                                        var newPos = { lat: event.data.lat, lng: event.data.lng };
                                                        marker.setPosition(newPos);
                                                        map.panTo(newPos);
                                                    }
                                                });
                                            </script>
                                            <script src="https://maps.googleapis.com/maps/api/js?key=&callback=initMap" async defer></script>
                                        </body>
                                        </html>
                                    `}
                                />
                                <View style={styles.floatingInfo}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.agentNameLabel}>{agent.name}</Text>
                                        <Text style={styles.floatingText}>📍 {agent.lastKnownLocation}</Text>
                                        <Text style={styles.timeLabel}>Last Seen: {new Date(agent.lastLoginAt).toLocaleTimeString()}</Text>
                                    </View>
                                    <TouchableOpacity onPress={openMaps} style={styles.miniBtn}>
                                        <Ionicons name="navigate-circle" size={24} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 }}>Navigate</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={48} color="#ccc" />
                                <Text style={styles.errorText}>No location data available for this agent.</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    content: { flex: 1, padding: 15 },
    mapContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },

    floatingInfo: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    agentNameLabel: { fontSize: 16, fontWeight: 'bold', color: '#1a237e' },
    floatingText: { fontSize: 12, color: '#666', marginVertical: 2 },
    timeLabel: { fontSize: 10, color: '#888' },
    miniBtn: { backgroundColor: '#1a237e', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },

    errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { color: '#666', marginTop: 15, textAlign: 'center', fontSize: 16 }
});
