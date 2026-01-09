import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import api from '../../../src/services/api.service';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore } from '../../../src/store/offline.store';
import { useAuthStore } from '../../../src/store/auth.store';

export default function VisitDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { isOnline, addPendingAction, cacheVisit, cachedVisits } = useOfflineStore();
    const { user } = useAuthStore();

    // Initial state from cache if available, else null
    const [visit, setVisit] = useState<any>(cachedVisits[id as string] || null);
    const [loading, setLoading] = useState(!visit);

    const [visitNotes, setVisitNotes] = useState(visit?.notes || '');
    const [photo, setPhoto] = useState<string | null>(visit?.mediaUrls || null);

    // BMSK Specific Fields
    const [premiseCondition, setPremiseCondition] = useState('No-Issue');
    const [installedPosition, setInstalledPosition] = useState('On Ground');
    const [engineerName, setEngineerName] = useState('');

    // Additional Technical Details
    const [batteryVoltage, setBatteryVoltage] = useState('');
    const [solarCondition, setSolarCondition] = useState('Clean');
    const [signalStrength, setSignalStrength] = useState('Good');
    const [raingaugeStatus, setRaingaugeStatus] = useState('Cleaned');
    const [anemometerStatus, setAnemometerStatus] = useState('Working');
    const [tempSensorStatus, setTempSensorStatus] = useState('Working');
    const [fenceCondition, setFenceCondition] = useState('Intact');
    const [gateLockStatus, setGateLockStatus] = useState('Locked');

    useEffect(() => {
        if (user && !engineerName) setEngineerName(user.name);
    }, [user]);

    const fetchVisit = async () => {
        if (!isOnline) {
            if (!visit && cachedVisits[id as string]) {
                setVisit(cachedVisits[id as string]);
            }
            setLoading(false);
            return;
        }

        try {
            const res = await api.get(`/visits/${id}`);
            setVisit(res.data);
            cacheVisit(res.data); // Update cache
            if (res.data.notes) setVisitNotes(res.data.notes);

            // Sync local values if reportData is present
            if (res.data.reportData) {
                try {
                    const rd = typeof res.data.reportData === 'string' ? JSON.parse(res.data.reportData) : res.data.reportData;
                    if (rd.premiseCondition) setPremiseCondition(rd.premiseCondition);
                    if (rd.installedPosition) setInstalledPosition(rd.installedPosition);
                    if (rd.engineerName) setEngineerName(rd.engineerName);
                    if (rd.technical) {
                        if (rd.technical.batteryVoltage) setBatteryVoltage(rd.technical.batteryVoltage);
                        if (rd.technical.solarCondition) setSolarCondition(rd.technical.solarCondition);
                        if (rd.technical.signalStrength) setSignalStrength(rd.technical.signalStrength);
                    }
                } catch (e) { }
            }
        } catch (error) {
            if (!visit) {
                Alert.alert('Error', 'Failed to load visit details');
                router.back();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisit();
    }, [id, isOnline]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const updateStatus = async (status: string) => {
        setLoading(true);

        let payload: any = { status };
        let coords: { latitude?: number, longitude?: number } = {};

        // 1. Capture Position (Critical for Fairness)
        try {
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus === 'granted') {
                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            }
        } catch (e) {
            console.log('Location capture failed', e);
        }

        // Map captured coordinates based on status
        if (status === 'IN_PROGRESS') {
            if (coords.latitude) {
                payload.checkInLat = coords.latitude;
                payload.checkInLng = coords.longitude;
            } else {
                setLoading(false);
                return Alert.alert('Location Required', 'Please enable GPS and grant location permission to start the visit.');
            }
        }

        if (status === 'COMPLETED') {
            if (coords.latitude) {
                payload.checkOutLat = coords.latitude;
                payload.checkOutLng = coords.longitude;
            } else {
                setLoading(false);
                return Alert.alert('Location Required', 'Please enable GPS and grant location permission to complete the visit.');
            }

            payload.notes = visitNotes;
            if (photo) payload.mediaUrls = photo;

            // Calculate distance using the initial check-in (from state or payload)
            const startLat = visit.checkInLat || payload.checkInLat;
            const startLng = visit.checkInLng || payload.checkInLng;

            if (coords.latitude && startLat) {
                const dist = calculateDistance(
                    startLat, startLng,
                    coords.latitude, coords.longitude
                );
                payload.travelDistance = dist;
            }

            payload.reportData = {
                premiseCondition,
                installedPosition,
                engineerName,
                technical: {
                    batteryVoltage,
                    solarCondition,
                    signalStrength,
                    raingaugeStatus,
                    anemometerStatus,
                    tempSensorStatus,
                    fenceCondition,
                    gateLockStatus
                },
                submittedAt: new Date().toISOString()
            };
        }

        // Merge general tracking coords
        const finalPayload = { ...payload, ...coords };

        // 2. Handle Offline / Online
        if (!isOnline) {
            addPendingAction({
                type: 'UPDATE_VISIT_STATUS',
                payload: { visitId: id, ...finalPayload }
            });

            // Optimistic Update for UI
            const updatedVisit = { ...visit, ...finalPayload, updatedAt: new Date().toISOString() };
            if (status === 'IN_PROGRESS') updatedVisit.checkInTime = new Date().toISOString();
            if (status === 'COMPLETED') updatedVisit.checkOutTime = new Date().toISOString();

            setVisit(updatedVisit);
            cacheVisit(updatedVisit);

            Alert.alert('Offline Mode', 'Action saved locally. Will sync when online.');
            if (status === 'COMPLETED') router.back();
            setLoading(false);
            return;
        }

        // 3. Online Execution
        try {
            await api.patch(`/visits/${id}/status`, finalPayload);
            await fetchVisit();
            Alert.alert('Success', `Visit marked as ${status}`);
            if (status === 'COMPLETED') {
                router.back();
            }
        } catch (error) {
            console.error(error);
            addPendingAction({
                type: 'UPDATE_VISIT_STATUS',
                payload: { visitId: id, ...finalPayload }
            });
            const updatedVisit = { ...visit, ...finalPayload, updatedAt: new Date().toISOString() };
            setVisit(updatedVisit);
            cacheVisit(updatedVisit);
            if (status === 'COMPLETED') router.back();
        } finally {
            setLoading(false);
        }
    };

    if (loading || !visit) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <StatusBar style="dark" />
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={16} color="#fff" />
                    <Text style={styles.offlineText}>You are Offline. Changes will sync later.</Text>
                </View>
            )}

            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{visit.location?.name}</Text>
                    {visit.location?.stationNumber && <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 12 }}>#{visit.location.stationNumber}</Text>}
                    <Text style={styles.subtitle}>{visit.location?.address}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>{visit.status}</Text>
                </View>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>{new Date(visit.scheduledDate).toLocaleString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="map-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>{visit.location?.district}, {visit.location?.block}</Text>
                </View>

                {/* Fairness Metrics Block */}
                <View style={styles.integritySection}>
                    {visit.travelDistance !== null && visit.travelDistance !== undefined && (
                        <View style={styles.metricItem}>
                            <Ionicons name="walk-outline" size={16} color="#10B981" />
                            <Text style={styles.metricText}>Travel: {visit.travelDistance.toFixed(3)} km</Text>
                        </View>
                    )}

                    {visit.checkInTime && visit.checkOutTime && (
                        <View style={styles.metricItem}>
                            <Ionicons name="time-outline" size={16} color="#3B82F6" />
                            <Text style={styles.metricText}>
                                Stay: {Math.round((new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / 60000)} mins
                            </Text>
                        </View>
                    )}

                    {visit.checkInLat && visit.location?.latitude && (
                        <View style={styles.metricItem}>
                            <Ionicons name="pin-outline" size={16} color="#F59E0B" />
                            <Text style={styles.metricText}>
                                Dist from Station: {calculateDistance(visit.checkInLat, visit.checkInLng, visit.location.latitude, visit.location.longitude).toFixed(2)} km
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {visit.status === 'IN_PROGRESS' && (
                <View style={styles.executionContainer}>
                    <View style={styles.reportHeader}>
                        <Ionicons name="document-text" size={22} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Field Visit Report</Text>
                    </View>

                    <View style={styles.reportField}>
                        <Text style={styles.label}>Vendor Engineer Name</Text>
                        <TextInput
                            style={styles.inputSmall}
                            value={engineerName}
                            onChangeText={setEngineerName}
                            placeholder="Full Name"
                        />
                    </View>

                    <View style={styles.reportField}>
                        <Text style={styles.label}>Installed Position</Text>
                        <View style={styles.chipRow}>
                            {['On Ground', 'Roof Top', 'Tower'].map(pos => (
                                <TouchableOpacity
                                    key={pos}
                                    style={[styles.chip, installedPosition === pos && styles.chipActive]}
                                    onPress={() => setInstalledPosition(pos)}
                                >
                                    <Text style={[styles.chipText, installedPosition === pos && styles.chipTextActive]}>{pos}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.reportField}>
                        <Text style={styles.label}>Premises Condition</Text>
                        <View style={styles.chipRow}>
                            {['No-Issue', 'Minor Issue', 'Major Issue', 'Vandalism'].map(cond => (
                                <TouchableOpacity
                                    key={cond}
                                    style={[styles.chip, premiseCondition === cond && styles.chipActive, cond.includes('Major') && premiseCondition === cond && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
                                    onPress={() => setPremiseCondition(cond)}
                                >
                                    <Text style={[styles.chipText, premiseCondition === cond && styles.chipTextActive, cond.includes('Major') && premiseCondition === cond && { color: '#EF4444' }]}>{cond}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <View style={styles.reportHeader}>
                        <Ionicons name="flash-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionSubTitle}>Power & Signal</Text>
                    </View>

                    <View style={styles.technicalRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Battery (Volts)</Text>
                            <TextInput
                                style={styles.inputSmall}
                                value={batteryVoltage}
                                onChangeText={setBatteryVoltage}
                                placeholder="e.g. 12.8"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Signal Strength</Text>
                            <View style={styles.chipRowMini}>
                                {['Good', 'Fair', 'Poor'].map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.chipMini, signalStrength === s && styles.chipActive]}
                                        onPress={() => setSignalStrength(s)}
                                    >
                                        <Text style={[styles.chipTextMini, signalStrength === s && styles.chipTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.reportField}>
                        <Text style={styles.miniLabel}>Solar Panel Condition</Text>
                        <View style={styles.chipRowMini}>
                            {['Clean', 'Dirty', 'Damaged'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chipMini, solarCondition === s && styles.chipActive]}
                                    onPress={() => setSolarCondition(s)}
                                >
                                    <Text style={[styles.chipTextMini, solarCondition === s && styles.chipTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <View style={styles.reportHeader}>
                        <Ionicons name="thermometer-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionSubTitle}>Sensor Integrity</Text>
                    </View>

                    <View style={styles.reportField}>
                        <Text style={styles.miniLabel}>Raingauge</Text>
                        <View style={styles.chipRowMini}>
                            {['Cleaned', 'Clogged', 'Defective'].map(s => (
                                <TouchableOpacity key={s} style={[styles.chipMini, raingaugeStatus === s && styles.chipActive]} onPress={() => setRaingaugeStatus(s)}>
                                    <Text style={[styles.chipTextMini, raingaugeStatus === s && styles.chipTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.technicalRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Anemometer</Text>
                            <View style={styles.chipRowMini}>
                                {['Working', 'Stuck'].map(s => (
                                    <TouchableOpacity key={s} style={[styles.chipMini, anemometerStatus === s && styles.chipActive]} onPress={() => setAnemometerStatus(s)}>
                                        <Text style={[styles.chipTextMini, anemometerStatus === s && styles.chipTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>T/H Sensor</Text>
                            <View style={styles.chipRowMini}>
                                {['Working', 'No Data'].map(s => (
                                    <TouchableOpacity key={s} style={[styles.chipMini, tempSensorStatus === s && styles.chipActive]} onPress={() => setTempSensorStatus(s)}>
                                        <Text style={[styles.chipTextMini, tempSensorStatus === s && styles.chipTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <View style={styles.reportHeader}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionSubTitle}>Physical Security</Text>
                    </View>

                    <View style={styles.technicalRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Fence Status</Text>
                            <View style={styles.chipRowMini}>
                                {['Intact', 'Damaged'].map(s => (
                                    <TouchableOpacity key={s} style={[styles.chipMini, fenceCondition === s && styles.chipActive]} onPress={() => setFenceCondition(s)}>
                                        <Text style={[styles.chipTextMini, fenceCondition === s && styles.chipTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Gate & Lock</Text>
                            <View style={styles.chipRowMini}>
                                {['Locked', 'Missing'].map(s => (
                                    <TouchableOpacity key={s} style={[styles.chipMini, gateLockStatus === s && styles.chipActive]} onPress={() => setGateLockStatus(s)}>
                                        <Text style={[styles.chipTextMini, gateLockStatus === s && styles.chipTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Specific Observations</Text>
                    <TextInput
                        style={styles.input}
                        multiline
                        numberOfLines={4}
                        placeholder="Detail any technical issues or actions taken..."
                        value={visitNotes}
                        onChangeText={setVisitNotes}
                    />

                    <Text style={styles.label}>Evidence (Geotagged Photo)</Text>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                        <Ionicons name="camera" size={24} color="#4F46E5" />
                        <Text style={styles.photoText}>{photo ? 'Replace Station Photo' : 'Capture Station Photo'}</Text>
                    </TouchableOpacity>

                    {photo && <Image source={{ uri: photo }} style={styles.previewImage} />}
                </View>
            )}

            <View style={styles.actions}>
                {visit.status === 'SCHEDULED' && (
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#FFA500' }]}
                        onPress={() => updateStatus('IN_PROGRESS')}
                    >
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.btnText}>Start Visit (Check In)</Text>
                    </TouchableOpacity>
                )}

                {visit.status === 'IN_PROGRESS' && (
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#10B981' }]}
                        onPress={() => updateStatus('COMPLETED')}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.btnText}>Complete Visit</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
}

const getStatusColor = (status: string) => {
    if (status === 'IN_PROGRESS') return '#F59E0B';
    if (status === 'COMPLETED') return '#10B981';
    return '#3B82F6';
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#f8f9fa', padding: 20, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 5 },
    backText: { color: '#4F46E5', fontSize: 16, fontWeight: 'bold' },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E1B4B', flex: 1, marginRight: 10 },
    subtitle: { fontSize: 14, color: '#6B7280' },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    infoText: { fontSize: 14, color: '#444' },

    integritySection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    metricText: { fontSize: 11, color: '#475569', fontWeight: 'bold' },

    distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

    offlineBanner: { backgroundColor: '#6B7280', padding: 10, borderRadius: 8, marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    offlineText: { color: '#fff', fontSize: 13, fontWeight: '500' },

    executionContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#EEF2FF' },
    reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E1B4B' },
    sectionSubTitle: { fontSize: 13, fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 1 },
    reportField: { marginBottom: 15 },
    label: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    miniLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },

    inputSmall: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: '#F9FAFB' },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#F9FAFB', fontSize: 15 },

    technicalRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipRowMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
    chipMini: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
    chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    chipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
    chipTextMini: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
    chipTextActive: { color: '#4F46E5', fontWeight: 'bold' },

    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderWidth: 2, borderColor: '#EEF2FF', borderRadius: 15, borderStyle: 'dashed', backgroundColor: '#F8FAFC', justifyContent: 'center', marginTop: 10 },
    photoText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 },
    previewImage: { width: '100%', height: 220, borderRadius: 15, marginTop: 15 },

    actions: { gap: 15, paddingBottom: 40 },
    btn: { width: '100%', padding: 18, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
