import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../../constants/colors';

/**
 * AvailabilityPicker — day selector + start/end time pickers.
 *
 * @param {object} value - { start: string (HH:MM), end: string (HH:MM), days: string[] }
 * @param {function} onChange - Called with updated value object
 * @param {object} [style] - Optional container style override
 */

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

const DAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const timeStringToDate = (timeStr) => {
  const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const dateToTimeString = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '--:--';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const AvailabilityPicker = ({ value, onChange, style }) => {
  const currentValue = {
    start: value?.start || '09:00',
    end: value?.end || '17:00',
    days: value?.days || [],
  };

  const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null

  const toggleDay = (dayKey) => {
    const updatedDays = currentValue.days.includes(dayKey)
      ? currentValue.days.filter((d) => d !== dayKey)
      : [...currentValue.days, dayKey];
    onChange({ ...currentValue, days: updatedDays });
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }

    if (event.type === 'dismissed') {
      setShowPicker(null);
      return;
    }

    if (selectedDate && showPicker) {
      const timeStr = dateToTimeString(selectedDate);
      onChange({ ...currentValue, [showPicker]: timeStr });
    }

    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
  };

  const closePicker = () => {
    setShowPicker(null);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Day selector */}
      <Text style={styles.sectionLabel}>Available Days</Text>
      <View style={styles.dayRow}>
        {DAYS.map((day) => {
          const isSelected = currentValue.days.includes(day.key);
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
              onPress={() => toggleDay(day.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_LABELS[day.key]} ${isSelected ? 'selected' : 'not selected'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[styles.dayText, isSelected && styles.dayTextSelected]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time pickers */}
      <Text style={styles.sectionLabel}>Available Hours</Text>
      <View style={styles.timeRow}>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowPicker('start')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Start time: ${formatTimeDisplay(currentValue.start)}`}
        >
          <Text style={styles.timeLabel}>From</Text>
          <Text style={styles.timeValue}>
            {formatTimeDisplay(currentValue.start)}
          </Text>
        </TouchableOpacity>

        <Text style={styles.timeSeparator}>→</Text>

        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowPicker('end')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`End time: ${formatTimeDisplay(currentValue.end)}`}
        >
          <Text style={styles.timeLabel}>To</Text>
          <Text style={styles.timeValue}>
            {formatTimeDisplay(currentValue.end)}
          </Text>
        </TouchableOpacity>
      </View>

      {showPicker ? (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={timeStringToDate(
              showPicker === 'start' ? currentValue.start : currentValue.end
            )}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={closePicker}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Done selecting time"
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dayButtonSelected: {
    backgroundColor: Colors.primaryButton,
    borderColor: Colors.primaryButton,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  dayTextSelected: {
    color: Colors.white,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.disabledText,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
  },
  timeSeparator: {
    fontSize: 18,
    color: Colors.disabledText,
  },
  pickerContainer: {
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryButton,
  },
});

export default AvailabilityPicker;
