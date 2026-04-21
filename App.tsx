import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { PainTrackerScreen } from './src/screens/PainTrackerScreen';
import { CrisisEventsScreen } from './src/screens/CrisisEventsScreen';
import { MedicationsScreen } from './src/screens/MedicationsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ClinicianDashboardScreen } from './src/screens/ClinicianDashboardScreen';
import { Colors, FontWeight } from './src/theme/tokens';
import { useDemoSession } from './src/state/session';

const Tab = createBottomTabNavigator();

const tabConfig: Record<
  string,
  { icon: string; iconFocused: string; label: string }
> = {
  Dashboard: {
    icon: 'view-dashboard-outline',
    iconFocused: 'view-dashboard',
    label: 'DASHBOARD',
  },
  Trends: {
    icon: 'trending-up',
    iconFocused: 'trending-up',
    label: 'TRENDS',
  },
  Pain: {
    icon: 'chart-line',
    iconFocused: 'chart-line',
    label: 'PAIN',
  },
  History: {
    icon: 'history',
    iconFocused: 'history',
    label: 'HISTORY',
  },
  Meds: {
    icon: 'pill',
    iconFocused: 'pill',
    label: 'MEDS',
  },
};

function PatientApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const cfg = tabConfig[route.name];
          return (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <MaterialCommunityIcons
                name={(focused ? cfg.iconFocused : cfg.icon) as any}
                size={26}
                color={color}
              />
            </View>
          );
        },
        tabBarLabel: tabConfig[route.name]?.label,
        tabBarActiveTintColor: '#001d36',
        tabBarInactiveTintColor: '#44474e',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: FontWeight.medium,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          backgroundColor: 'rgba(247, 249, 255, 0.92)',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          shadowColor: '#191c20',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 24,
          elevation: 8,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Pain" component={PainTrackerScreen} />
      <Tab.Screen name="History" component={CrisisEventsScreen} />
      <Tab.Screen name="Meds" component={MedicationsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const session = useDemoSession();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!session ? (
        <LoginScreen />
      ) : session.role === 'patient' ? (
        <NavigationContainer>
          <PatientApp />
        </NavigationContainer>
      ) : (
        <ClinicianDashboardScreen role={session.role} email={session.email} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: '#d1e4ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
