import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { wellbeing, protection } from './src/composition/services';
import { WellbeingProvider } from './src/presentation/state/WellbeingProvider';
import AppNavigator from './src/presentation/navigation/AppNavigator';

export default function App() {
  return <SafeAreaProvider><StatusBar style="light" />
    <WellbeingProvider service={wellbeing} protection={protection}><AppNavigator /></WellbeingProvider>
  </SafeAreaProvider>;
}
