import { Stack } from 'expo-router';

export default function AgentLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="home" />
            <Stack.Screen name="create-location" options={{ presentation: 'modal', headerShown: true, title: 'New Location' }} />
            <Stack.Screen name="visits/[id]" options={{ headerShown: true, title: 'Visit Details' }} />
        </Stack>
    );
}
