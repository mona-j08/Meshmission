import React, { useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

/**
 * OTPInput — row of individual digit input boxes with auto-advance.
 *
 * @param {number} [length=6] - Number of OTP digits
 * @param {string} value - Current OTP string
 * @param {function} onChange - Called with updated OTP string
 * @param {string} [error] - Error message to display below
 * @param {object} [style] - Optional container style override
 */

const OTPInput = ({ length = 6, value = '', onChange, error, style }) => {
  const inputRefs = useRef([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (text, index) => {
    // Only allow single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto-advance to next box
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      // Clear previous box and move focus back
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      onChange(newDigits.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index) => {
    // Select the content when focused
    inputRefs.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.box,
              digit ? styles.filledBox : null,
              error ? styles.errorBox : null,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            accessibilityLabel={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
    backgroundColor: Colors.inputBackground,
  },
  filledBox: {
    borderColor: Colors.primaryButton,
    backgroundColor: Colors.white,
  },
  errorBox: {
    borderColor: Colors.errorAlert,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.errorAlert,
    textAlign: 'center',
  },
});

export default OTPInput;
