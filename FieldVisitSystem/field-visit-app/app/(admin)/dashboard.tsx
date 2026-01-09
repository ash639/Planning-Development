
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ActivityIndicator, Switch, ScrollView, Platform, Dimensions, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useEffect, useState, useCallback } from 'react';
import api from '../../src/services/api.service';
import { API_URL } from '../../src/config/api.config';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Types
type Tab = 'overview' | 'users' | 'visits' | 'reports';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(false);

    // Data
    const [users, setUsers] = useState<any[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeVisits: 0, pendingReports: 0, onlineAgents: 0 });

    // Modals
    const [inviteModal, setInviteModal] = useState(false);
    const [visitModal, setVisitModal] = useState(false);

    // Form States (Invite)
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', isAdmin: false });
    // Form States (Visit)
    const [visitForm, setVisitForm] = useState({ date: '', location: null as any, agent: null as any });

    // Pickers
    const [showLocPicker, setShowLocPicker] = useState(false);
    const [showAgentPicker, setShowAgentPicker] = useState(false);

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

    // --- Data Fetching ---
    const fetchData = async () => {
        if (!user?.organizationId) return;
        setLoading(true);
        try {
            const [uRes, vRes, rRes, lRes] = await Promise.all([
                api.get(`/organizations/${user.organizationId}/users`),
                api.get(`/visits?organizationId=${user.organizationId}`),
                api.get(`/reports/org/${user.organizationId}`),
                api.get(`/locations?organizationId=${user.organizationId}`)
            ]);

            const userList = uRes.data;
            setUsers(userList);
            setVisits(vRes.data);

            // Extract technical reports from completed visits
            const visitReports = vRes.data
                .filter((v: any) => v.status === 'COMPLETED' && v.reportData)
                .map((v: any) => {
                    let rd = v.reportData;
                    try { if (typeof rd === 'string') rd = JSON.parse(rd); } catch (e) { }
                    return {
                        id: `v-${v.id}`,
                        title: `Visit: ${v.location?.name}`,
                        type: 'VISIT_REPORT',
                        createdAt: v.updatedAt || v.createdAt,
                        author: v.agent,
                        content: rd?.premiseCondition || 'Completed'
                    };
                });

            const combinedReports = [...(rRes.data || []), ...visitReports].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setReports(combinedReports);
            setLocations(lRes.data);

            // Calc Stats
            const online = userList.filter((u: any) => u.lastLoginAt && (new Date().getTime() - new Date(u.lastLoginAt).getTime()) < 15 * 60000).length;
            const activeV = vRes.data.filter((v: any) => v.status === 'IN_PROGRESS' || v.status === 'SCHEDULED').length;

            setStats({
                totalUsers: userList.length,
                activeVisits: activeV,
                pendingReports: combinedReports.length,
                onlineAgents: online
            });

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    // --- Actions ---
    const handleInvite = async () => {
        try {
            await api.post('/users', {
                ...inviteForm,
                role: inviteForm.isAdmin ? 'ADMIN' : 'AGENT',
                organizationId: user?.organizationId
            });
            Alert.alert('Success', 'User Invited');
            setInviteModal(false);
            setInviteForm({ name: '', email: '', password: '', isAdmin: false });
            fetchData();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.error || 'Failed'); }
    };

    const handleCreateVisit = async () => {
        if (!visitForm.location || !visitForm.date) return Alert.alert('Missing Info', 'Location and Date required');
        try {
            await api.post('/visits', {
                organizationId: user?.organizationId,
                locationId: visitForm.location.id,
                agentId: visitForm.agent?.id,
                scheduledDate: new Date(visitForm.date).toISOString(),
                status: 'SCHEDULED'
            });
            Alert.alert('Success', 'Visit Scheduled');
            setVisitModal(false);
            fetchData();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.error || 'Failed'); }
    };

    const handleVisitAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        // We'll update status to COMPLETED (Approved) or REJECTED
        const newStatus = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';
        try {
            await api.patch(`/visits/${id}/status`, { status: newStatus });
            fetchData();
        } catch (e) { Alert.alert('Error', 'Action failed'); }
    };

    const toggleUserSuspend = async (id: string, isActive: boolean) => {
        try {
            await api.patch(`/users/${id}/suspend`, { isActive: !isActive });
            fetchData();
        } catch (e) { Alert.alert('Error', 'Update failed'); }
    };

    const exportReports = () => {
        Alert.alert('Export', 'Downloading CSV... (Mock)');
    };

    // --- Render Components ---

    const StatCard = ({ label, value, icon, color, bg }: any) => (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={styles.statVal}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    const OverviewTab = () => (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <StatCard label="Total Team" value={stats.totalUsers} icon="people" color="#1565c0" bg="#e3f2fd" />
                <StatCard label="Active Visits" value={stats.activeVisits} icon="location" color="#2e7d32" bg="#e8f5e9" />
            </View>
            <View style={[styles.statsGrid, { marginTop: 10 }]}>
                <StatCard label="Online Agents" value={stats.onlineAgents} icon="pulse" color="#f57c00" bg="#fff3e0" />
                <StatCard label="Reports" value={stats.pendingReports} icon="document-text" color="#6a1b9a" bg="#f3e5f5" />
            </View>

            {/* Agent Status List */}
            <Text style={styles.sectionTitle}>Live Agent Status</Text>
            {users.filter(u => u.role === 'AGENT').map(agent => {
                // Mock location data if missing
                const isOnline = agent.lastLoginAt && (new Date().getTime() - new Date(agent.lastLoginAt).getTime() < 15 * 60000);
                return (
                    <View key={agent.id} style={styles.agentRow}>
                        <View style={styles.agentInfo}>
                            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4caf50' : '#bdbdbd' }]} />
                            <View>
                                <Text style={styles.agentName}>{agent.name}</Text>
                                <Text style={styles.agentLoc}>
                                    {isOnline ? 'Online' : 'Offline'} • {agent.lastKnownLocation ? '📍 ' + agent.lastKnownLocation : 'Unknown Location'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(admin)/map-view', params: { userId: agent.id } })} style={styles.trackBtn}>
                            <Text style={styles.trackBtnText}>Track</Text>
                        </TouchableOpacity>
                    </View>
                );
            })}
        </ScrollView>
    );

    const UsersTab = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionMainBtn} onPress={() => setInviteModal(true)}>
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <Text style={styles.actionMainBtnText}>Invite User</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={users}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardLeft}>
                            <View style={[styles.avatar, { backgroundColor: item.role === 'ADMIN' ? '#e8eaf6' : '#f5f5f5' }]}>
                                <Text style={styles.avatarText}>{item.name[0]}</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <Text style={styles.cardSub}>{item.role} • {item.email}</Text>
                            </View>
                        </View>
                        <Switch
                            value={item.isActive}
                            onValueChange={() => toggleUserSuspend(item.id, item.isActive)}
                            trackColor={{ false: '#e0e0e0', true: '#c5cae9' }}
                            thumbColor={item.isActive ? '#3949ab' : '#9e9e9e'}
                        />
                    </View>
                )}
            />
        </View>
    );

    const VisitsTab = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionMainBtn} onPress={() => setVisitModal(true)}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.actionMainBtnText}>New Visit</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={visits}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.dateBox}>
                                <Text style={styles.dateDay}>{new Date(item.scheduledDate).getDate()}</Text>
                                <Text style={styles.dateMonth}>{new Date(item.scheduledDate).toLocaleString('default', { month: 'short' })}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.location?.name}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                                    <View style={styles.adminMiniBadge}><Text style={styles.adminMiniBadgeText}>📍 {item.location?.district}</Text></View>
                                    <View style={styles.adminMiniBadge}><Text style={styles.adminMiniBadgeText}>🏢 {item.location?.block}</Text></View>
                                </View>
                                <Text style={styles.cardSub}>Agent: {item.agent?.name || 'Unassigned'}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                        <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: 'bold' }}>{item.status}</Text>
                                    </View>
                                    {item.location?.stationType && (
                                        <View style={styles.adminTypeTag}>
                                            <Text style={styles.adminTypeTagText}>{item.location.stationType}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                        {/* Actions for Scheduled/Completed */}
                        {item.status === 'COMPLETED' ? (
                            <View style={styles.cardActions}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                    <Text style={{ color: 'green', fontSize: 12, fontWeight: 'bold' }}>✓ Done</Text>
                                    {item.travelDistance !== null && item.travelDistance !== undefined && (
                                        <View style={styles.adminDistanceBadge}>
                                            <Ionicons name="navigate-outline" size={10} color="#10B981" />
                                            <Text style={styles.adminDistanceText}>{item.travelDistance.toFixed(3)} km</Text>
                                        </View>
                                    )}
                                    {item.checkInTime && item.checkOutTime && (
                                        <View style={[styles.adminDistanceBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                                            <Ionicons name="time-outline" size={10} color="#3B82F6" />
                                            <Text style={[styles.adminDistanceText, { color: '#1E40AF' }]}>
                                                {Math.round((new Date(item.checkOutTime).getTime() - new Date(item.checkInTime).getTime()) / 60000)} mins
                                            </Text>
                                        </View>
                                    )}
                                    {item.checkInLat && item.location?.latitude && (
                                        <View style={[styles.adminDistanceBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                                            <Ionicons name="pin-outline" size={10} color="#D97706" />
                                            <Text style={[styles.adminDistanceText, { color: '#92400E' }]}>
                                                Prox: {(6371 * 2 * Math.atan2(Math.sqrt(Math.sin(((item.location.latitude - item.checkInLat) * Math.PI / 180) / 2) * Math.sin(((item.location.latitude - item.checkInLat) * Math.PI / 180) / 2) + Math.cos(item.checkInLat * Math.PI / 180) * Math.cos(item.location.latitude * Math.PI / 180) * Math.sin(((item.location.longitude - item.checkInLng) * Math.PI / 180) / 2) * Math.sin(((item.location.longitude - item.checkInLng) * Math.PI / 180) / 2)), Math.sqrt(1 - (Math.sin(((item.location.latitude - item.checkInLat) * Math.PI / 180) / 2) * Math.sin(((item.location.latitude - item.checkInLat) * Math.PI / 180) / 2) + Math.cos(item.checkInLat * Math.PI / 180) * Math.cos(item.location.latitude * Math.PI / 180) * Math.sin(((item.location.longitude - item.checkInLng) * Math.PI / 180) / 2) * Math.sin(((item.location.longitude - item.checkInLng) * Math.PI / 180) / 2))))).toFixed(2)} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.pdfBtn}
                                    onPress={() => Linking.openURL(`${API_URL}/visits/${item.id}/report`)}
                                >
                                    <Ionicons name="download-outline" size={14} color="#4F46E5" />
                                    <Text style={styles.pdfBtnText}>Download PDF</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            // Mocking Approval Flow for Demo: If Pending/Scheduled, Admin can 'Approve' (Finalize) or Cancel
                            <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => handleVisitAction(item.id, 'APPROVE')}><Text style={styles.actionLink}>Approve</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleVisitAction(item.id, 'REJECT')}><Text style={[styles.actionLink, { color: 'red' }]}>Reject</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );

    const ReportsTab = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionSecBtn} onPress={exportReports}>
                    <Ionicons name="download-outline" size={18} color="#333" />
                    <Text style={styles.actionSecBtnText}>Export CSV</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={reports}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Ionicons name="document-text" size={32} color="#5c6bc0" style={{ marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSub}>{item.type} • {new Date(item.createdAt).toLocaleDateString()}</Text>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>by {item.author?.name}</Text>
                        </View>
                        {item.type === 'VISIT_REPORT' ? (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(`${API_URL}/visits/${item.id.replace('v-', '')}/report`)}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="download-outline" size={24} color="#4F46E5" />
                            </TouchableOpacity>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        )}
                    </View>
                )}
            />
        </View>
    );

    const getStatusColor = (s: string) => {
        if (s === 'COMPLETED') return '#2e7d32';
        if (s === 'IN_PROGRESS') return '#f57c00';
        if (s === 'REJECTED') return '#c62828';
        return '#1565c0';
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Admin Portal</Text>
                        <Text style={styles.headerSub}>{user?.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={fetchData}>
                            <Ionicons name="refresh-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/submit-report')}>
                            <Ionicons name="add-circle-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setPassModal(true)}>
                            <Ionicons name="key-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, { flexDirection: 'row', alignItems: 'center', gap: 5 }]} onPress={logout}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>LOGOUT</Text>
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {['overview', 'users', 'visits', 'reports'].map((t) => (
                        <TouchableOpacity key={t} onPress={() => setActiveTab(t as Tab)} style={[styles.tab, activeTab === t && styles.activeTab]}>
                            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            <View style={styles.content}>
                {loading ? <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 50 }} /> : (
                    <>
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'users' && <UsersTab />}
                        {activeTab === 'visits' && <VisitsTab />}
                        {activeTab === 'reports' && <ReportsTab />}
                    </>
                )}
            </View>

            {/* --- Modals (Keep simple logic for now) --- */}
            {/* Invite Modal */}
            <Modal visible={inviteModal} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Invite New Member</Text>
                        <TextInput style={styles.input} placeholder="Full Name" value={inviteForm.name} onChangeText={t => setInviteForm({ ...inviteForm, name: t })} />
                        <TextInput style={styles.input} placeholder="Email" value={inviteForm.email} onChangeText={t => setInviteForm({ ...inviteForm, email: t })} autoCapitalize="none" />
                        <TextInput style={styles.input} placeholder="Password" value={inviteForm.password} onChangeText={t => setInviteForm({ ...inviteForm, password: t })} secureTextEntry />
                        <View style={styles.switchRow}>
                            <Text>Grant Admin Privileges</Text>
                            <Switch value={inviteForm.isAdmin} onValueChange={v => setInviteForm({ ...inviteForm, isAdmin: v })} />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setInviteModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleInvite}><Text style={styles.confirmText}>Send Invite</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal visible={passModal} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TextInput style={styles.input} placeholder="Current Password" value={oldPass} onChangeText={setOldPass} secureTextEntry />
                        <TextInput style={styles.input} placeholder="New Password" value={newPass} onChangeText={setNewPass} secureTextEntry />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setPassModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={changePassword}><Text style={styles.confirmText}>Update</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Visit Modal */}
            <Modal visible={visitModal} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Schedule Visit</Text>
                        <TouchableOpacity style={styles.inputBtn} onPress={() => setShowLocPicker(true)}>
                            <Text>{visitForm.location ? visitForm.location.name : 'Select Location'}</Text>
                            <Ionicons name="caret-down" size={16} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inputBtn} onPress={() => setShowAgentPicker(true)}>
                            <Text>{visitForm.agent ? visitForm.agent.name : 'Assign Agent'}</Text>
                            <Ionicons name="caret-down" size={16} color="#666" />
                        </TouchableOpacity>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={visitForm.date} onChangeText={t => setVisitForm({ ...visitForm, date: t })} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setVisitModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateVisit}><Text style={styles.confirmText}>Schedule</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Location Picker */}
            <Modal visible={showLocPicker} transparent animationType="slide">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerBody}>
                        <Text style={styles.pickerHeader}>Locations</Text>
                        <FlatList data={locations} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={styles.pickerItem} onPress={() => { setVisitForm({ ...visitForm, location: item }); setShowLocPicker(false); }}>
                                <Text style={styles.pickerItemText}>{item.name}</Text>
                            </TouchableOpacity>
                        )} />
                        <TouchableOpacity onPress={() => setShowLocPicker(false)} style={styles.closePicker}><Text>Close</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Agent Picker */}
            <Modal visible={showAgentPicker} transparent animationType="slide">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerBody}>
                        <Text style={styles.pickerHeader}>Agents</Text>
                        <FlatList data={users.filter(u => u.role !== 'SUPER_ADMIN')} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={styles.pickerItem} onPress={() => { setVisitForm({ ...visitForm, agent: item }); setShowAgentPicker(false); }}>
                                <Text style={styles.pickerItemText}>{item.name} ({item.role})</Text>
                            </TouchableOpacity>
                        )} />
                        <TouchableOpacity onPress={() => setShowAgentPicker(false)} style={styles.closePicker}><Text>Close</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

    tabScroll: { marginTop: 10 },
    tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10 },
    activeTab: { backgroundColor: '#fff' },
    tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', fontSize: 12 },
    activeTabText: { color: '#1a237e' },

    content: { flex: 1, paddingTop: 10 },
    scrollContent: { padding: 20 },

    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statCard: { width: width * 0.44, padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    iconBox: { padding: 8, borderRadius: 10, marginRight: 10 },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 11, color: '#666' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 15 },
    agentRow: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    agentInfo: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    agentName: { fontWeight: 'bold', color: '#333', fontSize: 15 },
    agentLoc: { color: '#888', fontSize: 12, marginTop: 2 },
    trackBtn: { backgroundColor: '#e8eaf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    trackBtnText: { color: '#3949ab', fontWeight: 'bold', fontSize: 12 },

    // Lists
    card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: '#5c6bc0' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardSub: { fontSize: 12, color: '#888', marginTop: 2 },

    dateBox: { backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8, alignItems: 'center', marginRight: 15, minWidth: 50 },
    dateDay: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    dateMonth: { fontSize: 10, color: 'red', fontWeight: 'bold', textTransform: 'uppercase' },

    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5 },

    cardActions: { marginLeft: 10, alignItems: 'flex-end', gap: 10 },
    actionLink: { fontSize: 12, fontWeight: 'bold', color: '#1a237e' },

    // Action Bar
    actionBar: { paddingHorizontal: 20, marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-end' },
    actionMainBtn: { flexDirection: 'row', backgroundColor: '#3949ab', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center' },
    actionMainBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
    actionSecBtn: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center' },
    actionSecBtnText: { color: '#333', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },

    // Modals
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
    input: { backgroundColor: '#f5f7fa', padding: 15, borderRadius: 12, marginBottom: 15 },
    inputBtn: { backgroundColor: '#f5f7fa', padding: 15, borderRadius: 12, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
    confirmText: { color: '#3949ab', fontSize: 16, fontWeight: 'bold' },

    // Pickers
    pickerOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerBody: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '50%' },
    pickerHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' },
    pickerItemText: { fontSize: 16, color: '#333' },
    closePicker: { marginTop: 20, alignSelf: 'center', padding: 10 },
    adminMiniBadge: { backgroundColor: '#f0f4ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#d1d9ff' },
    adminMiniBadgeText: { fontSize: 10, color: '#3949ab', fontWeight: 'bold' },
    adminTypeTag: { backgroundColor: '#f5f5f5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    adminTypeTagText: { fontSize: 9, color: '#666', fontWeight: 'bold' },
    adminDistanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' },
    adminDistanceText: { fontSize: 10, color: '#065F46', fontWeight: '800' },
    pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE', marginTop: 8 },
    pdfBtnText: { fontSize: 11, color: '#4F46E5', fontWeight: 'bold' },
});
