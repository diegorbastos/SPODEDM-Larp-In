import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalWellbeingRepository } from '../data/LocalWellbeingRepository';
import { createWellbeing } from '../application/createWellbeing';
import { NativeDeviceControl } from '../data/NativeDeviceControl';
import { createDeviceProtection } from '../application/createDeviceProtection';

export const wellbeing = createWellbeing(new LocalWellbeingRepository(AsyncStorage));
export const protection = createDeviceProtection(new NativeDeviceControl(), wellbeing);
