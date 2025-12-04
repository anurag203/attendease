import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export default function BluetoothSetupScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [macAddress, setMacAddress] = useState(user?.bluetooth_mac || '');
  const [loading, setLoading] = useState(false);

  const handleMacChange = (text) => {
    // Just set the text directly - validation happens on save
    // Only filter out completely invalid characters and uppercase
    setMacAddress(text.toUpperCase().slice(0, 17));
  };

  const handleSave = async () => {
    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!macRegex.test(macAddress)) {
      Alert.alert('Invalid Format', 'Please enter a valid MAC address (XX:XX:XX:XX:XX:XX)');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateBluetoothMac(macAddress);
      
      // Update local user state
      if (updateUser) {
        updateUser({ ...user, bluetooth_mac: macAddress });
      }
      
      Alert.alert(
        'Success! ✅',
        'Your Bluetooth MAC address has been saved. This will be used for all your courses.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving MAC address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save MAC address'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bluetooth Setup</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>📱</Text>
          <Text style={styles.infoTitle}>Your Device's Bluetooth Address</Text>
          <Text style={styles.infoText}>
            Enter your phone's Bluetooth MAC address. Students will use this to verify they are near you during attendance.
          </Text>
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📍 How to find your MAC address:</Text>
          <Text style={styles.instructionText}>
            1. Go to Settings → About Phone{'\n'}
            2. Look for "Bluetooth address" or{'\n'}
            3. Settings → Bluetooth → Device details
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bluetooth MAC Address</Text>
          <TextInput
            style={styles.input}
            value={macAddress}
            onChangeText={handleMacChange}
            placeholder="44:16:FA:1D:D2:8D"
            placeholderTextColor={COLORS.mediumGray}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={17}
          />
          <Text style={styles.inputHint}>Format: 44:16:FA:1D:D2:8D</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save MAC Address</Text>
          )}
        </TouchableOpacity>

        {user?.bluetooth_mac && (
          <View style={styles.currentMac}>
            <Text style={styles.currentMacLabel}>Current saved address:</Text>
            <Text style={styles.currentMacValue}>{user.bluetooth_mac}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.lightGray,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  currentMac: {
    marginTop: 24,
    alignItems: 'center',
  },
  currentMacLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  currentMacValue: {
    fontSize: 16,
    color: COLORS.secondary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});
