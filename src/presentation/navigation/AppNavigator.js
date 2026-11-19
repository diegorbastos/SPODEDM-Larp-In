import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppText, Button, Card, Icon, Message, Screen } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import NetworkScreen from '../screens/NetworkScreen';
import ProgressScreen from '../screens/ProgressScreen';
import FocusScreen from '../screens/FocusScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: c.primary,
    background: c.background,
    card: c.background,
    text: c.text,
    border: c.border,
  },
};

const icons = {
  'Início': ['home', 'home-outline'],
  'Progresso': ['stats-chart', 'stats-chart-outline'],
  'Foco': ['moon', 'moon-outline'],
  'Ajustes': ['options', 'options-outline'],
};

function Tabs() {
  const insets = useSafeAreaInsets();
  const { clearError } = useWellbeing();

  return (
    <Tab.Navigator
      screenListeners={{ tabPress: clearError }}
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'shift',
        freezeOnBlur: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(10, insets.bottom),
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const [activeIcon, inactiveIcon] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Icon name={focused ? activeIcon : inactiveIcon} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Progresso" component={ProgressScreen} />
      <Tab.Screen name="Foco" component={FocusScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { state, error, busy, execute } = useWellbeing();
  const [resetConfirmed, setResetConfirmed] = useState(false);

  if (!state) {
    return (
      <Screen>
        <AppText variant="title">Larp-In</AppText>
        {error ? (
          <Card>
            <Message error>{error}</Message>
            <Button title="Tentar novamente" loading={busy} onPress={() => execute('load')} />
            {resetConfirmed ? (
              <>
                <AppText>Todos os registros locais serão apagados.</AppText>
                <Button
                  title="Confirmar exclusão dos dados"
                  danger
                  loading={busy}
                  onPress={async () => {
                    if (await execute('reset')) setResetConfirmed(false);
                  }}
                />
                <Button title="Cancelar" secondary onPress={() => setResetConfirmed(false)} />
              </>
            ) : (
              <Button title="Restaurar dados" secondary onPress={() => setResetConfirmed(true)} />
            )}
          </Card>
        ) : (
          <ActivityIndicator color={c.primary} accessibilityLabel="Carregando seus dados" />
        )}
      </Screen>
    );
  }

  // Permissões flexíveis: o usuário nunca fica travado fora do app ao iniciar ou revogar permissões.
  const needsOnboarding = !state.onboarded;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 220,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        {needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={Tabs} />
            <Stack.Screen
              name="Network"
              component={NetworkScreen}
              options={{
                animation: 'slide_from_right',
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
