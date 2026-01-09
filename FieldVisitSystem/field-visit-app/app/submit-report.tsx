
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import api from '../src/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function SubmitReport() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState('VISIT_REPORT');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title || !content) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (!user?.organizationId) {
            Alert.alert('Error', 'Organization ID missing');
            return;
        }

        try {
            setLoading(true);
            await api.post('/reports', {
                title,
                content,
                type,
                organizationId: user.organizationId
            });

            if (Platform.OS === 'web') alert('Report Submitted Successfully');
            else Alert.alert('Success', 'Report Submitted');

            router.back();
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || 'Submission failed';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const types = ['VISIT_REPORT', 'INCIDENT', 'GENERAL', 'WEEKLY_SUMMARY'];

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Submit Report</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>Report Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Weekly Visit Summary"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Report Type</Text>
                <View style={styles.typeContainer}>
                    {types.map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.typeBtn, type === t && styles.activeTypeBtn]}
                            onPress={() => setType(t)}
                        >
                            <Text style={[styles.typeText, type === t && styles.activeTypeText]}>
                                {t.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Details / Content</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter full report details here..."
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                />

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    backBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

    content: { padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 10, marginTop: 10 },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#e1e4e8' },
    textArea: { height: 200, paddingTop: 15 },

    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    typeBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
    activeTypeBtn: { backgroundColor: '#3b5998', borderColor: '#3b5998' },
    typeText: { color: '#666', fontSize: 12, fontWeight: '600' },
    activeTypeText: { color: '#fff' },

    submitBtn: { backgroundColor: '#3b5998', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30, shadowColor: '#3b5998', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    disabledBtn: { opacity: 0.7 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
