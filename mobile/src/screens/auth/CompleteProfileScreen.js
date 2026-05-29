import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { ROLES, ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import PrimaryButton from '../../components/common/PrimaryButton';
import { createUserProfile } from '../../firebase/firestore';
import { setUserRole } from '../../firebase/functions';

export default function CompleteProfileScreen() {
  const { user, switchUserRole, signOut } = useAuth();
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.DONOR);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      // 1. Create profile
      await createUserProfile(user.uid, {
        name: name.trim(),
        phone: user.phoneNumber || '',
        email: user.email || '',
        role: selectedRole,
      });
      // 2. Set claim
      await setUserRole(user.uid, selectedRole);
      // 3. Switch role in local state to trigger navigation
      await switchUserRole(selectedRole);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>It looks like you signed in with a new phone number. Let's finish setting up your account.</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Jane Doe"
          placeholderTextColor={Colors.disabledText}
        />

        <Text style={styles.label}>Select Your Role</Text>
        {Object.values(ROLES).filter(r => r !== ROLES.ADMIN).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, selectedRole === r && styles.roleBtnSelected]}
            onPress={() => setSelectedRole(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.roleText, selectedRole === r && styles.roleTextSelected]}>
              {ROLE_LABELS[r]}
            </Text>
          </TouchableOpacity>
        ))}

        <PrimaryButton title="Save Profile" onPress={handleComplete} loading={loading} style={styles.btn} />
        
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Cancel & Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mainBackground },
  content: { padding: 24, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.heading, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.paragraph, marginBottom: 32, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.heading, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.inputBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.heading },
  roleBtn: { padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.cardBorder, marginBottom: 12, backgroundColor: Colors.cardBackground },
  roleBtnSelected: { borderColor: Colors.primaryButton, backgroundColor: Colors.primaryButton + '0A' },
  roleText: { fontSize: 15, fontWeight: '600', color: Colors.paragraph, textAlign: 'center' },
  roleTextSelected: { color: Colors.primaryButtonHover, fontWeight: '700' },
  btn: { marginTop: 32 },
  signOutBtn: { marginTop: 24, alignItems: 'center', padding: 10 },
  signOutText: { color: Colors.errorAlert, fontWeight: '600', fontSize: 15 }
});
