import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const isTablet = width >= 768;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const scale = (phone: number, tablet = Math.round(phone * 1.15)) =>
  isTablet ? tablet : phone;

export const spacing = {
  xs: scale(4, 6),
  sm: scale(8, 10),
  md: scale(12, 16),
  lg: scale(16, 20),
  xl: scale(20, 24),
};

export const fontSize = {
  tiny: scale(11, 12),
  small: scale(12, 13),
  body: scale(14, 15),
  button: scale(15, 16),
  section: scale(17, 18),
  title: scale(22, 25),
};
