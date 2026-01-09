import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function Welcome() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#4c669f', '#3b5998', '#192f6a']}
                style={styles.background}
            />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="map-outline" size={80} color="#fff" />
                </View>

                <Text style={styles.title}>Field Visit System</Text>
                <Text style={styles.subtitle}>
                    Streamline your field operations, track visits, and manage your team efficiently.
                </Text>

                <View style={styles.featureContainer}>
                    <FeatureItem icon="location-outline" text="Real-time Tracking" />
                    <FeatureItem icon="clipboard-outline" text="Instant Reporting" />
                    <FeatureItem icon="people-outline" text="Team Management" />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/(auth)/login')}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={20} color="#3b5998" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function FeatureItem({ icon, text }: { icon: any, text: string }) {
    return (
        <View style={styles.featureItem}>
            <Ionicons name={icon} size={24} color="#aaccff" />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        width: '85%',
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#dbeafe',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    featureContainer: {
        width: '100%',
        marginBottom: 50,
        gap: 15,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 12,
        gap: 15,
    },
    featureText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: '#fff',
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonText: {
        color: '#3b5998',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
