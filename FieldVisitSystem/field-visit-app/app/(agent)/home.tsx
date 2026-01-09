import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOfflineStore } from '../../src/store/offline.store';
import api from '../../src/services/api.service';

const { width } = Dimensions.get('window');

export default function AgentDashboard() {
    const { logout, user } = useAuthStore();
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);

    // Offline Store
    const { isOnline, pendingActions, removeAction } = useOfflineStore();

    const [isSyncing, setIsSyncing] = useState(false);

    // Change Password State
    const [passModal, setPassModal] = useState(false);
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');

    const changePassword = async () => {
        if (!oldPass || !newPass) return Alert.alert('Error', 'Both fields are required');
        try {
            await api.post('/auth/change-password', { oldPassword: oldPass, newPassword: newPass });
            Alert.alert('Success', 'Password changed successfully');
            setPassModal(false);
            setOldPass(''); setNewPass('');
        } catch (e: any) {
            console.error('Frontend Password change error:', e);
            const msg = e.response?.data?.error || e.message || 'Failed to change password';
            Alert.alert('Error', msg);
        }
    };

    // Dashboard Data
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ completed: 0, total: 0, highPriorityPending: 0, districts: 0, blocks: 0 });
    const [highPriorityVisits, setHighPriorityVisits] = useState<any[]>([]);

    const pendingReports = pendingActions.length;

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [isOnline])
    );

    const fetchDashboardData = async () => {
        if (!user) return;
        try {
            let data = [];
            if (isOnline) {
                const res = await api.get(`/visits`, { params: { agentId: user.id } });
                data = res.data;
            } else {
                setLoading(false);
                return;
            }

            setVisits(data);

            const total = data.length;
            const completed = data.filter((v: any) => v.status === 'COMPLETED').length;
            const hpPending = data.filter((v: any) => v.status !== 'COMPLETED' && (v.location?.isProblematic || v.location?.priority === 'HIGH'));

            const plannedLocations = data.map((v: any) => v.location).filter(Boolean);
            const plannedDistricts = new Set(plannedLocations.map((l: any) => l.district)).size;
            const plannedBlocks = new Set(plannedLocations.map((l: any) => l.block)).size;

            setStats({
                completed,
                total,
                highPriorityPending: hpPending.length,
                districts: plannedDistricts,
                blocks: plannedBlocks
            });

            setHighPriorityVisits(hpPending);

        } catch (error) {
            console.error('Fetch dashboard error', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (route: string) => {
        setMenuVisible(false);
        if (route === 'logout') {
            logout();
        } else {
            router.push(route);
        }
    };

    const handleSync = async () => {
        if (!isOnline) {
            Alert.alert('Offline', 'Please connect to internet to sync.');
            return;
        }

        if (pendingActions.length === 0) {
            Alert.alert('Synced', 'No pending data to sync.');
            return;
        }

        setIsSyncing(true);
        let successCount = 0;
        let failCount = 0;

        for (const action of pendingActions) {
            try {
                if (action.type === 'UPDATE_VISIT_STATUS') {
                    const { visitId, ...rest } = action.payload;
                    await api.patch(`/visits/${visitId}/status`, rest);
                } else if (action.type === 'CREATE_LOCATION') {
                    await api.post('/locations', action.payload);
                }

                removeAction(action.id);
                successCount++;
            } catch (error) {
                console.error('Sync error for action', action.id, error);
                failCount++;
            }
        }

        setIsSyncing(false);
        fetchDashboardData();
        Alert.alert('Sync Complete', `Successfully synced ${successCount} items. ${failCount > 0 ? `${failCount} failed.` : ''}`);
    };

    const MenuOverlay = () => (
        <Modal
            visible={menuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
        >
            <TouchableOpacity
                style={styles.menuOverlay}
                activeOpacity={1}
                onPress={() => setMenuVisible(false)}
            >
                <View style={styles.menuContainer}>
                    <View style={styles.menuHeader}>
                        <Text style={styles.menuTitle}>Menu</Text>
                        <TouchableOpacity onPress={() => setMenuVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/(agent)/home')}>
                        <Ionicons name="grid-outline" size={20} color="#333" />
                        <Text style={styles.menuItemText}>Dashboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/(agent)/create-plan')}>
                        <Ionicons name="location-outline" size={20} color="#333" />
                        <Text style={styles.menuItemText}>Create Plan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/(agent)/visits/list')}>
                        <Ionicons name="calendar-outline" size={20} color="#333" />
                        <Text style={styles.menuItemText}>My Visits</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('logout')}>
                        <Ionicons name="log-out-outline" size={20} color="#d9534f" />
                        <Text style={[styles.menuItemText, { color: '#d9534f' }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const renderHighPriorityItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.hpCard}
            onPress={() => router.push(`/(agent)/visits/${item.id}`)}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={styles.hpBadge}>
                    <Text style={styles.hpBadgeText}>High Priority</Text>
                </View>
                <Text style={styles.hpDate}>{new Date(item.scheduledDate).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.hpTitle} numberOfLines={1}>{item.location?.name}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Text style={styles.hpDetailText}>📍 {item.location?.district}</Text>
                <Text style={styles.hpDetailText}>🏢 {item.location?.block}</Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: '#fff', marginTop: 8, alignSelf: 'flex-start' }]}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#DC2626' }}>TYPE: {item.location?.stationType || 'N/A'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <MenuOverlay />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuTrigger}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{user?.name[0]}</Text>
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.greeting}>Good morning,</Text>
                        <Text style={styles.userName}>{user?.name.split(' ')[0]}</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.weatherCard}>
                        <Ionicons name="sunny" size={18} color="#F59E0B" />
                        <Text style={styles.tempText}>28°C</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconCircle}>
                        <Ionicons name="notifications-outline" size={22} color="#4B5563" />
                        <View style={styles.notifDot} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.analyticsRow}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        style={styles.mainProgressCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Today's Target</Text>
                            <Text style={styles.progressPercent}>
                                {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                            </Text>
                        </View>

                        <View style={styles.mainBarBg}>
                            <View style={[styles.mainBarFill, { width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }]} />
                        </View>

                        <View style={styles.progressFooter}>
                            <Text style={styles.progressSubText}>{stats.completed} of {stats.total} visits done</Text>
                            <Ionicons name="trending-up" size={16} color="#fff" />
                        </View>
                    </LinearGradient>

                    <View style={styles.sideStats}>
                        <View style={styles.miniStatCard}>
                            <Text style={styles.miniStatVal}>{stats.highPriorityPending}</Text>
                            <Text style={styles.miniStatLabel}>Critical</Text>
                        </View>
                        <View style={[styles.miniStatCard, { marginTop: 10 }]}>
                            <Text style={styles.miniStatVal}>{pendingReports}</Text>
                            <Text style={styles.miniStatLabel}>Offline</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.coverageRow}>
                    <View style={styles.coverageItem}>
                        <Ionicons name="map-outline" size={16} color="#666" />
                        <Text style={styles.coverageText}>{stats.districts || 0} Districts</Text>
                    </View>
                    <View style={styles.coverageItem}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.coverageText}>{stats.blocks || 0} Blocks</Text>
                    </View>
                    <View style={styles.coverageItem}>
                        <Ionicons name="options-outline" size={16} color="#666" />
                        <Text style={styles.coverageText}>All Types</Text>
                    </View>
                </View>

                {stats.highPriorityPending > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                            <Text style={[styles.sectionHeader, { marginBottom: 0, color: '#DC2626' }]}>Attention Required</Text>
                        </View>
                        <FlatList
                            horizontal
                            data={highPriorityVisits}
                            renderItem={renderHighPriorityItem}
                            keyExtractor={item => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </View>
                )}

                <View style={styles.cardsRow}>
                    <TouchableOpacity
                        style={styles.actionCardWrapper}
                        onPress={() => router.push('/(agent)/create-plan')}
                    >
                        <LinearGradient
                            colors={['#7C3AED', '#9F67FF']}
                            style={styles.actionCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.actionCardHeader}>
                                <Text style={styles.actionCardTitle}>Plan Visits</Text>
                                <Ionicons name="calendar" size={20} color="rgba(255,255,255,0.7)" />
                            </View>

                            <View style={styles.actionCardContent}>
                                <View>
                                    <Text style={styles.actionMainText}>Create New Plan</Text>
                                    <Text style={styles.actionSubText}>Schedule upcoming visits</Text>
                                </View>
                                <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.statusCard}>
                        <Text style={styles.statusCardTitle}>Data Sync</Text>
                        <View style={styles.statusCountContainer}>
                            <Text style={styles.statusCount}>{pendingReports}</Text>
                            <Text style={styles.statusLabel}>Changes Pending</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#999', marginTop: 10 }}>Auto-syncs when online</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>Today's Agenda</Text>
                        <TouchableOpacity onPress={() => router.push('/(agent)/visits/list')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryVisitCard}
                        onPress={() => router.push('/(agent)/visits/list')}
                    >
                        <View style={styles.visitCardMain}>
                            <View style={styles.visitIconBox}>
                                <Ionicons name="navigate" size={24} color="#7C3AED" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.visitMainTitle}>Next Destination</Text>
                                <Text style={styles.visitSubTitle}>
                                    {visits.find(v => v.status === 'IN_PROGRESS')?.location?.name ||
                                        visits.find(v => v.status === 'SCHEDULED')?.location?.name ||
                                        'No visits scheduled'}
                                </Text>
                                {(visits.find(v => v.status === 'IN_PROGRESS')?.location?.stationNumber ||
                                    visits.find(v => v.status === 'SCHEDULED')?.location?.stationNumber) && (
                                        <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                                            #{visits.find(v => v.status === 'IN_PROGRESS')?.location?.stationNumber ||
                                                visits.find(v => v.status === 'SCHEDULED')?.location?.stationNumber}
                                        </Text>
                                    )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </View>

                        <View style={styles.visitCardDivider} />

                        <View style={styles.visitMetaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={14} color="#6B7280" />
                                <Text style={styles.metaText}>Optimized Route</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="flash-outline" size={14} color="#6B7280" />
                                <Text style={styles.metaText}>High Priority</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Quick Actions</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={[styles.gridItem, { backgroundColor: '#F3E8FF' }]}
                            onPress={() => router.push('/(agent)/create-plan')}
                        >
                            <View style={[styles.gridIcon, { backgroundColor: '#E9D5FF' }]}>
                                <Ionicons name="calendar" size={22} color="#7C3AED" />
                            </View>
                            <Text style={styles.gridLabel}>Plan Tour</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.gridItem, { backgroundColor: '#DBEAFE' }]}
                            onPress={() => router.push('/(agent)/create-location')}
                        >
                            <View style={[styles.gridIcon, { backgroundColor: '#BFDBFE' }]}>
                                <Ionicons name="location" size={22} color="#2563EB" />
                            </View>
                            <Text style={styles.gridLabel}>Add Station</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.gridItem, { backgroundColor: '#DCFCE7' }]}
                            onPress={handleSync}
                        >
                            <View style={[styles.gridIcon, { backgroundColor: '#BBF7D0' }]}>
                                <Ionicons name="sync" size={22} color="#16A34A" />
                            </View>
                            <Text style={styles.gridLabel}>Sync Data</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.gridItem, { backgroundColor: '#FEF3C7' }]}
                            onPress={() => setPassModal(true)}
                        >
                            <View style={[styles.gridIcon, { backgroundColor: '#FDE68A' }]}>
                                <Ionicons name="shield-checkmark" size={22} color="#D97706" />
                            </View>
                            <Text style={styles.gridLabel}>Security</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Recent Activity</Text>
                    <View style={styles.feedCard}>
                        <View style={styles.feedItem}>
                            <View style={[styles.feedDot, { backgroundColor: '#10B981' }]} />
                            <View style={styles.feedContent}>
                                <Text style={styles.feedTitle}>Visit Completed</Text>
                                <Text style={styles.feedTime}>2 hours ago • Bagha-II Station</Text>
                            </View>
                        </View>
                        <View style={styles.feedDivider} />
                        <View style={styles.feedItem}>
                            <View style={[styles.feedDot, { backgroundColor: '#F59E0B' }]} />
                            <View style={styles.feedContent}>
                                <Text style={styles.feedTitle}>Plan Updated</Text>
                                <Text style={styles.feedTime}>Yesterday • 5 new stations added</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Change Password Modal */}
            <Modal visible={passModal} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Change Password</Text>
                        <TextInput style={{ backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginBottom: 10 }} placeholder="Current Password" value={oldPass} onChangeText={setOldPass} secureTextEntry />
                        <TextInput style={{ backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginBottom: 20 }} placeholder="New Password" value={newPass} onChangeText={setNewPass} secureTextEntry />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }}>
                            <TouchableOpacity onPress={() => setPassModal(false)}><Text style={{ color: '#666', fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={changePassword}><Text style={{ color: 'blue', fontWeight: 'bold' }}>Update</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingTop: 50 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E7FF' },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
    greeting: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuTrigger: { padding: 5 },
    weatherCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7' },
    tempText: { fontSize: 13, fontWeight: 'bold', color: '#D97706' },
    iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },
    content: { padding: 20 },
    analyticsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    mainProgressCard: { flex: 2, padding: 20, borderRadius: 24, justifyContent: 'space-between' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    progressPercent: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    mainBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginVertical: 15 },
    mainBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
    progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
    sideStats: { flex: 1 },
    miniStatCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 16, borderLeftWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    miniStatVal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    miniStatLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    section: { marginBottom: 25 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    viewAllText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
    hpCard: { backgroundColor: '#FEF2F2', padding: 15, borderRadius: 15, marginRight: 15, width: 220, borderWidth: 1, borderColor: '#FECACA' },
    hpBadge: { backgroundColor: '#DC2626', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    hpBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    hpDate: { fontSize: 12, color: '#991B1B' },
    hpTitle: { fontSize: 16, fontWeight: 'bold', color: '#7F1D1D', marginTop: 8 },
    hpDetailText: { fontSize: 11, color: '#991B1B', fontWeight: '500' },
    primaryVisitCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    visitCardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    visitIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
    visitMainTitle: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    visitSubTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginTop: 2 },
    visitCardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    visitMetaRow: { flexDirection: 'row', gap: 15 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, color: '#6B7280' },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    gridItem: { width: (width - 52) / 2, padding: 15, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    gridIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    gridLabel: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
    feedCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    feedItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
    feedDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    feedContent: { flex: 1 },
    feedTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
    feedTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    feedDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 20 },
    coverageRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 25, borderBottomWidth: 3, borderBottomColor: '#7C3AED' },
    coverageItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    coverageText: { fontSize: 13, fontWeight: 'bold', color: '#444' },
    cardsRow: { flexDirection: width > 600 ? 'row' : 'column', gap: 15, marginBottom: 25 },
    actionCardWrapper: { flex: 1.5, minWidth: 200 },
    actionCard: { borderRadius: 16, padding: 20, minHeight: 160, justifyContent: 'space-between' },
    actionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    actionCardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    actionCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    actionMainText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    actionSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
    statusCard: { flex: 1, minWidth: 150, backgroundColor: '#fff', borderRadius: 16, padding: 15, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    statusCardTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 10, alignSelf: 'flex-start' },
    statusCountContainer: { alignItems: 'center' },
    statusCount: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    statusLabel: { color: '#6B7280', fontSize: 11 },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    menuContainer: { backgroundColor: '#fff', width: 280, height: '100%', padding: 20 },
    menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 40 },
    menuTitle: { fontSize: 20, fontWeight: 'bold' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
    menuItemText: { fontSize: 16, color: '#333' },
    menuDivider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
});
