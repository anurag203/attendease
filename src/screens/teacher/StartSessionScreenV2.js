import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
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

const TIME_OPTIONS = [
  { label: '2 minutes', value: 2 },
  { label: '5 minutes', value: 5 },
  { label: '7 minutes', value: 7 },
  { label: '10 minutes', value: 10 },
];

export default function StartSessionScreen({ navigation, route }) {
  const { course, existingSessionId } = route.params;
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [deviceAddress, setDeviceAddress] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [sessionStarted, setSessionStarted] = useState(!!existingSessionId);
  const [sessionId, setSessionId] = useState(existingSessionId || null);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    init();
    // If resuming existing session, load it
    if (existingSessionId) {
      loadExistingSession(existingSessionId);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    let interval;
    if (sessionStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleEndSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStarted, timeRemaining]);

  // Poll for attendance updates
  useEffect(() => {
    let interval;
    if (sessionStarted && sessionId) {
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

    // Get total students for this course
    setTotalStudents(course.student_count || 0);
  };

  const loadExistingSession = async (sessionId) => {
    try {
      const response = await sessionAPI.getSession(sessionId);
      const session = response.data?.data || response.data;
      
      if (session) {
        // Calculate remaining time
        const startTime = new Date(session.start_time).getTime();
        const durationMs = session.duration * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = Date.now();
        const remainingSeconds = Math.floor((endTime - now) / 1000);
        
        if (remainingSeconds > 0) {
          setTimeRemaining(remainingSeconds);
          setMarkedStudents(session.marked_students || []);
        } else {
          // Session has already ended
          Alert.alert('Session Ended', 'This session has already ended');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session');
      navigation.goBack();
    }
  };

  const handleBluetoothToggle = async () => {
    if (!isBluetoothOn) {
      const enabled = await enableBluetooth();
      if (enabled) {
        setIsBluetoothOn(true);
        const address = await getDeviceAddress();
        setDeviceAddress(address || 'DEVICE-' + Date.now().toString().slice(-8));
      }
    }
  };

  const handleStartSession = async () => {
    if (!isBluetoothOn) {
      Alert.alert('Bluetooth Required', 'Please enable Bluetooth to start session');
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
        duration_minutes: selectedDuration,
      });

      setSessionId(response.data.data.id);
      setSessionStarted(true);
      setTimeRemaining(selectedDuration * 60); // Convert to seconds
      Alert.alert('Success', 'Attendance session started!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async () => {
    if (!sessionId) return;

    try {
      const response = await sessionAPI.getSession(sessionId);
      const attendanceList = response.data?.data?.attendance || [];
      setMarkedStudents(attendanceList);
    } catch (error) {
      console.error('Error fetching session data:', error);
      // Silently fail - don't show error to user during live session
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await sessionAPI.endSession(sessionId);
      Alert.alert('Session Ended', 'Attendance session has been closed', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (selectedDuration === 0) return 0;
    return ((selectedDuration * 60 - timeRemaining) / (selectedDuration * 60)) * 100;
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <Text style={styles.studentIcon}>✓</Text>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.full_name || item.student_id}</Text>
        <Text style={styles.studentTime}>
          {new Date(item.marked_at).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  if (!sessionStarted) {
    // Pre-session setup screen
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Attendance Session</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseName}>{course.course_name}</Text>
            <Text style={styles.courseCode}>#{course.course_code}</Text>
          </View>

          {/* Bluetooth Toggle */}
          <View style={styles.bluetoothSection}>
            <View style={styles.bluetoothHeader}>
              <Text style={styles.sectionTitle}>📡 Bluetooth</Text>
              <TouchableOpacity
                style={[styles.statusBadge, isBluetoothOn && styles.statusBadgeOn]}
                onPress={handleBluetoothToggle}
              >
                <Text style={styles.statusText}>
                  {isBluetoothOn ? 'ON ✓' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
            {deviceAddress && (
              <Text style={styles.deviceAddress}>Device: {deviceAddress}</Text>
            )}
          </View>

          {/* Time Selection */}
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>⏱️ Session Duration</Text>
            <View style={styles.timeOptions}>
              {TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeOption,
                    selectedDuration === option.value && styles.timeOptionSelected,
                  ]}
                  onPress={() => setSelectedDuration(option.value)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selectedDuration === option.value && styles.timeOptionTextSelected,
                    ]}
                  >
                    {option.label}
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
        </View>
      </SafeAreaView>
    );
  }

  // Active session screen with circular timer
  return (
    <SafeAreaView style={styles.container}>
      {/* Course Header */}
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionCourseName}>{course.course_name}</Text>
        <Text style={styles.sessionCourseCode}>#{course.course_code}</Text>
      </View>

      {/* Circular Timer */}
      <View style={styles.timerSection}>
        <View style={styles.circularTimer}>
          <View style={styles.timerInner}>
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timerLabel}>remaining</Text>
          </View>
        </View>
        
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.statsText}>
          👥 {markedStudents.length} / {totalStudents} students marked
        </Text>
      </View>

      {/* Students List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>✓ Students Marked Attendance</Text>
        <FlatList
          data={markedStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id?.toString() || item.student_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Waiting for students to mark attendance...</Text>
          }
        />
      </View>

      {/* End Session Button */}
      <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
        <Text style={styles.endButtonText}>⏹️ End Session Early</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  courseInfo: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 20,
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
  },
  courseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bluetoothSection: {
    backgroundColor: COLORS.darkGray,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  bluetoothHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeOn: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  deviceAddress: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 8,
  },
  timeSection: {
    marginBottom: 32,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  timeOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
  },
  timeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.lightGray,
  },
  timeOptionTextSelected: {
    color: COLORS.primary,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Active session styles
  sessionHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  sessionCourseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  sessionCourseCode: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  timerSection: {
    alignItems: 'center',
    padding: 32,
  },
  circularTimer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: COLORS.primary,
    marginBottom: 24,
  },
  timerInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  timerLabel: {
    fontSize: 16,
    color: COLORS.lightGray,
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.darkGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  statsSection: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.darkGray,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  listSection: {
    flex: 1,
    marginHorizontal: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  studentIcon: {
    fontSize: 24,
    marginRight: 12,
    color: '#10b981',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  studentTime: {
    fontSize: 12,
    color: COLORS.lightGray,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 40,
  },
  endButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
