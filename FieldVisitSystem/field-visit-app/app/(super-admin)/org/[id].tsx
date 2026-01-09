import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch, FlatList, Modal, TextInput, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import api from '../../../src/services/api.service';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { stations } from '../../data/stations';

const SOCKET_URL = 'http://localhost:3000'; // Adjust if running on device


export default function OrgDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);



    // Admin Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPass, setNewPass] = useState('');
    // Edit Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPass, setEditPass] = useState('');
    const [isAgent, setIsAgent] = useState(false); // Toggle for Role

    // Delete Confirmation State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    // Live Tracking State
    const [trackingModalVisible, setTrackingModalVisible] = useState(false);
    const [trackingAgent, setTrackingAgent] = useState<any>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [agentLocation, setAgentLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [allLocations, setAllLocations] = useState<Record<string, { lat: number, lng: number, name: string }>>({});
    const iframeRef = useRef<any>(null);
    const [mapTheme, setMapTheme] = useState('silver');

    // ... existing code ...

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/users/${userToDelete.id}`);
            if (Platform.OS === 'web') alert('User deleted');
            else Alert.alert('Success', 'User deleted');
            fetchOrg();
        } catch (e: any) {
            const msg = e.response?.data?.error || 'Failed to delete';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Error', msg);
        } finally {
            setDeleteModalVisible(false);
            setUserToDelete(null);
        }
    };

    // ... existing code ...



    // Data State

    const fetchOrg = async () => {
        try {
            const res = await api.get(`/organizations/${id}`);
            setOrg(res.data);


            // Fetch All Users
            const resUsers = await api.get(`/organizations/${id}/users`);
            setUsers(resUsers.data);

        } catch (error) {
            Alert.alert('Error', 'Failed to load details');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrg(); }, [id]);

    const updateStatus = async (status: string) => {
        try {
            await api.patch(`/organizations/${id}/status`, { status });
            fetchOrg();
        } catch (e) { Alert.alert('Error', 'Update failed'); }
    };

    const updatePlan = async (plan: string) => {
        try {
            await api.patch(`/organizations/${id}/plan`, { plan });
            fetchOrg();
        } catch (e) { Alert.alert('Error', 'Update failed'); }
    };



    const createUser = async () => {
        if (!newEmail || !newPass) return Alert.alert('Error', 'Email and Password are required');
        try {
            await api.post('/users', {
                name: newName,
                email: newEmail,
                password: newPass,
                role: isAgent ? 'AGENT' : 'ADMIN',
                organizationId: id
            });

            if (Platform.OS === 'web') {
                alert(`Success: ${isAgent ? 'Agent' : 'Admin'} Created`);
            } else {
                Alert.alert('Success', `${isAgent ? 'Agent' : 'Admin'} Created`);
            }

            setModalVisible(false);
            setNewName(''); setNewEmail(''); setNewPass('');
            fetchOrg();
        } catch (e: any) {
            console.error('Create User Error:', e);
            const errorMsg = e.response?.data?.error || 'Failed to create user';

            if (Platform.OS === 'web') {
                alert(`Error: ${errorMsg}`);
            } else {
                Alert.alert('Error', errorMsg);
            }
        }
    };

    const updateUser = async () => {
        if (!editEmail || !editName) return Alert.alert('Error', 'Name and Email are required');
        try {
            await api.patch(`/users/${editingUser.id}`, {
                name: editName,
                email: editEmail,
                role: editRole,
                password: editPass
            });

            if (Platform.OS === 'web') {
                alert('Success: User Updated');
            } else {
                Alert.alert('Success', 'User Updated');
            }

            setEditModalVisible(false);
            setEditingUser(null);
            fetchOrg();
        } catch (e: any) {
            console.error('Update User Error:', e);
            const errorMsg = e.response?.data?.error || 'Failed to update user';

            if (Platform.OS === 'web') {
                alert(`Error: ${errorMsg}`);
            } else {
                Alert.alert('Error', errorMsg);
            }
        }
    };

    const exportReports = async () => {
        if (Platform.OS === 'web') {
            alert('Exporting Report CSV...');
            // In real app, generate CSV blob and download
        } else {
            Alert.alert('Export', 'Report CSV downloaded to device.');
        }
    };

    // Tab & Data State (Must be declared before conditional returns)
    const [activeTab, setActiveTab] = useState('overview');
    const [visits, setVisits] = useState([]);
    const [reports, setReports] = useState([]);
    const [logs, setLogs] = useState([]);
    const [orgLocations, setOrgLocations] = useState<any[]>([]);

    // Derived State
    const isSuspended = org?.status === 'SUSPENDED';
    const admins = users.filter(u => u.role === 'ADMIN');
    const agents = users.filter(u => u.role === 'AGENT');
    const activityData = [12, 19, 3, 5, 2, 3, 9];

    // Data Fetching for Tabs
    const fetchOrgData = async () => {
        if (!id) return;

        // Only fetch if org is loaded to avoid race conditions, though main fetch handles org
        if (activeTab === 'overview') {
            try {
                const [vRes, rRes, lRes] = await Promise.all([
                    api.get(`/visits?organizationId=${id}`),
                    api.get(`/reports?organizationId=${id}`),
                    api.get(`/locations?organizationId=${id}`)
                ]);
                setVisits(vRes.data);
                setReports(rRes.data);
                setOrgLocations(lRes.data);
            } catch (e) { console.log('Overview stats load error', e); }
        }
        if (activeTab === 'visits') {
            try {
                const res = await api.get(`/visits?organizationId=${id}`);
                setVisits(res.data);
            } catch (e) { console.log('Visits fetch error', e); }
        }
        if (activeTab === 'reports') {
            try {
                const res = await api.get(`/reports?organizationId=${id}`);
                setReports(res.data);
            } catch (e) { console.log('Reports error', e); }
        }
        if (activeTab === 'logs') {
            try {
                const res = await api.get(`/audit-logs?organizationId=${id}`);
                setLogs(res.data);
            } catch (e) { console.log('Logs error', e); }
        }
    };

    useEffect(() => { fetchOrgData(); }, [id, activeTab]);

    // Live Tracking Logic
    useEffect(() => {
        if (trackingModalVisible && trackingAgent) {
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                newSocket.emit('join_room', id); // Join Org Room
                // Trigger simulation for demo purpose
                newSocket.emit('start_simulation', { room: id });
            });

            newSocket.on('update_location', (data: any) => {
                if (trackingAgent) {
                    setAgentLocation({ lat: data.lat, lng: data.lng });
                    if (iframeRef.current && Platform.OS === 'web') {
                        iframeRef.current.contentWindow?.postMessage({
                            type: 'MOVE_AGENT',
                            lat: data.lat,
                            lng: data.lng
                        }, '*');
                    }
                } else {
                    setAllLocations(prev => ({
                        ...prev,
                        [data.agentId]: { lat: data.lat, lng: data.lng, name: data.agentId }
                    }));
                }
            });

            return () => {
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [trackingModalVisible, trackingAgent, id]);

    if (loading || !org) return <ActivityIndicator style={styles.center} />;

    const openTracking = (agent: any) => {
        setTrackingAgent(agent);
        setAgentLocation(null);
        setAllLocations({});
        setTrackingModalVisible(true);
    }


    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {['overview', 'users', 'visits', 'reports', 'logs'].map(tab => (
                <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                        {tab.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderVisits = () => (
        <View>
            <Text style={styles.sectionTitle}>Recent Field Visits</Text>
            {visits.length === 0 ? <Text style={styles.emptyText}>No visits found.</Text> : (
                visits.map((v: any) => (
                    <View key={v.id} style={styles.card}>
                        <View style={styles.row}>
                            <Ionicons name="location-outline" size={24} color="#3b5998" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{v.location?.name || 'Unknown Location'}</Text>
                                <Text style={styles.cardSub}>{v.agent?.name} • {v.status}</Text>
                            </View>
                            <Text style={styles.dateText}>{new Date(v.date || v.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderReports = () => (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Submitted Reports</Text>
                <TouchableOpacity onPress={exportReports} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="download-outline" size={20} color="#3b5998" />
                    <Text style={{ color: '#3b5998', fontWeight: 'bold' }}>Export CSV</Text>
                </TouchableOpacity>
            </View>
            {reports.length === 0 ? <Text style={styles.emptyText}>No reports found.</Text> : (
                reports.map((r: any) => (
                    <View key={r.id} style={styles.card}>
                        <View style={styles.row}>
                            <Ionicons name="document-text-outline" size={24} color="#4caf50" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{r.title || 'Report'}</Text>
                                <Text style={styles.cardSub}>{r.user?.name} • {r.type}</Text>
                            </View>
                            <Text style={styles.dateText}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderLogs = () => (
        <View>
            <Text style={styles.sectionTitle}>System Audit Logs</Text>
            {logs.length === 0 ? <Text style={styles.emptyText}>No logs found.</Text> : (
                logs.map((l: any) => (
                    <View key={l.id} style={styles.logRow}>
                        <Text style={styles.logTime}>{new Date(l.timestamp).toLocaleTimeString()} - {new Date(l.timestamp).toLocaleDateString()}</Text>
                        <Text style={styles.logText}><Text style={{ fontWeight: 'bold' }}>{l.user}</Text> {l.action}</Text>
                        {l.details && <Text style={styles.logDetail}>{l.details}</Text>}
                    </View>
                ))
            )}
        </View>
    );

    const renderUserRow = (user: any) => (
        <View key={user.id} style={styles.adminRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.adminAvatar, { backgroundColor: user.role === 'ADMIN' ? '#3b5998' : '#4caf50' }]}>
                    <Text style={{ color: '#fff' }}>{user.name[0]}</Text>
                </View>
                <View>
                    <Text style={styles.adminName}>{user.name} {user.role === 'ADMIN' && '👑'}</Text>
                    <Text style={styles.adminEmail}>{user.email}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={{ padding: 10 }} onPress={() => {
                    setEditingUser(user);
                    setEditName(user.name);
                    setEditEmail(user.email);
                    setEditRole(user.role);
                    setEditPass(''); // Reset pass
                    setEditModalVisible(true);
                }}>
                    <Ionicons name="pencil-outline" size={24} color="#3b5998" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ padding: 10 }}
                    onPress={() => {
                        setUserToDelete(user);
                        setDeleteModalVisible(true);
                    }}
                >
                    <Ionicons name="trash-outline" size={24} color="red" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Replace the main return logic with tab switching
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <StatusBar style="dark" />
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(super-admin)/welcome')}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{org.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            {renderTabs()}

            {activeTab === 'overview' && (
                <>
                    {/* --- Dashboard Style Overview --- */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                                <Ionicons name="people" size={24} color="#1565c0" />
                            </View>
                            <View>
                                <Text style={styles.statVal}>{users.length}</Text>
                                <Text style={styles.statLabel}>Total Team</Text>
                            </View>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                                <Ionicons name="location" size={24} color="#2e7d32" />
                            </View>
                            <View>
                                <Text style={styles.statVal}>
                                    {visits.filter((v: any) => v.status === 'IN_PROGRESS' || v.status === 'SCHEDULED').length}
                                </Text>
                                <Text style={styles.statLabel}>Active Visits</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statsGrid, { marginTop: 10, marginBottom: 20 }]}>
                        <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                                <Ionicons name="pulse" size={24} color="#f57c00" />
                            </View>
                            <View>
                                <Text style={styles.statVal}>
                                    {users.filter((u: any) => u.lastLoginAt && (new Date().getTime() - new Date(u.lastLoginAt).getTime()) < 15 * 60000).length}
                                </Text>
                                <Text style={styles.statLabel}>Online Agents</Text>
                            </View>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#f3e5f5' }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                                <Ionicons name="document-text" size={24} color="#6a1b9a" />
                            </View>
                            <View>
                                <Text style={styles.statVal}>{reports.length}</Text>
                                <Text style={styles.statLabel}>Reports</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Live Agent Status</Text>
                    {users.filter(u => u.role === 'AGENT').length === 0 ? <Text style={styles.emptyText}>No Agents found.</Text> :
                        users.filter(u => u.role === 'AGENT').map(agent => {
                            const isOnline = agent.lastLoginAt && (new Date().getTime() - new Date(agent.lastLoginAt).getTime() < 15 * 60000);
                            return (
                                <View key={agent.id} style={styles.agentRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4caf50' : '#bdbdbd' }]} />
                                        <View>
                                            <Text style={styles.agentName}>{agent.name}</Text>
                                            <Text style={styles.agentLoc}>
                                                {isOnline ? 'Online' : 'Offline'} • {agent.lastKnownLocation ? '📍 ' + agent.lastKnownLocation : 'Unknown Location'}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.trackBtn} onPress={() => openTracking(agent)}>
                                        <Text style={styles.trackBtnText}>Track</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                    {/* --- Quick Actions --- */}
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setActiveTab('users'); setModalVisible(true); setIsAgent(false); }}>
                            <Ionicons name="person-add" size={20} color="#fff" />
                            <Text style={styles.quickActionText}>Add Admin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#4caf50' }]} onPress={() => { setActiveTab('users'); setModalVisible(true); setIsAgent(true); }}>
                            <Ionicons name="bicycle" size={20} color="#fff" />
                            <Text style={styles.quickActionText}>Add Agent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#ff9800' }]} onPress={() => setActiveTab('reports')}>
                            <Ionicons name="document-text" size={20} color="#fff" />
                            <Text style={styles.quickActionText}>View Reports</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#9c27b0' }]} onPress={() => openTracking(null)}>
                            <Ionicons name="map" size={20} color="#fff" />
                            <Text style={styles.quickActionText}>Live Map</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Organization Settings</Text>

                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <Text style={styles.orgName}>Status & Plan</Text>
                            <View style={[styles.badge, { backgroundColor: isSuspended ? '#ffebee' : '#e8f5e9' }]}>
                                <Text style={{ color: isSuspended ? 'red' : 'green', fontWeight: 'bold' }}>{org.status}</Text>
                            </View>
                        </View>

                        {/* Status Toggle */}
                        <View style={{ marginBottom: 15 }}>
                            {isSuspended ? (
                                <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => updateStatus('ACTIVE')}>
                                    <Text style={styles.btnText}>Activate Organization</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => updateStatus('SUSPENDED')}>
                                    <Text style={styles.btnText}>Suspend Organization</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.btn, { backgroundColor: '#c62828', marginTop: 10 }]} onPress={() => {
                                setUserToDelete(null); /* Reuse existing modal or add new one, here simply prompt */
                                if (Platform.OS === 'web') {
                                    if (confirm('Permanently Delete this Organization?')) {
                                        api.delete(`/organizations/${id}`).then(() => router.replace('/(super-admin)/welcome'));
                                    }
                                } else {
                                    Alert.alert('Delete', 'Permanently Delete?', [
                                        { text: 'Cancel' },
                                        {
                                            text: 'Delete', style: 'destructive', onPress: () => {
                                                api.delete(`/organizations/${id}`).then(() => router.replace('/(super-admin)/welcome'));
                                            }
                                        }
                                    ])
                                }
                            }}>
                                <Text style={styles.btnTextWhite}>Delete Organization</Text>
                            </TouchableOpacity>    </View>

                        {/* Plan Toggle */}
                        <View style={[styles.row, { marginBottom: 0 }]}>
                            <TouchableOpacity onPress={() => updatePlan('FREE')} style={[styles.planBtn, org.plan === 'FREE' && styles.planActive]}>
                                <Text style={[styles.planText, org.plan === 'FREE' && styles.planTextActive]}>Free</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updatePlan('PRO')} style={[styles.planBtn, org.plan === 'PRO' && styles.planActive]}>
                                <Text style={[styles.planText, org.plan === 'PRO' && styles.planTextActive]}>Pro</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updatePlan('ENTERPRISE')} style={[styles.planBtn, org.plan === 'ENTERPRISE' && styles.planActive]}>
                                <Text style={[styles.planText, org.plan === 'ENTERPRISE' && styles.planTextActive]}>Ent</Text>
                            </TouchableOpacity>
                        </View>
                    </View>



                    {/* Weekly Activity Chart (Moved to bottom) */}
                    <View style={styles.card}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 15 }}>Weekly Activity (Visits)</Text>
                        <View style={styles.chartContainer}>
                            {activityData.map((val, idx) => (
                                <View key={idx} style={styles.barContainer}>
                                    <View style={[styles.bar, { height: val * 5, backgroundColor: idx === 6 ? '#3b5998' : '#e0e0e0' }]} />
                                    <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </>
            )}

            {activeTab === 'users' && (
                <>
                    <Text style={styles.sectionTitle}>Organization Admins</Text>
                    <View style={styles.card}>
                        {admins.map(renderUserRow)}
                        {admins.length === 0 && <Text style={styles.emptyText}>No Admins</Text>}
                        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsAgent(false); setModalVisible(true); }}>
                            <Text style={styles.btnTextPrimary}>+ Add Admin User</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Field Agents</Text>
                    <View style={styles.card}>
                        {agents.map(renderUserRow)}
                        {agents.length === 0 && <Text style={styles.emptyText}>No Agents</Text>}
                        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsAgent(true); setModalVisible(true); }}>
                            <Text style={styles.btnTextPrimary}>+ Add New User</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {activeTab === 'visits' && renderVisits()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'logs' && renderLogs()}


            <View style={{ height: 50 }} />

            {/* Create User Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>New User</Text>
                    <Text style={styles.modalSub}>Create user for {org.name}</Text>

                    <TextInput placeholder="Full Name" style={styles.input} value={newName} onChangeText={setNewName} />
                    <TextInput placeholder="Email Address" style={styles.input} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
                    <TextInput placeholder="Password" style={styles.input} value={newPass} onChangeText={setNewPass} secureTextEntry />



                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={createUser}><Text style={styles.confirmText}>Create User</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit User Modal */}
            <Modal animationType="slide" transparent={true} visible={editModalVisible}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Edit User</Text>
                    <Text style={styles.modalSub}>Update user details for {org.name}</Text>

                    <TextInput placeholder="Full Name" style={styles.input} value={editName} onChangeText={setEditName} />
                    <TextInput placeholder="Email Address" style={styles.input} value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" />
                    <TextInput placeholder="New Password (optional)" style={styles.input} value={editPass} onChangeText={setEditPass} secureTextEntry />



                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => { setEditModalVisible(false); setEditingUser(null); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={updateUser}><Text style={styles.confirmText}>Update User</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal animationType="fade" transparent={true} visible={deleteModalVisible}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Confirm Delete</Text>
                    <Text style={styles.modalSub}>Are you sure you want to remove {userToDelete?.name}?</Text>

                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={confirmDeleteUser}><Text style={[styles.confirmText, { color: 'red' }]}>Delete</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Live Tracking Modal */}
            <Modal animationType="slide" transparent={false} visible={trackingModalVisible} onRequestClose={() => setTrackingModalVisible(false)}>

                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setTrackingModalVisible(false)} style={{ padding: 20 }}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Tracking: {trackingAgent?.name}</Text>
                        <View style={{ width: 50 }} />
                    </View>

                    {Platform.OS === 'web' ? (
                        <View style={{ flex: 1 }}>
                            {agentLocation || (!trackingAgent && Object.keys(allLocations).length >= 0) ? (
                                <View style={{ flex: 1 }}>
                                    {/* @ts-ignore: Render pure HTML iframe on web */}
                                    <iframe
                                        ref={iframeRef}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        srcDoc={`
                                        <html>
                                        <head>
                                            <script src="https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"></script>
                                            <style>
                                                body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: sans-serif; }
                                                .map-control { position: absolute; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; font-size: 13px; font-weight: 600; color: #1a237e; cursor: pointer; border: none; }
                                                .theme-control { top: 10px; right: 10px; }
                                                .traffic-control { top: 60px; right: 10px; }
                                                .focus-control { bottom: 100px; right: 10px; background: #1a237e; color: white; }
                                                .info-card { position: absolute; bottom: 20px; left: 20px; right: 80px; background: rgba(255,255,255,0.9); backdrop-filter: blur(5px); padding: 15px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); z-index: 10; }
                                                .info-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                                                .info-sub { font-size: 11px; color: #666; }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="info-card">
                                                <div class="info-title">📍 Live Tracking Mode</div>
                                                <div class="info-sub" id="status-text">Agent: ${trackingAgent?.name || 'Monitoring Fleet'}</div>
                                            </div>
                                            <select class="map-control theme-control" onchange="setTheme(this.value)">
                                                <option value="silver">Silver Theme</option>
                                                <option value="dark">Dark Mode</option>
                                                <option value="retro">Retro Style</option>
                                            </select>
                                            <button class="map-control traffic-control" onclick="toggleTraffic()">🚦 Traffic</button>
                                            <button class="map-control focus-control" onclick="focusAgent()">🎯 Focus</button>
                                            
                                            <div id="map"></div>
                                            <script>
                                                var map, trafficLayer, clusterer, mainMarker;
                                                var themes = {
                                                    silver: [
                                                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                                                        { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
                                                        { "featureType": "landscape", "stylers": [{ "color": "#f5f5f5" }] }
                                                    ],
                                                    dark: [
                                                        { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
                                                        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
                                                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
                                                        { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
                                                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                                                        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
                                                        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
                                                    ],
                                                    retro: [
                                                        { "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] },
                                                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] },
                                                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                                                        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] }
                                                    ]
                                                };

                                                window.initMap = function() {
                                                    var lat = ${agentLocation?.lat || 28.6139};
                                                    var lng = ${agentLocation?.lng || 77.2090};
                                                    map = new google.maps.Map(document.getElementById('map'), {
                                                        center: {lat: lat, lng: lng},
                                                        zoom: ${trackingAgent ? 16 : 10},
                                                        styles: themes.silver,
                                                        disableDefaultUI: false,
                                                        mapTypeControl: false,
                                                        streetViewControl: true
                                                    });

                                                    trafficLayer = new google.maps.TrafficLayer();

                                                    if (${!!trackingAgent}) {
                                                        mainMarker = new google.maps.Marker({
                                                            position: {lat: lat, lng: lng},
                                                            map: map,
                                                            title: '${trackingAgent?.name}',
                                                            icon: {
                                                                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                                                scale: 8,
                                                                fillColor: "#1a237e",
                                                                fillOpacity: 1,
                                                                strokeWeight: 3,
                                                                strokeColor: "#fff",
                                                            },
                                                            animation: google.maps.Animation.DROP
                                                        });
                                                    } else {
                                                        var stations = ${JSON.stringify(orgLocations.length > 0 ? orgLocations : stations.slice(0, 100))};
                                                        var infoWindow = new google.maps.InfoWindow();
                                                        var bounds = new google.maps.LatLngBounds();

                                                        var markers = stations.map(st => {
                                                            var color = st.stationType === 'AWS' ? 'red' : 'blue';
                                                            if (st.stationType === 'ARG') color = 'green';
                                                            if (st.stationType === 'AWLR') color = 'orange';
                                                            
                                                            var marker = new google.maps.Marker({
                                                                position: {lat: parseFloat(st.lat || st.latitude), lng: parseFloat(st.lng || st.longitude)},
                                                                title: st.name,
                                                                icon: 'http://maps.google.com/mapfiles/ms/icons/' + color + '-dot.png'
                                                            });

                                                            bounds.extend(marker.getPosition());

                                                            marker.addListener('click', () => {
                                                                var content = \`
                                                                    <div style="padding:10px; min-width:180px;">
                                                                        <h3 style="margin:0 0 5px 0; color:#1a237e; font-size:14px;">\${st.name}</h3>
                                                                        <div style="font-weight:bold; color:#6366f1; font-size:12px; margin-bottom:8px;">#\${st.stationNumber || 'N/A'}</div>
                                                                        <div style="font-size:11px; color:#444; line-height:1.4;">
                                                                            <span style="color:#666; font-weight:600;">Type:</span> \${st.stationType || 'N/A'}<br/>
                                                                            <span style="color:#666; font-weight:600;">District:</span> \${st.district || 'N/A'}<br/>
                                                                            <span style="color:#666; font-weight:600;">Block:</span> \${st.block || 'N/A'}<br/>
                                                                            <span style="color:#666; font-weight:600;">Last Visited:</span> \${st.lastVisited ? new Date(st.lastVisited).toLocaleDateString() : 'Never'}
                                                                        </div>
                                                                        <div style="margin-top:10px; border-top:1px solid #eee; padding-top:8px;">
                                                                            <a href="#" style="color:#1a237e; font-size:11px; text-decoration:none; font-weight:bold;">View Full History →</a>
                                                                        </div>
                                                                    </div>
                                                                \`;
                                                                infoWindow.setContent(content);
                                                                infoWindow.open(map, marker);
                                                            });
                                                            return marker;
                                                        });
                                                        
                                                        clusterer = new markerClusterer.MarkerClusterer({ map, markers });
                                                        if (stations.length > 0) map.fitBounds(bounds);
                                                    }
                                                };

                                                window.setTheme = (t) => map.setOptions({ styles: themes[t] });
                                                window.toggleTraffic = () => trafficLayer.setMap(trafficLayer.getMap() ? null : map);
                                                window.focusAgent = () => { if (mainMarker) map.panTo(mainMarker.getPosition()); };

                                                window.addEventListener('message', function(event) {
                                                    var data = event.data;
                                                    if (data.type === 'MOVE_AGENT' && mainMarker) {
                                                        var newPos = new google.maps.LatLng(data.lat, data.lng);
                                                        mainMarker.setPosition(newPos);
                                                        document.getElementById('status-text').innerText = "Last Updated: " + new Date().toLocaleTimeString();
                                                    }
                                                });
                                            </script>
                                            <script src="https://maps.googleapis.com/maps/api/js?key=&callback=initMap" async defer></script>
                                        </body>
                                        </html>
                                    `}
                                    />
                                </View>
                            ) : (
                                <View style={styles.center}><ActivityIndicator size="large" /><Text>Connecting to Agent...</Text></View>
                            )}
                            <View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
                                <Text style={{ textAlign: 'center' }}>Real-time location triggered via Socket.io</Text>
                                {agentLocation && <Text style={{ textAlign: 'center', color: '#666' }}>Lat: {agentLocation.lat.toFixed(4)}, Lng: {agentLocation.lng.toFixed(4)}</Text>}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.center}>
                            <Text>Map View requires native configuration.</Text>
                            <Text>Lat: {agentLocation?.lat.toFixed(4) || 'Waiting...'}</Text>
                            <Text>Lng: {agentLocation?.lng.toFixed(4) || 'Waiting...'}</Text>
                        </View>
                    )}
                </View>
            </Modal>

        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#f5f7fa', padding: 20, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },

    card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    orgName: { fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    meta: { color: '#888', marginBottom: 20 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee', paddingTop: 15 },
    stat: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 12, color: '#888' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555', marginLeft: 5 },

    btn: { padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 5 },
    btnDanger: { backgroundColor: '#ffebee' },
    btnSuccess: { backgroundColor: '#e8f5e9' },
    btnPrimary: { backgroundColor: '#3b5998', marginTop: 15 },
    btnOutline: { borderWidth: 1, borderColor: '#3b5998', backgroundColor: '#fff' },
    btnText: { fontWeight: 'bold', color: '#333' },
    btnTextWhite: { fontWeight: 'bold', color: '#fff' },
    btnTextPrimary: { fontWeight: 'bold', color: '#3b5998' },
    emptyText: { color: '#999', textAlign: 'center', marginBottom: 10 },

    row: { flexDirection: 'row', gap: 10 },
    planBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
    planActive: { backgroundColor: '#3b5998', borderColor: '#3b5998' },
    planText: { color: '#666' },
    planTextActive: { color: '#fff', fontWeight: 'bold' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    switchLabel: { fontSize: 16, color: '#333' },

    adminRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    adminAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    adminName: { fontWeight: 'bold', fontSize: 16 },
    adminEmail: { color: '#666', fontSize: 12 },

    modalView: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 30 },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5, textAlign: 'center' },
    modalSub: { color: '#ddd', textAlign: 'center', marginBottom: 25 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 20, borderRadius: 10 },
    cancelText: { color: 'red', fontSize: 16 },
    confirmText: { color: 'blue', fontSize: 16, fontWeight: 'bold' },

    // Tabs
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, padding: 5 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#3b5998' },
    tabText: { fontWeight: '600', color: '#666' },
    activeTabText: { color: '#fff' },

    // Lists
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardSub: { fontSize: 13, color: '#888', marginTop: 3 },
    dateText: { fontSize: 12, color: '#999' },

    // Charts
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 10 },
    barContainer: { alignItems: 'center', flex: 1 },
    bar: { width: '100%', borderRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 10, color: '#666', marginTop: 5 },

    // Logs
    logRow: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    logTime: { fontSize: 12, color: '#999', marginBottom: 2 },
    logText: { fontSize: 14, color: '#333' },
    logDetail: { fontSize: 12, color: '#666', marginTop: 2, fontStyle: 'italic' },

    // New Dashboard Styles
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    statCard: { flex: 1, padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    iconBox: { padding: 8, borderRadius: 10, marginRight: 10 },
    statsVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    agentRow: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    agentName: { fontWeight: 'bold', color: '#333', fontSize: 15 },
    agentLoc: { color: '#888', fontSize: 12, marginTop: 2 },
    trackBtn: { backgroundColor: '#e8eaf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    trackBtnText: { color: '#3949ab', fontWeight: 'bold', fontSize: 12 },

    quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
    quickActionBtn: { flex: 1, backgroundColor: '#3b5998', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    quickActionText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginTop: 5 },
});
