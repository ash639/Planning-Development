
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineAction {
    id: string;
    type: 'UPDATE_VISIT_STATUS' | 'CREATE_LOCATION';
    payload: any;
    timestamp: number;
}

interface OfflineState {
    isOnline: boolean;
    pendingActions: OfflineAction[];
    cachedVisits: Record<string, any>; // id -> visit data
    setOnlineStatus: (status: boolean) => void;
    addPendingAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => void;
    removeAction: (id: string) => void;
    cacheVisit: (visit: any) => void;
    clearPendingActions: () => void;
}

export const useOfflineStore = create<OfflineState>()(
    persist(
        (set, get) => ({
            isOnline: true, // Optimistic default
            pendingActions: [],
            cachedVisits: {},

            setOnlineStatus: (status) => set({ isOnline: status }),

            addPendingAction: (action) => set((state) => ({
                pendingActions: [
                    ...state.pendingActions,
                    {
                        ...action,
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                    },
                ],
            })),

            removeAction: (id) => set((state) => ({
                pendingActions: state.pendingActions.filter((a) => a.id !== id),
            })),

            cacheVisit: (visit) => set((state) => ({
                cachedVisits: {
                    ...state.cachedVisits,
                    [visit.id]: visit,
                },
            })),

            clearPendingActions: () => set({ pendingActions: [] }),
        }),
        {
            name: 'offline-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                pendingActions: state.pendingActions,
                cachedVisits: state.cachedVisits
            }), // Only persist actions and cache
        }
    )
);

// Setup Listener
NetInfo.addEventListener(state => {
    useOfflineStore.getState().setOnlineStatus(!!state.isConnected);
});
