import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  
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
  discoverNearbyDevices,
  isDeviceNearby,
} from '../../services/bluetoothService';
import { COLORS } from '../../utils/constants';

export default function JoinSessionScreen({ navigation, route }) {
  const { session } = route.params;
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    let interval;
    if (isBluetoothOn && !attendanceMarked) {
      // Scan every 5 seconds
      interval = setInterval(() => {
        scanForTeacher();
      }, 5000);
      
      // Initial scan
      scanForTeacher();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBluetoothOn, attendanceMarked]);

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
    if (!isBluetoothOn || isScanning) return;

    setIsScanning(true);
    try {
      const foundDevices = await discoverNearbyDevices();
      setDevices(foundDevices);

      // Check if teacher's device is nearby
      const teacherNearby = isDeviceNearby(foundDevices, session.teacher_bluetooth_address);
      
      if (teacherNearby && !attendanceMarked) {
        // Auto-mark attendance
        await markAttendance(true);
      }
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const markAttendance = async (bluetoothVerified) => {
    setLoading(true);
    try {
      await sessionAPI.markAttendance(session.id, { bluetooth_verified: bluetoothVerified });
      setAttendanceMarked(true);
      Alert.alert(
        'Success! ✅',
        'Your attendance has been marked successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const renderDevice = ({ item }) => {
    const isTeacher = item.address === session.teacher_bluetooth_address;
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

  const teacherFound = isDeviceNearby(devices, session.teacher_bluetooth_address);

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
                    You are in range. Your attendance will be marked automatically.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusIcon}>🔍</Text>
                  <Text style={styles.statusTitle}>Searching...</Text>
                  <Text style={styles.statusMessage}>
                    Move closer to the classroom to mark attendance
                  </Text>
                </>
              )}
            </View>

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
});
