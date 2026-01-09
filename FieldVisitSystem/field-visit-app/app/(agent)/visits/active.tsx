import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import api from '../../../src/services/api.service';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveTrip() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeVisit, setActiveVisit] = useState<any>(null);

    useEffect(() => {
        fetchActiveVisit();
    }, []);

    const fetchActiveVisit = async () => {
        try {
            setLoading(true);
            // Fetch visits that are IN_PROGRESS
            // Since backend might not support filtering by status in 'findAll', we fetch all and filter client side
            // Or better, fetch today's visits.
            const res = await api.get(`/visits?agentId=${user?.id}`);
            const visits = res.data;
            const active = visits.find((v: any) => v.status === 'IN_PROGRESS');
            setActiveVisit(active || null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Active Trip</Text>
            </View>

            <View style={styles.content}>
                {activeVisit ? (
                    <View style={styles.card}>
                        <Text style={styles.activeLabel}>IN PROGRESS</Text>
                        <Text style={styles.locName}>{activeVisit.location?.name}</Text>
                        <Text style={styles.locAddr}>{activeVisit.location?.address}</Text>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.push(`/(agent)/visits/${activeVisit.id}`)}
                        >
                            <Text style={styles.actionBtnText}>View Details / Complete</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="map-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No trip currently in progress.</Text>
                        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(agent)/create-plan')}>
                            <Text style={styles.createBtnText}>Start a Plan</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 30 },
    backBtn: { padding: 5, marginRight: 10 },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    activeLabel: { color: '#FFA500', fontWeight: 'bold', fontSize: 12, marginBottom: 10 },
    locName: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 5 },
    locAddr: { color: '#666', fontSize: 14, marginBottom: 20 },
    divider: { height: 1, backgroundColor: '#eee', marginBottom: 20 },
    actionBtn: { backgroundColor: '#7C3AED', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#666', marginTop: 15, fontSize: 16 },
    createBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#7C3AED', borderRadius: 8 },
    createBtnText: { color: '#7C3AED', fontWeight: '600' }
});
