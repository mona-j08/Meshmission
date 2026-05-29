import { Appearance } from 'react-native';

/**
 * MeshMission Color System
 * ALL color hex values must be imported from this file.
 * NEVER hardcode color strings anywhere else in the codebase.
 */

const lightColors = {
  // Backgrounds
  mainBackground: '#F9FAFB',
  navbarBackground: '#FFFFFF',
  heroSection: '#D1FAE5',
  cardBackground: '#FFFFFF',
  footerBackground: '#111827',

  // Primary Actions
  primaryButton: '#10B981',
  primaryButtonHover: '#059669',

  // Typography
  heading: '#1F2937',
  paragraph: '#4B5563',
  footerText: '#D1D5DB',

  // Borders & Icons
  cardBorder: '#E5E7EB',
  icon: '#0F766E',

  // Alerts & Status
  successAlert: '#22C55E',
  warningAlert: '#F59E0B',
  errorAlert: '#EF4444',

  // Extended palette
  primaryLight: '#D1FAE5',
  primaryMuted: '#A7F3D0',
  chartSecondary: '#34D399',
  modalBackdrop: 'rgba(17, 24, 39, 0.45)',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  disabledBackground: '#E5E7EB',
  disabledText: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

const darkColors = {
  // Backgrounds
  mainBackground: '#111827',
  navbarBackground: '#1F2937',
  heroSection: '#064E3B',
  cardBackground: '#1F2937',
  footerBackground: '#111827',

  // Primary Actions
  primaryButton: '#34D399',
  primaryButtonHover: '#10B981',

  // Typography
  heading: '#F9FAFB',
  paragraph: '#D1D5DB',
  footerText: '#9CA3AF',

  // Borders & Icons
  cardBorder: '#374151',
  icon: '#6EE7B7',

  // Alerts & Status
  successAlert: '#4ADE80',
  warningAlert: '#FBBF24',
  errorAlert: '#F87171',

  // Extended palette
  primaryLight: '#065F46',
  primaryMuted: '#047857',
  chartSecondary: '#10B981',
  modalBackdrop: 'rgba(0, 0, 0, 0.65)',
  inputBorder: '#4B5563',
  inputBackground: '#111827',
  disabledBackground: '#374151',
  disabledText: '#6B7280',
  white: '#111827', // Inverted for text on primary buttons
  black: '#F9FAFB',
  transparent: 'transparent',
};

const isDark = Appearance.getColorScheme() === 'dark';
const Colors = isDark ? darkColors : lightColors;

// Fallback in case of runtime changes (though standard StyleSheet objects won't auto-update without hooks)
Appearance.addChangeListener(({ colorScheme }) => {
  const newColors = colorScheme === 'dark' ? darkColors : lightColors;
  Object.assign(Colors, newColors);
});

export default Colors;
