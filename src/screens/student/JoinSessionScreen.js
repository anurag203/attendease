import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI } from '../../services/api';
import {
  requestBluetoothPermissions,
  checkBluetoothState,
  enableBluetooth,
} from '../../services/bluetoothService';
import { scanForTeacherDevice } from '../../services/bluetoothProximityService';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { COLORS } from '../../utils/constants';

export default function JoinSessionScreen({ navigation, route }) {
  const { session } = route.params;
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teacherFound, setTeacherFound] = useState(false);

  useEffect(() => {
    init();
    
    // Cleanup on unmount - stop any ongoing scans
    return () => {
      console.log('🧹 Cleaning up on screen unmount...');
      setIsScanning(false);
      RNBluetoothClassic.cancelDiscovery().catch(err => 
        console.log('Cleanup discovery cancel (ignored):', err.message)
      );
    };
  }, []);

  // Continuously monitor Bluetooth state (poll every 3 seconds)
  useEffect(() => {
    const checkBluetoothContinuously = async () => {
      const state = await checkBluetoothState();
      
      // Only update if state changed
      if (state !== isBluetoothOn) {
        console.log('🔵 Student Bluetooth state changed:', isBluetoothOn, '→', state);
        setIsBluetoothOn(state);
        
        // If Bluetooth turned OFF during scanning
        if (!state && isBluetoothOn) {
          Alert.alert(
            '⚠️ Bluetooth Turned OFF',
            'Bluetooth was turned off. Please turn it back on to continue.',
            [{ text: 'OK' }]
          );
          setDevices([]);
        }
      }
    };

    // Check immediately
    checkBluetoothContinuously();

    // Then check every 3 seconds (reduced to avoid conflicts with discovery)
    const interval = setInterval(checkBluetoothContinuously, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [isBluetoothOn]);

  const init = async () => {
    const granted = await requestBluetoothPermissions();
    if (granted) {
      const state = await checkBluetoothState();
      setIsBluetoothOn(state);
    }
  };

  const toggleBluetooth = async (value) => {
    if (value) {
      const success = await enableBluetooth();
      if (success) {
        const state = await checkBluetoothState();
        setIsBluetoothOn(state);
      }
    }
  };

  const scanForTeacher = async () => {
    // Skip if already scanning or Bluetooth is off
    if (!isBluetoothOn || isScanning) {
      console.log('⏭️ Skipping scan (already in progress or BT off)');
      return;
    }

    setIsScanning(true);
    try {
      console.log('🔍 Scanning for teacher device with proximity token:', session.proximity_token);
      
      // Scan for teacher device by token
      const result = await scanForTeacherDevice(session.proximity_token);
      
      // Store all found devices for display
      if (result.device) {
        setDevices([result.device]);
      }
      
      if (result.found) {
        console.log('✅ Teacher device found!', result.device.name);
        setTeacherFound(true);
        
        if (!attendanceMarked) {
          console.log('✅ Auto-marking attendance - teacher device found nearby!');
          await markAttendanceWithProximity(result.device.address);
        }
      } else {
        console.log('❌ Teacher device not found:', result.message);
        setTeacherFound(false);
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', error.message || 'Failed to scan for devices');
    } finally {
      setIsScanning(false);
    }
  };

  const markAttendanceWithProximity = async (deviceAddress) => {
    setLoading(true);
    try {
      console.log('📤 Marking attendance - teacher device found at:', deviceAddress);
      await sessionAPI.markAttendanceProximity(session.id, {
        deviceAddress: deviceAddress,
      });
      setAttendanceMarked(true);
      console.log('✅ Attendance marked successfully!');
      Alert.alert('Success! ✅', 'Your attendance has been marked');
    } catch (error) {
      console.error('❌ Attendance marking error:', error.response?.data);
      Alert.alert(
        'Attendance Error',
        error.response?.data?.message || error.response?.data?.error || 'Failed to mark attendance'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualMarkAttendance = async () => {
    if (!isBluetoothOn) {
      Alert.alert('Bluetooth Required', 'Please enable Bluetooth first');
      return;
    }

    if (loading || isScanning) {
      return;
    }

    // Perform a fresh scan
    await scanForTeacher();
  };

  const renderDevice = ({ item }) => {
    const isTeacher = item.name && item.name.startsWith('ATTENDEASE-');
    return (
      <View style={[styles.deviceItem, isTeacher && styles.deviceItemTeacher]}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>
        {isTeacher && (
          <View style={styles.teacherBadge}>
            <Text style={styles.teacherBadgeText}>👨‍🏫 Teacher</Text>
          </View>
        )}
      </View>
    );
  };

  if (attendanceMarked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Attendance Recorded!</Text>
          <Text style={styles.successMessage}>
            Your attendance for {session.course_name} has been marked successfully
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('StudentDashboard')}
          >
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // teacherFound is now managed by state

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{session.course_name}</Text>
          <Text style={styles.sessionCode}>{session.course_code}</Text>
          <Text style={styles.sessionTeacher}>👨‍🏫 {session.teacher_name}</Text>
          {session.proximity_token && (
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenLabel}>Looking for:</Text>
              <Text style={styles.tokenValue}>ATTENDEASE-{session.proximity_token}</Text>
            </View>
          )}
        </View>

        <View style={[styles.bluetoothSection, !isBluetoothOn && styles.bluetoothSectionWarning]}>
          <View style={styles.bluetoothRow}>
            <Text style={styles.bluetoothLabel}>Bluetooth Status:</Text>
            <Text style={[styles.bluetoothStatus, isBluetoothOn && styles.bluetoothOn]}>
              {isBluetoothOn ? 'ON ✅' : 'OFF ❌'}
            </Text>
          </View>

          {!isBluetoothOn && (
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Enable Bluetooth to mark attendance</Text>
              <Switch
                value={isBluetoothOn}
                onValueChange={toggleBluetooth}
                trackColor={{ false: COLORS.mediumGray, true: COLORS.secondary }}
              />
            </View>
          )}
        </View>

        {isBluetoothOn && (
          <>
            <View style={[styles.statusSection, teacherFound && styles.statusSectionSuccess]}>
              {teacherFound ? (
                <>
                  <Text style={styles.statusIcon}>✅</Text>
                  <Text style={styles.statusTitle}>Teacher Device Found!</Text>
                  <Text style={styles.statusMessage}>
                    Teacher is nearby!
                  </Text>
                  <Text style={styles.statusMessage}>
                    Marking attendance automatically...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusIcon}>🔍</Text>
                  <Text style={styles.statusTitle}>{isScanning ? 'Scanning...' : 'Not Found'}</Text>
                  <Text style={styles.statusMessage}>
                    Move closer to the classroom and tap "Scan Now"
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.scanButton, (loading || isScanning) && styles.scanButtonDisabled]}
              onPress={handleManualMarkAttendance}
              disabled={loading || isScanning}
            >
              <Text style={styles.scanButtonText}>
                {isScanning ? '🔍 Scanning...' : loading ? '⏳ Marking...' : '📡 Scan Now'}
              </Text>
            </TouchableOpacity>

            <View style={styles.devicesSection}>
              <Text style={styles.devicesTitle}>Nearby Devices ({devices.length}):</Text>
              {devices.length > 0 ? (
                <FlatList
                  data={devices}
                  renderItem={renderDevice}
                  keyExtractor={(item) => item.address}
                  contentContainerStyle={styles.devicesList}
                  style={{ maxHeight: 300 }}
                />
              ) : (
                <Text style={styles.emptyText}>
                  {isScanning ? 'Scanning...' : 'No devices found'}
                </Text>
              )}
            </View>
          </>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sessionInfo: {
    marginBottom: 24,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  sessionCode: {
    fontSize: 16,
    color: COLORS.lightGray,
    marginBottom: 8,
  },
  sessionTeacher: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  tokenInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tokenLabel: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  bluetoothSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  bluetoothSectionWarning: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  bluetoothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bluetoothLabel: {
    fontSize: 16,
    color: COLORS.white,
  },
  bluetoothStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },
  bluetoothOn: {
    color: COLORS.secondary,
  },
  toggleContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.mediumGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
    flex: 1,
  },
  statusSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  statusSectionSuccess: {
    borderColor: COLORS.secondary,
    backgroundColor: '#064e3b',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  devicesSection: {
    flex: 1,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  devicesList: {
    gap: 8,
  },
  deviceItem: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  deviceItemTeacher: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
    backgroundColor: '#064e3b',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  deviceAddress: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  teacherBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teacherBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 60,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
  },
  homeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scanButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    opacity: 0.6,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
