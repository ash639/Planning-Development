import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import api from '../../src/services/api.service';
import { useAuthStore } from '../../src/store/auth.store';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function CreateLocation() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');
    const [stationType, setStationType] = useState('ARG');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const getCurrentLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to get current coordinates.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLat(location.coords.latitude.toString());
            setLng(location.coords.longitude.toString());
        } catch (e) {
            Alert.alert('Error', 'Could not fetch current location');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name || !district || !block || !lat || !lng) {
            Alert.alert('Missing Info', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            await api.post('/locations', {
                name,
                district,
                block,
                stationType,
                address,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                organizationId: user?.organizationId
            });
            Alert.alert('Success', 'New station added successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to create location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#111" />
                </TouchableOpacity>
                <Text style={styles.title}>New Station</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#4F46E5" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Station Name / ID *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Bagha-II AWS" />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>District *</Text>
                        <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="e.g. Patna" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Block *</Text>
                        <TextInput style={styles.input} value={block} onChangeText={setBlock} placeholder="e.g. Block-A" />
                    </View>
                </View>

                <Text style={styles.label}>Station Type</Text>
                <View style={styles.chipRow}>
                    {['ARG', 'AWS', 'AWLR', 'FTS'].map(type => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.chip, stationType === type && styles.chipActive]}
                            onPress={() => setStationType(type)}
                        >
                            <Text style={[styles.chipText, stationType === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>GPS Coordinates *</Text>
                <View style={styles.row}>
                    <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} value={lat} onChangeText={setLat} placeholder="Lat (e.g. 25.1)" keyboardType="numeric" />
                    <TextInput style={[styles.input, { flex: 1 }]} value={lng} onChangeText={setLng} placeholder="Lng (e.g. 85.2)" keyboardType="numeric" />
                </View>
                <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation}>
                    <Ionicons name="navigate" size={18} color="#4F46E5" />
                    <Text style={styles.locationBtnText}>Use My Current Location</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Address / Landmark</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={address} onChangeText={setAddress} placeholder="Detailed location description..." multiline />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#fff', paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    saveText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 },
    form: { padding: 20 },
    label: { fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', marginTop: 20 },
    input: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15 },
    row: { flexDirection: 'row' },
    chipRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
    chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    chipText: { color: '#64748b', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10 },
    locationBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 }
});
