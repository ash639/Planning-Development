
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import api from '../../../src/services/api.service';
import { useAuthStore } from '../../../src/store/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function VisitsList() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchVisits = async () => {
        try {
            // Fetch visits assigned to agent
            // Endpoint might be /visits?agentId=...
            const res = await api.get(`/visits`, { params: { agentId: user?.id } });
            setVisits(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVisits();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SCHEDULED': return '#3B82F6';
            case 'IN_PROGRESS': return '#F59E0B';
            case 'COMPLETED': return '#10B981';
            case 'REJECTED': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const date = new Date(item.scheduledDate);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(agent)/visits/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color="#666" />
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.stationInfo}>
                        <Text style={styles.stationName}>{item.location?.name || 'Unknown Station'}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>📍 {item.location?.district}</Text></View>
                            <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>🏢 {item.location?.block}</Text></View>
                        </View>
                    </View>

                    {item.location?.stationType && (
                        <View style={styles.typeTag}>
                            <Text style={styles.typeTagText}>{item.location.stationType}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={14} color="#999" />
                        <Text style={styles.timeText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    {item.status === 'SCHEDULED' && (
                        <View style={styles.actionRow}>
                            <Text style={styles.actionText}>Start Visit</Text>
                            <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Visits</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={visits}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No visits found.</Text>
                        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(agent)/create-plan')}>
                            <Text style={styles.createBtnText}>Create Plan</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingTop: 50 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
    list: { padding: 20 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#f3f4f6' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: '#666', fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    stationInfo: { flex: 1 },
    stationName: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 6 },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    miniBadge: { backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    miniBadgeText: { fontSize: 11, color: '#475569', fontWeight: '500' },

    typeTag: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeTagText: { fontSize: 10, fontWeight: 'bold', color: '#4F46E5' },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    timeText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },

    emptyContainer: { alignItems: 'center', marginTop: 100, padding: 40 },
    emptyText: { color: '#94a3b8', marginBottom: 20, textAlign: 'center', fontSize: 15 },
    createBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15, shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
