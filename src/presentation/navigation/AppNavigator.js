import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppText, Button, Card, Icon, Message, Screen } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import NetworkScreen from '../screens/NetworkScreen';
import ProgressScreen from '../screens/ProgressScreen';
import FocusScreen from '../screens/FocusScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: c.primary, background: c.background, card: c.background, text: c.text, border: c.border } };
const icons = { 'Início': 'home-outline', 'Progresso': 'stats-chart-outline', 'Foco': 'moon-outline', 'Ajustes': 'options-outline' };

function Tabs() {
  return <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted,
    tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
    tabBarLabelStyle: { fontSize: 11 },
    tabBarIcon: ({ color, size }) => <Icon name={icons[route.name]} color={color} size={size} />,
  })}>
    <Tab.Screen name="Início" component={HomeScreen} />
    <Tab.Screen name="Progresso" component={ProgressScreen} />
    <Tab.Screen name="Foco" component={FocusScreen} />
    <Tab.Screen name="Ajustes" component={SettingsScreen} />
  </Tab.Navigator>;
}
export default function AppNavigator() {
  const { state, error, busy, execute } = useWellbeing();
  const [resetConfirmed, setResetConfirmed] = useState(false);
  if (!state) return <Screen><AppText variant="title">Larp-In</AppText>{error ? <Card><Message error>{error}</Message><Button title="Tentar novamente" disabled={busy} onPress={() => execute('load')} />
    {resetConfirmed ? <><AppText>Todos os registros locais serão apagados.</AppText><Button title="Confirmar exclusão dos dados" danger disabled={busy} onPress={() => execute('reset')} /><Button title="Cancelar" secondary onPress={() => setResetConfirmed(false)} /></> : <Button title="Restaurar dados" secondary onPress={() => setResetConfirmed(true)} />}</Card>
    : <ActivityIndicator color={c.primary} accessibilityLabel="Carregando seus dados" />}</Screen>;
  return <NavigationContainer theme={theme}>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      {!state.onboarded ? <Stack.Screen name="Welcome" component={WelcomeScreen} /> : <>
        <Stack.Screen name="Main" component={Tabs} />
        <Stack.Screen name="Network" component={NetworkScreen} />
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}
