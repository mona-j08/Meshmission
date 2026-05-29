import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

/**
 * PrimaryButton — versatile button with three visual variants.
 *
 * @param {string} title - Button label text
 * @param {function} onPress - Press handler
 * @param {boolean} [loading=false] - Shows ActivityIndicator when true
 * @param {boolean} [disabled=false] - Disables the button
 * @param {object} [style] - Optional container style override
 * @param {'primary'|'danger'|'secondary'} [variant='primary'] - Visual variant
 */

const VARIANT_STYLES = {
  primary: {
    backgroundColor: Colors.primaryButton,
    textColor: Colors.white,
  },
  danger: {
    backgroundColor: Colors.errorAlert,
    textColor: Colors.white,
  },
  secondary: {
    backgroundColor: Colors.white,
    textColor: Colors.primaryButton,
    borderColor: Colors.primaryButton,
  },
};

const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  variant = 'primary',
}) => {
  const variantConfig = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: isDisabled
        ? Colors.disabledBackground
        : variantConfig.backgroundColor,
    },
    variantConfig.borderColor && !isDisabled
      ? { borderWidth: 1, borderColor: variantConfig.borderColor }
      : null,
    style,
  ];

  const textColor = isDisabled ? Colors.disabledText : variantConfig.textColor;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} style={styles.loader} />
      ) : null}
      <Text style={[styles.text, { color: textColor }]}>
        {loading ? 'Loading…' : title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 48,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  loader: {
    marginRight: 8,
  },
});

export default PrimaryButton;
