
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import api from '../../src/services/api.service';

export default function SuperAdminWelcome() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editOrgId, setEditOrgId] = useState('');

    // Change Password State
    const [passModalVisible, setPassModalVisible] = useState(false);
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');

    const changePassword = async () => {
        if (!oldPass || !newPass) return Alert.alert('Error', 'Both fields are required');
        try {
            await api.post('/auth/change-password', { oldPassword: oldPass, newPassword: newPass });
            Alert.alert('Success', 'Password changed successfully');
            setPassModalVisible(false);
            setOldPass(''); setNewPass('');
        } catch (e: any) {
            console.error('Frontend Password change error:', e);
            const msg = e.response?.data?.error || e.message || 'Failed to change password';
            Alert.alert('Error', msg);
        }
    };

    const fetchOrgs = async () => {
        try {
            const res = await api.get('/organizations');
            setOrgs(res.data);
            if (res.data.length === 0) setModalVisible(true); // Prompt create if none exist
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrgs(); }, []);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<{ id: string, name: string } | null>(null);

    const checkDeleteOrg = (orgId: string, orgName: string) => {
        setOrgToDelete({ id: orgId, name: orgName });
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!orgToDelete) return;
        try {
            await api.delete(`/organizations/${orgToDelete.id}`);
            setDeleteModalVisible(false);
            setOrgToDelete(null);
            fetchOrgs();
            Alert.alert('Success', 'Organization deleted');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to delete organization');
        }
    };

    const createOrg = async () => {
        if (!newOrgName.trim()) return Alert.alert('Error', 'Organization Name is required');

        try {
            if (isEditing) {
                await api.patch(`/organizations/${editOrgId}`, { name: newOrgName });
                Alert.alert('Success', 'Organization Updated');
            } else {
                await api.post('/organizations', { name: newOrgName });
                Alert.alert('Success', 'Organization Created');
            }
            setModalVisible(false);
            setNewOrgName('');
            setIsEditing(false);
            fetchOrgs();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to save');
        }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setNewOrgName('');
        setModalVisible(true);
    };

    const openEditModal = (org: any) => {
        setIsEditing(true);
        setEditOrgId(org.id);
        setNewOrgName(org.name);
        setModalVisible(true);
    };

    const renderOrgItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(super-admin)/org/${item.id}`)}
        >
            <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>{item.name[0]}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>ID: {item.id.split('-')[0]}... • {item.status}</Text>
            </View>
            <TouchableOpacity onPress={() => openEditModal(item)} style={{ padding: 10 }}>
                <Ionicons name="pencil-outline" size={20} color="#3b5998" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => checkDeleteOrg(item.id, item.name)} style={{ padding: 10 }}>
                <Ionicons name="trash-outline" size={20} color="#ff5252" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Welcome, Super Admin</Text>
                    <Text style={styles.subWelcome}>Select an organization to manage or create a new one.</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => setPassModalVisible(true)} style={styles.logoutBtn}>
                        <Ionicons name="key-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
                    <Ionicons name="add-circle" size={24} color="#3b5998" />
                    <Text style={styles.createBtnText}>Create New Organization</Text>
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color="#fff" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={orgs}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderOrgItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No organizations found. Create one to get started.</Text>
                    }
                />
            )}

            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{isEditing ? 'Edit Organization' : 'New Organization'}</Text>
                        <TextInput
                            placeholder="Organization Name"
                            style={styles.input}
                            value={newOrgName}
                            onChangeText={setNewOrgName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCancel}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={createOrg} style={styles.modalConfirm}>
                                <Text style={styles.modalConfirmText}>{isEditing ? 'Update' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal animationType="fade" transparent={true} visible={deleteModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Delete</Text>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
                            Are you sure you want to delete {orgToDelete?.name}? This action cannot be undone.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalCancel}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDelete} style={[styles.modalConfirm, { backgroundColor: '#ff5252' }]}>
                                <Text style={styles.modalConfirmText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal animationType="slide" transparent={true} visible={passModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TextInput
                            placeholder="Current Password"
                            style={styles.input}
                            value={oldPass}
                            onChangeText={setOldPass}
                            secureTextEntry
                        />
                        <TextInput
                            placeholder="New Password"
                            style={styles.input}
                            value={newPass}
                            onChangeText={setNewPass}
                            secureTextEntry
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setPassModalVisible(false)} style={styles.modalCancel}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={changePassword} style={styles.modalConfirm}>
                                <Text style={styles.modalConfirmText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a237e' },
    header: { padding: 25, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcome: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    subWelcome: { color: 'rgba(255,255,255,0.7)', marginTop: 5, fontSize: 14, maxWidth: '80%' },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },

    actionContainer: { paddingHorizontal: 20, marginBottom: 20 },
    createBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    createBtnText: { color: '#3b5998', fontWeight: 'bold', fontSize: 16 },

    list: { padding: 20 },
    card: { backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardIconText: { color: '#3b5998', fontWeight: 'bold', fontSize: 20 },
    cardContent: { flex: 1 },
    cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    cardSub: { color: 'rgba(255,255,255,0.6)', marginTop: 4 },

    emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 50, fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { backgroundColor: '#f5f7fa', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e0e0e0' },
    modalActions: { flexDirection: 'row', gap: 15 },
    modalCancel: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#f5f7fa' },
    modalConfirm: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#3b5998' },
    modalCancelText: { color: '#666', fontWeight: 'bold' },
    modalConfirmText: { color: '#fff', fontWeight: 'bold' }
});
