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
  getDeviceAddress,
} from '../../services/bluetoothService';
import { COLORS } from '../../utils/constants';

export default function StartSessionScreen({ navigation, route }) {
  const { course } = route.params;
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [deviceAddress, setDeviceAddress] = useState(null);
  const [duration, setDuration] = useState(2);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    let interval;
    if (sessionStarted && sessionId) {
      // Poll for attendance updates
      interval = setInterval(() => {
        fetchSessionData();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStarted, sessionId]);

  const init = async () => {
    const granted = await requestBluetoothPermissions();
    if (granted) {
      const state = await checkBluetoothState();
      setIsBluetoothOn(state);
      
      if (state) {
        const address = await getDeviceAddress();
        setDeviceAddress(address || 'DEVICE-' + Date.now().toString().slice(-8));
      }
    }
  };

  const toggleBluetooth = async (value) => {
    if (value) {
      const success = await enableBluetooth();
      if (success) {
        const state = await checkBluetoothState();
        setIsBluetoothOn(state);
        if (state) {
          const address = await getDeviceAddress();
          setDeviceAddress(address || 'DEVICE-' + Date.now().toString().slice(-8));
        }
      }
    }
  };

  const fetchSessionData = async () => {
    try {
      const response = await sessionAPI.getSession(sessionId);
      setMarkedStudents(response.data.data.marked_students || []);
    } catch (error) {
      console.error('Fetch session error:', error);
    }
  };

  const handleStartSession = async () => {
    if (!isBluetoothOn) {
      Alert.alert('Bluetooth Required', 'Please turn on Bluetooth to start session');
      return;
    }

    if (!deviceAddress) {
      Alert.alert('Error', 'Could not get device address');
      return;
    }

    setLoading(true);
    try {
      const response = await sessionAPI.startSession({
        course_id: course.id,
        teacher_bluetooth_address: deviceAddress,
        duration_minutes: duration,
      });

      setSessionId(response.data.data.id);
      setSessionStarted(true);
      Alert.alert('Success', 'Attendance session started!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: async () => {
            try {
              await sessionAPI.endSession(sessionId);
              Alert.alert('Success', 'Session ended successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to end session');
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.full_name}</Text>
        <Text style={styles.studentId}>{item.student_id}</Text>
      </View>
      <View style={styles.successBadge}>
        <Text style={styles.successText}>✓</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{course.course_name}</Text>
          <Text style={styles.courseCode}>{course.course_code}</Text>
        </View>

        {!sessionStarted ? (
          <>
            <View style={styles.bluetoothSection}>
              <View style={styles.bluetoothRow}>
                <Text style={styles.bluetoothLabel}>Bluetooth Status:</Text>
                <Text style={[styles.bluetoothStatus, isBluetoothOn && styles.bluetoothOn]}>
                  {isBluetoothOn ? 'ON ✅' : 'OFF ❌'}
                </Text>
              </View>

              {!isBluetoothOn && (
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>Enable Bluetooth</Text>
                  <Switch
                    value={isBluetoothOn}
                    onValueChange={toggleBluetooth}
                    trackColor={{ false: COLORS.mediumGray, true: COLORS.secondary }}
                  />
                </View>
              )}

              {deviceAddress && (
                <View style={styles.addressContainer}>
                  <Text style={styles.addressLabel}>Device Address:</Text>
                  <Text style={styles.addressText}>{deviceAddress}</Text>
                </View>
              )}
            </View>

            <View style={styles.durationSection}>
              <Text style={styles.durationLabel}>Session Duration:</Text>
              <View style={styles.durationButtons}>
                {[1, 2, 3, 5].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.durationButton, duration === min && styles.durationButtonActive]}
                    onPress={() => setDuration(min)}
                  >
                    <Text style={[styles.durationButtonText, duration === min && styles.durationButtonTextActive]}>
                      {min} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startButton, (!isBluetoothOn || loading) && styles.buttonDisabled]}
              onPress={handleStartSession}
              disabled={!isBluetoothOn || loading}
            >
              <Text style={styles.startButtonText}>
                {loading ? 'Starting...' : '🚀 Start Attendance Session'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.liveSection}>
              <View style={styles.liveHeader}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>🔴 LIVE</Text>
                </View>
                <Text style={styles.countText}>
                  {markedStudents.length} students marked
                </Text>
              </View>

              <Text style={styles.instructionText}>
                Students can now mark their attendance by scanning for your device
              </Text>
            </View>

            <View style={styles.studentsList}>
              <Text style={styles.studentsTitle}>Marked Attendances:</Text>
              {markedStudents.length === 0 ? (
                <Text style={styles.emptyText}>No students marked yet...</Text>
              ) : (
                <FlatList
                  data={markedStudents}
                  renderItem={renderStudent}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </View>

            <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
              <Text style={styles.endButtonText}>⏹ End Session</Text>
            </TouchableOpacity>
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
  courseInfo: {
    marginBottom: 24,
  },
  courseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 16,
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
  bluetoothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.mediumGray,
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  addressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.mediumGray,
  },
  addressLabel: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  durationSection: {
    marginBottom: 24,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  durationButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  durationButtonText: {
    fontSize: 14,
    color: COLORS.lightGray,
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: COLORS.white,
  },
  startButton: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  liveSection: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  countText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.lightGray,
    lineHeight: 20,
  },
  studentsList: {
    flex: 1,
    marginBottom: 20,
  },
  studentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 20,
  },
  listContent: {
    gap: 8,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  studentId: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  successBadge: {
    backgroundColor: COLORS.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  endButton: {
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  endButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
