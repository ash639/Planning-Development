import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Platform, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import api from '../../src/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 768;

export default function CreatePlan() {
    const { user } = useAuthStore();
    const router = useRouter();

    // Data State
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('Select District');
    const [selectedBlock, setSelectedBlock] = useState('Select Block');
    const [selectedType, setSelectedType] = useState('All Types');

    // Planning State
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Map of "YYYY-MM-DD" -> Set of Location IDs
    const [dailyPlans, setDailyPlans] = useState<Record<string, Set<string>>>({});
    // Track original visits to handle deletions vs new additions
    const [initialVisits, setInitialVisits] = useState<any[]>([]);
    const [originalMap, setOriginalMap] = useState<Record<string, Set<string>>>({});

    const getDateKey = (date: Date) => date.toISOString().split('T')[0];

    // Modal State (Dropdowns)
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState<string[]>([]);
    const [onSelectCallback, setOnSelectCallback] = useState<(val: string) => void>(() => { });

    // Date Modal State
    const [dateModalVisible, setDateModalVisible] = useState(false);

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user]);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchLocations(),
            fetchExistingPlans()
        ]);
        setLoading(false);
    };

    const fetchLocations = async () => {
        if (!user?.organizationId) return;
        try {
            const res = await api.get(`/locations?organizationId=${user.organizationId}`);
            setLocations(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchExistingPlans = async () => {
        if (!user?.id) return;
        try {
            const res = await api.get(`/visits?agentId=${user.id}`);
            const scheduled = res.data.filter((v: any) => v.status === 'SCHEDULED');
            setInitialVisits(scheduled);

            const planMap: Record<string, Set<string>> = {};
            scheduled.forEach((v: any) => {
                const dateKey = v.scheduledDate.split('T')[0];
                if (!planMap[dateKey]) planMap[dateKey] = new Set();
                planMap[dateKey].add(v.locationId);
            });

            setDailyPlans(planMap);
            setOriginalMap(JSON.parse(JSON.stringify(planMap, (key, value) => value instanceof Set ? Array.from(value) : value), (key, value) => {
                if (Array.isArray(value) && (key === '' || !isNaN(Number(key)))) { // Hacky check for the Set values
                    // Actually easier to just reconstruct manually
                    return value;
                }
                return value;
            }));
            // Better original map clone
            const clone: Record<string, Set<string>> = {};
            Object.keys(planMap).forEach(k => clone[k] = new Set(planMap[k]));
            setOriginalMap(clone);

        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    };

    // Derived Filters
    const districts = ['Select District', ...Array.from(new Set(locations.map(l => l.district || l.address?.split(',')[0]?.trim()).filter(Boolean)))];

    const blocks = selectedDistrict === 'Select District'
        ? ['Select Block']
        : ['Select Block', ...Array.from(new Set(locations
            .filter(l => (l.district || l.address?.split(',')[0]?.trim()) === selectedDistrict)
            .map(l => l.block || l.address?.split(',')[1]?.trim())
            .filter(Boolean)))];

    const types = ['All Types', ...Array.from(new Set(locations.map(l => l.stationType).filter(Boolean)))];

    // --- Modal Logic ---
    const openModal = (title: string, data: string[], onSelect: (val: string) => void) => {
        setModalTitle(title);
        setModalData(data);
        setOnSelectCallback(() => onSelect);
        setModalVisible(true);
    };

    const handleSelect = (val: string) => {
        onSelectCallback(val);
        setModalVisible(false);
    };

    const renderModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{modalTitle}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={modalData}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => handleSelect(item)}
                            >
                                <Text style={styles.modalItemText}>{item}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    // Calendar Render Logic
    const [viewDate, setViewDate] = useState(new Date());

    const openDateModal = () => {
        setViewDate(new Date(selectedDate)); // Reset view to selected date
        setDateModalVisible(true);
    };

    const changeMonth = (increment: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setViewDate(newDate);
    };

    const changeYear = (increment: number) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(newDate.getFullYear() + increment);
        setViewDate(newDate);
    };

    const renderDateModal = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={dateModalVisible}
                onRequestClose={() => setDateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header with Close Button */}
                        <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingBottom: 5 }]}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Year Month Controls */}
                        <View style={styles.calendarControls}>
                            {/* Year Control */}
                            <View style={styles.controlRow}>
                                <TouchableOpacity onPress={() => changeYear(-1)} style={styles.controlBtn}>
                                    <Ionicons name="chevron-back" size={20} color="#555" />
                                </TouchableOpacity>
                                <Text style={styles.controlText}>{viewDate.getFullYear()}</Text>
                                <TouchableOpacity onPress={() => changeYear(1)} style={styles.controlBtn}>
                                    <Ionicons name="chevron-forward" size={20} color="#555" />
                                </TouchableOpacity>
                            </View>

                            {/* Month Control */}
                            <View style={styles.controlRow}>
                                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.controlBtn}>
                                    <Ionicons name="chevron-back" size={20} color="#555" />
                                </TouchableOpacity>
                                <Text style={styles.controlText}>
                                    {viewDate.toLocaleString('default', { month: 'long' })}
                                </Text>
                                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.controlBtn}>
                                    <Ionicons name="chevron-forward" size={20} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.calendarGrid}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <Text key={i} style={styles.dayLabel}>{d}</Text>
                            ))}
                            {days.map((d, i) => {
                                if (!d) return <View key={i} style={styles.dayCell} />;
                                const isSelected = d.getDate() === selectedDate.getDate() &&
                                    d.getMonth() === selectedDate.getMonth() &&
                                    d.getFullYear() === selectedDate.getFullYear();

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isPast = d < today;

                                return (
                                    <TouchableOpacity
                                        key={i}
                                        disabled={isPast}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.selectedDayCell,
                                            isPast && { opacity: 0.3 }
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(d);
                                            setDateModalVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
                                            {d.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };


    const toggleSelection = (id: string) => {
        const dateKey = getDateKey(selectedDate);
        setDailyPlans(prev => {
            const currentSet = new Set(prev[dateKey] || []);
            if (currentSet.has(id)) {
                currentSet.delete(id);
            } else {
                currentSet.add(id);
            }

            // If empty, remove the key entirely to keep clean
            if (currentSet.size === 0) {
                const { [dateKey]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [dateKey]: currentSet };
        });
    };

    const removeFromPlan = (dateKey: string, locId: string) => {
        setDailyPlans(prev => {
            const newSet = new Set(prev[dateKey]);
            newSet.delete(locId);
            if (newSet.size === 0) {
                const { [dateKey]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [dateKey]: newSet };
        });
    };

    const saveAllPlans = async () => {
        const dateKeys = Object.keys(dailyPlans);

        try {
            setLoading(true);

            // 1. Identify Deletions
            const deletions: string[] = [];
            initialVisits.forEach(v => {
                const dateKey = v.scheduledDate.split('T')[0];
                if (!dailyPlans[dateKey] || !dailyPlans[dateKey].has(v.locationId)) {
                    deletions.push(v.id);
                }
            });

            // 2. Identify Additions
            const additions: { locId: string, date: string }[] = [];
            Object.keys(dailyPlans).forEach(dateKey => {
                dailyPlans[dateKey].forEach(locId => {
                    const alreadyExisted = initialVisits.some(v =>
                        v.locationId === locId && v.scheduledDate.split('T')[0] === dateKey
                    );
                    if (!alreadyExisted) {
                        additions.push({ locId, date: dateKey });
                    }
                });
            });

            if (deletions.length === 0 && additions.length === 0) {
                Alert.alert('No Changes', 'Your plan has no changes to save.');
                setLoading(false);
                return;
            }

            // Execute Sync
            let completed = 0;

            // Handle Deletions
            for (const id of deletions) {
                await api.delete(`/visits/${id}`);
            }

            // Handle Additions
            for (const add of additions) {
                await api.post('/visits', {
                    organizationId: user?.organizationId,
                    locationId: add.locId,
                    agentId: user?.id,
                    scheduledDate: new Date(add.date).toISOString(),
                    notes: 'Planned via Tour Plan'
                });
            }

            Alert.alert('Success', `Plan updated! (${additions.length} added, ${deletions.length} removed)`, [
                {
                    text: 'OK',
                    onPress: () => {
                        fetchInitialData(); // Refresh to get new IDs
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Save Plan Error:', error);
            Alert.alert('Error', 'Failed to update tour plan.');
        } finally {
            setLoading(false);
        }
    };

    // Derived State for Current View
    const currentKey = getDateKey(selectedDate);
    const selectedLocationIds = dailyPlans[currentKey] || new Set();
    const selectedCount = selectedLocationIds.size;

    const filteredLocations = locations.filter(loc => {
        const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (loc.id && loc.id.toString().includes(searchQuery));

        // Filter Logic
        const currentDist = loc.district || loc.address?.split(',')[0]?.trim();
        const currentBlock = loc.block || loc.address?.split(',')[1]?.trim();
        const currentType = loc.stationType;

        const matchesDistrict = selectedDistrict === 'Select District' ? true : currentDist === selectedDistrict;
        const matchesBlock = (selectedBlock === 'Select Block' || selectedDistrict === 'Select District') ? true : currentBlock === selectedBlock;
        const matchesType = selectedType === 'All Types' ? true : currentType === selectedType;

        return matchesSearch && matchesDistrict && matchesBlock && matchesType;
    });

    const getTypeColor = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'AWS': return '#3B82F6'; // Blue
            case 'ARG': return '#10B981'; // Green
            case 'AWLR': return '#F59E0B'; // Amber
            default: return '#6B7280'; // Gray
        }
    };

    const renderLocationItem = ({ item }: { item: any }) => {
        const isSelected = selectedLocationIds.has(item.id);
        const typeColor = getTypeColor(item.stationType);

        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected, item.isProblematic && styles.cardProblematic]}
                onPress={() => toggleSelection(item.id)}
            >
                <View style={styles.cardRow}>
                    <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={24}
                        color={isSelected ? "#7C3AED" : "#9CA3AF"}
                    />
                    <View style={styles.cardContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                {item.stationNumber && <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: 'bold' }}>#{item.stationNumber}</Text>}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                            <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>📍 {item.district}</Text></View>
                            <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>🏢 {item.block}</Text></View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                            {item.isProblematic && (
                                <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.typeText, { color: '#DC2626' }]}>High Priority</Text>
                                </View>
                            )}
                            {item.stationType && (
                                <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                                    <Text style={[styles.typeText, { color: typeColor }]}>{item.stationType}</Text>
                                </View>
                            )}
                        </View>

                        {item.lastVisited && (
                            <Text style={styles.lastVisitedText}>
                                Last Visited: {new Date(item.lastVisited).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const autoFillDay = () => {
        const dateKey = getDateKey(selectedDate);
        const currentSet = dailyPlans[dateKey] || new Set();

        // Find candidates: visible in filter AND not already selected for this day
        const candidates = filteredLocations.filter(l => !currentSet.has(l.id));

        if (candidates.length === 0) {
            Alert.alert('Auto-Fill', 'No available stations to auto-fill from current filters.');
            return;
        }

        // Sort: High Priority first, then random/alphabetical
        candidates.sort((a, b) => {
            if (a.isProblematic && !b.isProblematic) return -1;
            if (!a.isProblematic && b.isProblematic) return 1;
            return 0;
        });

        // Take top 5
        const toAdd = candidates.slice(0, 5);

        setDailyPlans(prev => {
            const newSet = new Set(prev[dateKey] || []);
            toAdd.forEach(l => newSet.add(l.id));
            return { ...prev, [dateKey]: newSet };
        });

        Alert.alert('Auto-Filled', `Added ${toAdd.length} stations to the plan (Prioritized High Priority).`);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {renderModal()}
            {renderDateModal()}

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Create Tour Plan</Text>
                <View style={styles.headerControls}>
                    <TouchableOpacity style={styles.syncBtn} onPress={fetchLocations}>
                        <Ionicons name="sync" size={16} color="#555" />
                        <Text style={styles.syncBtnText}>Sync Stations</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveHeaderBtn} onPress={saveAllPlans}>
                        <Text style={styles.saveHeaderBtnText}>Save All Plans</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filters Row */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingRight: 20 }}>
                    {/* District Filter */}
                    <TouchableOpacity
                        style={styles.filterDropdown}
                        onPress={() => openModal("Select District", districts, (newDist) => {
                            setSelectedDistrict(newDist);
                            setSelectedBlock('Select Block');
                        })}
                    >
                        <Text style={styles.filterLabel}>{selectedDistrict}</Text>
                        <Ionicons name="chevron-down" size={12} color="#666" />
                    </TouchableOpacity>

                    {/* Block Filter */}
                    <TouchableOpacity
                        style={[styles.filterDropdown, (selectedDistrict === 'Select District') && { opacity: 0.5 }]}
                        disabled={selectedDistrict === 'Select District'}
                        onPress={() => openModal("Select Block", blocks, setSelectedBlock)}
                    >
                        <Text style={styles.filterLabel}>{selectedBlock}</Text>
                        <Ionicons name="chevron-down" size={12} color="#666" />
                    </TouchableOpacity>

                    {/* Type Filter */}
                    <TouchableOpacity
                        style={styles.filterDropdown}
                        onPress={() => openModal("Select Station Type", types, setSelectedType)}
                    >
                        <Text style={styles.filterLabel}>{selectedType}</Text>
                        <Ionicons name="chevron-down" size={12} color="#666" />
                    </TouchableOpacity>

                    {/* Date Picker Button */}
                    <TouchableOpacity
                        style={[styles.filterDropdown, { borderColor: '#7C3AED', backgroundColor: '#F3F0FF' }]}
                        onPress={() => openDateModal()}
                    >
                        <Text style={{ color: '#7C3AED', fontSize: 13, marginRight: 5, fontWeight: '600' }}>
                            {selectedDate.toLocaleDateString()}
                        </Text>
                        <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
                    </TouchableOpacity>

                    <View style={styles.searchContainer}>
                        <TextInput
                            placeholder="Search stations..."
                            placeholderTextColor="#999"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <Ionicons name="search" size={16} color="#999" style={{ position: 'absolute', right: 10, top: 10 }} />
                    </View>
                </ScrollView>
            </View>

            <View style={styles.contentContainer}>
                {/* Left: List */}
                <View style={styles.listContainer}>
                    <View style={styles.listHeaderRow}>
                        <TouchableOpacity style={styles.selectAllBtn} onPress={() => {
                            const dateKey = getDateKey(selectedDate);
                            const currentSet = dailyPlans[dateKey] || new Set();
                            const allSelected = filteredLocations.length > 0 && filteredLocations.every(l => currentSet.has(l.id));

                            setDailyPlans(prev => {
                                const newSet = new Set(prev[dateKey] || []);
                                if (allSelected) {
                                    filteredLocations.forEach(l => newSet.delete(l.id));
                                } else {
                                    filteredLocations.forEach(l => newSet.add(l.id));
                                }

                                if (newSet.size === 0) {
                                    const { [dateKey]: _, ...rest } = prev;
                                    return rest;
                                }
                                return { ...prev, [dateKey]: newSet };
                            });
                        }}>
                            <Ionicons
                                name={filteredLocations.length > 0 && filteredLocations.every(l => (dailyPlans[getDateKey(selectedDate)] || new Set()).has(l.id)) ? "checkbox" : "square-outline"}
                                size={20}
                                color="#7C3AED"
                            />
                            <Text style={styles.selectAllText}>Select All ({filteredLocations.length})</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.selectAllBtn, { backgroundColor: '#F3F0FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }]}
                            onPress={autoFillDay}
                        >
                            <Ionicons name="flash" size={16} color="#7C3AED" />
                            <Text style={styles.selectAllText}>Auto-Fill (5)</Text>
                        </TouchableOpacity>

                        <Text style={styles.resultsText}>Showing {filteredLocations.length} Stations</Text>
                    </View>

                    <FlatList
                        data={filteredLocations}
                        renderItem={renderLocationItem}
                        keyExtractor={item => item.id}
                        numColumns={IS_LARGE_SCREEN ? 2 : 1}
                        key={IS_LARGE_SCREEN ? '2-col' : '1-col'}
                        contentContainerStyle={[styles.listContent, !IS_LARGE_SCREEN && { paddingBottom: 100 }]}
                        ListEmptyComponent={
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#888', fontSize: 16 }}>
                                    {selectedDistrict === 'Select District'
                                        ? "Please select a District to start planning."
                                        : "No stations found matching your filters."}
                                </Text>
                            </View>
                        }
                    />
                </View>

                {/* Mobile Floating Save Button */}
                {!IS_LARGE_SCREEN && Object.keys(dailyPlans).length > 0 && (
                    <TouchableOpacity
                        style={styles.mobileSaveBtn}
                        onPress={saveAllPlans}
                    >
                        <View style={styles.mobileSaveBadge}>
                            <Text style={styles.mobileSaveBadgeText}>
                                {Object.values(dailyPlans).reduce((acc, set) => acc + set.size, 0)}
                            </Text>
                        </View>
                        <Text style={styles.mobileSaveText}>Save Plan</Text>
                        <Ionicons name="cloud-upload" size={20} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* Right: Planning Summary (Desktop only) */}
                {IS_LARGE_SCREEN && (
                    <View style={styles.planningPanel}>
                        <View style={styles.planningHeader}>
                            <Ionicons name="list" size={18} color="#7C3AED" />
                            <Text style={styles.planningTitle}>Tour Plan Summary</Text>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>
                                    {Object.values(dailyPlans).reduce((acc, set) => acc + set.size, 0)} Total
                                </Text>
                            </View>
                        </View>

                        <ScrollView style={styles.planningBody}>
                            {Object.keys(dailyPlans).length === 0 ? (
                                <View style={styles.emptyPlanView}>
                                    <Ionicons name="calendar-outline" size={48} color="#e5e7eb" />
                                    <Text style={styles.emptyPlanText}>
                                        Select stations from the list to start building your tour plan.
                                    </Text>
                                </View>
                            ) : (
                                Object.keys(dailyPlans).sort().map(dateKey => (
                                    <View key={dateKey} style={styles.stagedDateGroup}>
                                        <View style={styles.dateGroupHeader}>
                                            <Text style={styles.dateGroupTitle}>
                                                {new Date(dateKey).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                            </Text>
                                            <Text style={styles.dateGroupCount}>{dailyPlans[dateKey].size} Stations</Text>
                                        </View>
                                        {Array.from(dailyPlans[dateKey]).map(locId => {
                                            const loc = locations.find(l => l.id === locId);
                                            const isOriginal = originalMap[dateKey]?.has(locId);
                                            return (
                                                <View key={locId} style={[styles.stagedLocRow, isOriginal && { borderLeftWidth: 3, borderLeftColor: '#10B981' }]}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.stagedLocName} numberOfLines={1}>
                                                            {loc?.name || 'Unknown'}
                                                        </Text>
                                                        {isOriginal && <Text style={{ fontSize: 9, color: '#10B981', fontWeight: 'bold' }}>CONFIRMED</Text>}
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                                        <TouchableOpacity onPress={() => {
                                                            setSelectedDate(new Date(dateKey));
                                                            openDateModal();
                                                            // This doesn't actually 'move' until select, but sets context
                                                            // For a real move, we'd need a multi-step modal. 
                                                            // Let's just allow removal/re-add for now as requested 'editing'.
                                                        }}>
                                                            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => removeFromPlan(dateKey, locId)}>
                                                            <Ionicons name="remove-circle-outline" size={18} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {loading && (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                                <ActivityIndicator size="large" color="#7C3AED" />
                                <Text style={{ marginTop: 10, color: '#7C3AED', fontWeight: 'bold' }}>Saving Plan...</Text>
                            </View>
                        )}

                        <View style={styles.savePanelFooter}>
                            <TouchableOpacity
                                style={[styles.saveAllBtn, Object.keys(dailyPlans).length === 0 && { opacity: 0.5 }]}
                                onPress={saveAllPlans}
                                disabled={loading || Object.keys(dailyPlans).length === 0}
                            >
                                <Text style={styles.saveAllBtnText}>SAVE TOUR PLAN</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    syncBtnText: { color: '#555', fontSize: 13 },

    saveHeaderBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8 },
    saveHeaderBtnText: { color: '#333', fontWeight: '500' },

    filterRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', flexDirection: 'row' },
    filterDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, minWidth: 100, justifyContent: 'space-between', marginVertical: 5 },
    filterLabel: { color: '#444', fontSize: 13, marginRight: 5 },

    searchContainer: { flex: 1, minWidth: 200, marginLeft: 10 },
    searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },

    contentContainer: { flex: 1, flexDirection: 'row' },

    listContainer: { flex: 2, padding: 10 },
    listContent: { paddingBottom: 20 },

    card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, marginBottom: 10, marginRight: 10, minWidth: 250 },
    cardSelected: { borderColor: '#7C3AED', backgroundColor: '#F3F0FF' },
    cardProblematic: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardContent: { flex: 1 },
    cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#111', marginBottom: 2 },
    cardSubtitle: { color: '#666', fontSize: 11 },
    lastVisitedText: { fontSize: 10, color: '#555', marginTop: 4, fontStyle: 'italic' },

    planningPanel: { flex: 1, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#eee', maxWidth: 350 },
    planningHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 10 },
    planningTitle: { fontWeight: 'bold', fontSize: 14 },

    savePanelFooter: { padding: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    planningBody: { flex: 1, padding: 20 },
    saveAllBtn: { backgroundColor: '#7C3AED', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    saveAllBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    mobileSaveBtn: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#7C3AED', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
    mobileSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    mobileSaveBadge: { backgroundColor: '#fff', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    mobileSaveBadgeText: { color: '#7C3AED', fontSize: 10, fontWeight: 'bold' },

    totalBadge: { backgroundColor: '#F3F0FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    totalBadgeText: { color: '#7C3AED', fontSize: 11, fontWeight: 'bold' },

    stagedDateGroup: { marginBottom: 20 },
    dateGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6, marginBottom: 8 },
    dateGroupTitle: { fontWeight: 'bold', fontSize: 13, color: '#374151' },
    dateGroupCount: { fontSize: 11, color: '#6B7280' },

    stagedLocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stagedLocName: { fontSize: 13, color: '#4B5563', flex: 1 },

    emptyPlanView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyPlanText: { textAlign: 'center', color: '#9CA3AF', marginTop: 15, fontSize: 13, lineHeight: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' },
    modalHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalItemText: { fontSize: 14, color: '#333' },

    calendarControls: { paddingHorizontal: 15, paddingBottom: 10, gap: 10 },
    controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 5 },
    controlBtn: { padding: 8 },
    controlText: { fontSize: 15, fontWeight: '600', color: '#333' },

    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-around' },
    dayLabel: { width: '13%', textAlign: 'center', color: '#888', marginBottom: 10, fontWeight: 'bold', fontSize: 12 },
    dayCell: { width: '13%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderRadius: 20 },
    selectedDayCell: { backgroundColor: '#7C3AED' },
    dayText: { color: '#333', fontSize: 14 },
    selectedDayText: { color: '#fff', fontWeight: 'bold' },

    stagedDaysContainer: { padding: 10, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#eee' },
    stagedTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 5, textTransform: 'uppercase' },
    stagedDayChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginRight: 5 },
    stagedDayText: { fontSize: 11, color: '#333', marginRight: 5 },
    stagedCountBadge: { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
    stagedCountText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },

    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
    selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    selectAllText: { color: '#7C3AED', fontWeight: 'bold', fontSize: 13 },
    resultsText: { color: '#888', fontSize: 12 },

    typeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    typeText: { fontSize: 10, fontWeight: 'bold' },
    miniBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 10, color: '#666' }
});
