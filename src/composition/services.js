import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalWellbeingRepository } from '../data/LocalWellbeingRepository';
import { createWellbeing } from '../application/createWellbeing';

export const wellbeing = createWellbeing(new LocalWellbeingRepository(AsyncStorage));
