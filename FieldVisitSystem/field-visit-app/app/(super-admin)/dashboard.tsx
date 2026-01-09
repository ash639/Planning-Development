import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, FlatList, ScrollView, Animated, Dimensions } from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';
import { useState, useEffect, useRef } from 'react';
import api from '../../src/services/api.service';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// ... rest of imports

// Helper for "Last Active"
const formatLastActive = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000 / 60; // minutes

    if (diff < 15) return 'Just now'; // Online
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
};

export default function SuperAdminDashboard() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [view, setView] = useState('orgs');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [orgName, setOrgName] = useState('');

    // Stats
    const [stats, setStats] = useState({ orgs: 0, users: 0, online: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'orgs') {
                const res = await api.get('/organizations');
                setItems(res.data);
                setStats(s => ({ ...s, orgs: res.data.length }));
            } else if (view === 'users') {
                const res = await api.get('/users/all');
                setItems(res.data);
                // Count "Online" users (< 15 mins last login)
                const onlineCount = res.data.filter((u: any) => {
                    if (!u.lastLoginAt) return false;
                    const diff = (new Date().getTime() - new Date(u.lastLoginAt).getTime()) / 60000;
                    return diff < 15;
                }).length;
                setStats(s => ({ ...s, users: res.data.length, online: onlineCount }));
            } else if (view === 'logs') {
                const res = await api.get('/audit-logs');
                setItems(res.data);
            } else if (view === 'reports') {
                const res = await api.get('/reports');
                setItems(res.data);
            } else if (view === 'system-logs') {
                const res = await api.get('/system-logs?limit=100');
                setItems(res.data);
            } else if (view === 'feature-flags') {
                const res = await api.get('/feature-flags');
                setItems(res.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [view]);

    // Actions (createOrg, toggleUserStatus same as before)
    const createOrg = async () => {
        if (!orgName) return Alert.alert('Error', 'Name required');
        try {
            await api.post('/organizations', { name: orgName });
            Alert.alert('Success', 'Organization Created');
            setModalVisible(false);
            setOrgName('');
            fetchData();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed');
        }
    };

    const toggleUserStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/users/${id}/suspend`, { isActive: !currentStatus });
            fetchData();
        } catch (e) { Alert.alert('Error', 'Failed to update user'); }
    };


    const renderHeader = () => (
        <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.headerGradient}>
            <SafeAreaView>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.username}>{user?.name}</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="business" size={20} color="#1565c0" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Organizations</Text>
                            <Text style={styles.statValue}>{stats.orgs}</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="people" size={20} color="#2e7d32" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Total Users</Text>
                            <Text style={styles.statValue}>{stats.users}</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="pulse" size={20} color="#f57c00" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Online Now</Text>
                            <Text style={styles.statValue}>{stats.online}</Text>
                        </View>
                    </View>
                </ScrollView>
                <View style={styles.tabContainer}>
                    {['orgs', 'users', 'logs', 'reports', 'system-logs', 'feature-flags'].map((tab) => (
                        <TouchableOpacity key={tab} onPress={() => setView(tab)} style={[styles.tab, view === tab && styles.activeTab]}>
                            <Text style={[styles.tabText, view === tab && styles.activeTabText]}>{tab.toUpperCase().replace('-', ' ')}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    const renderItem = ({ item }: { item: any }) => {
        if (view === 'orgs') {
            return (
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/(super-admin)/org/${item.id}`)}>
                    <View style={styles.card}>
                        <View style={styles.cardLeft}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: item.status === 'SUSPENDED' ? '#ffebee' : '#e3f2fd' }]}>
                                {item.status === 'SUSPENDED' ? <Ionicons name="alert-circle" size={24} color="red" /> : <Text style={{ color: '#1565c0', fontWeight: 'bold' }}>{item.name[0]}</Text>}
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <Text style={styles.cardSub}>{item._count?.users || 0} Users • {item.plan || 'Free'} Plan</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </View>
                </TouchableOpacity>
            );
        } else if (view === 'users') {
            const lastActive = formatLastActive(item.lastLoginAt);
            const isOnline = lastActive === 'Just now';

            return (
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: item.isActive ? (isOnline ? '#e8f5e9' : '#f5f5f5') : '#ffebee' }]}>
                            {isOnline && <View style={styles.onlineDot} />}
                            <Text style={{ color: item.isActive ? 'green' : 'red', fontWeight: 'bold' }}>{item.name[0]}</Text>
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSub}>
                                {item.role} • last seen: {lastActive}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleUserStatus(item.id, item.isActive)} style={[styles.statusBadge, { backgroundColor: item.isActive ? '#e8f5e9' : '#ffebee' }]}>
                        <Text style={{ color: item.isActive ? 'green' : 'red', fontSize: 10, fontWeight: 'bold' }}>
                            {item.isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (view === 'logs') {
            // Audit Logs
            return (
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <Ionicons name="document-text-outline" size={24} color="#666" style={{ marginRight: 15 }} />
                        <View>
                            <Text style={styles.cardTitle}>{item.action}</Text>
                            <Text style={styles.cardSub}>{item.user} • {new Date(item.timestamp || item.createdAt).toLocaleTimeString()}</Text>
                        </View>
                    </View>
                </View>
            );
        } else if (view === 'reports') {
            return (
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <Ionicons name="bar-chart-outline" size={24} color="#3b5998" style={{ marginRight: 15 }} />
                        <View>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSub}>{item.type} • {new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
            );
        } else if (view === 'system-logs') {
            const levelColors: any = {
                ERROR: '#f44336',
                WARN: '#ff9800',
                INFO: '#2196f3',
                DEBUG: '#9e9e9e'
            };
            return (
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.logLevelBadge, { backgroundColor: levelColors[item.level] || '#999' }]}>
                            <Text style={styles.logLevelText}>{item.level}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.message}</Text>
                            <Text style={styles.cardSub}>{item.source || 'System'} • {new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            );
        } else if (view === 'feature-flags') {
            return (
                <View style={styles.card}>
                    <View style={styles.cardLeft}>
                        <Ionicons name="flag-outline" size={24} color={item.enabled ? '#4caf50' : '#999'} style={{ marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSub}>{item.key} • {item.organizationId ? 'Org-specific' : 'Global'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.enabled ? '#e8f5e9' : '#ffebee' }]}>
                        <Text style={{ color: item.enabled ? 'green' : 'red', fontSize: 10, fontWeight: 'bold' }}>
                            {item.enabled ? 'ENABLED' : 'DISABLED'}
                        </Text>
                    </View>
                </View>
            );
        } else {
            return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {renderHeader()}
            <FlatList
                data={items}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchData}
            />
            {view === 'orgs' && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
            )}
            <Modal animationType="fade" transparent={true} visible={modalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Organization</Text>
                        <TextInput placeholder="e.g Acme Corp" style={styles.input} value={orgName} onChangeText={setOrgName} autoFocus />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.modalBtnCancel]}><Text style={styles.modalBtnTextCancel}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={createOrg} style={[styles.modalBtn, styles.modalBtnConfirm]}><Text style={styles.modalBtnTextConfirm}>Create</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    headerGradient: { paddingTop: 10, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    username: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },

    statsScroll: { paddingLeft: 20, marginBottom: 25 },
    statCard: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginRight: 10, minWidth: 120, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    iconBox: { width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    statLabel: { color: '#666', fontSize: 10, fontWeight: '600' },
    statValue: { color: '#333', fontSize: 16, fontWeight: 'bold' },

    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    activeTab: { backgroundColor: '#fff' },
    tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    activeTabText: { color: '#3b5998' },

    listContent: { padding: 20, paddingTop: 10 },
    card: { backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardLeft: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 15, position: 'relative' },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4caf50', position: 'absolute', bottom: 0, right: 0, borderWidth: 1, borderColor: '#fff' },

    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },

    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b5998', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 25, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    input: { width: '100%', backgroundColor: '#f5f7fa', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 25, borderWidth: 1, borderColor: '#e1e4e8' },
    modalActions: { flexDirection: 'row', width: '100%', gap: 15 },
    modalBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: '#f5f7fa' },
    modalBtnConfirm: { backgroundColor: '#3b5998' },
    modalBtnTextCancel: { color: '#666', fontWeight: 'bold' },
    modalBtnTextConfirm: { color: '#fff', fontWeight: 'bold' },
    logLevelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
    logLevelText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
