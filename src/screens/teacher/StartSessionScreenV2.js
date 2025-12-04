import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI } from '../../services/api';
import {
  requestBluetoothPermissions,
  checkBluetoothState,
  enableBluetooth,
} from '../../services/bluetoothService';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

const TIME_OPTIONS = [
  { label: '2 minutes', value: 2 },
  { label: '5 minutes', value: 5 },
  { label: '7 minutes', value: 7 },
  { label: '10 minutes', value: 10 },
];

export default function StartSessionScreen({ navigation, route }) {
  const { course, existingSessionId } = route.params;
  const { user } = useAuth();
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [sessionStarted, setSessionStarted] = useState(!!existingSessionId);
  const [sessionId, setSessionId] = useState(existingSessionId || null);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [checkingBluetooth, setCheckingBluetooth] = useState(true);

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
      // Fetch immediately when session starts
      fetchSessionData();
      
      // Then poll every 3 seconds
      interval = setInterval(() => {
        fetchSessionData();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStarted, sessionId, fetchSessionData]);

  // Listen for app state changes to detect when returning from settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App became active, re-check Bluetooth state
        console.log('🔄 App became active, checking Bluetooth...');
        const state = await checkBluetoothState();
        setIsBluetoothOn(state);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Continuously monitor Bluetooth state
  useEffect(() => {
    const checkBluetoothContinuously = async () => {
      const state = await checkBluetoothState();
      
      // Only update if state changed
      if (state !== isBluetoothOn) {
        console.log('🔵 Bluetooth state changed:', isBluetoothOn, '→', state);
        setIsBluetoothOn(state);
        
        // If Bluetooth turned OFF during active session
        if (!state && sessionStarted && sessionId) {
          console.log('🛑 Ending session immediately due to Bluetooth OFF');
          
          // Stop BLE advertising
          if (BleAdvertiser) {
            try {
              await BleAdvertiser.stopAdvertising();
            } catch (error) {
              console.error('Error stopping advertising:', error);
            }
          }
          
          // End session
          await handleEndSession(false);
          
          // Show alert
          Alert.alert(
            '⚠️ Session Ended',
            'Bluetooth was turned off. The session has been ended automatically.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ],
            { cancelable: false }
          );
        }
      }
    };

    // Check immediately
    checkBluetoothContinuously();

    // Then check every 2 seconds
    const interval = setInterval(checkBluetoothContinuously, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isBluetoothOn, sessionStarted, sessionId]);

  const init = async () => {
    setCheckingBluetooth(true);
    const granted = await requestBluetoothPermissions();
    if (granted) {
      const state = await checkBluetoothState();
      setIsBluetoothOn(state);
      console.log('✅ Bluetooth initial state:', state ? 'ON' : 'OFF');
    }
    setCheckingBluetooth(false);

    // Get total students for this course
    let studentCount = course.student_count || course.students?.length || 0;
    
    // If still 0, fetch from API
    if (studentCount === 0 && course.id) {
      try {
        const courseAPI = require('../../services/api').courseAPI;
        const response = await courseAPI.getCourse(course.id);
        const fetchedCourse = response.data.data;
        studentCount = fetchedCourse.students?.length || 0;
        console.log('📊 Fetched student count:', studentCount);
      } catch (error) {
        console.error('Failed to fetch student count:', error);
      }
    }
    
    setTotalStudents(studentCount);
    console.log('👥 Total students for session:', studentCount);
  };

  const loadExistingSession = async (sessionId) => {
    try {
      const response = await sessionAPI.getSession(sessionId);
      const session = response.data?.data || response.data;
      
      console.log('📊 Loading existing session:', {
        sessionId,
        session_date: session?.session_date,
        duration_minutes: session?.duration_minutes,
        status: session?.status,
        now: new Date().toISOString()
      });
      
      if (session) {
        // Check if session is still active
        if (session.status === 'ended') {
          console.log('❌ Session status is "ended"');
          Alert.alert('Session Ended', 'This session has already ended');
          navigation.goBack();
          return;
        }

        // Calculate remaining time
        const startTime = new Date(session.session_date).getTime();
        const durationMs = session.duration_minutes * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = Date.now();
        const remainingSeconds = Math.floor((endTime - now) / 1000);
        
        console.log('⏱️ Time calculation:', {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          now: new Date(now).toISOString(),
          remainingSeconds
        });
        
        if (remainingSeconds > 0) {
          console.log('✅ Session is active, remaining:', remainingSeconds);
          setTimeRemaining(remainingSeconds);
          setMarkedStudents(session.attendance || session.marked_students || []);
        } else {
          // Session has already ended
          console.log('❌ Time expired, remaining:', remainingSeconds);
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
        console.log('✅ Bluetooth enabled');
      }
    }
  };

  const handleStartSession = async () => {
    // Check if teacher has configured Bluetooth MAC address
    if (!user?.bluetooth_mac) {
      Alert.alert(
        'Setup Required',
        'Please configure your Bluetooth MAC address before starting a session.',
        [
          { text: 'Setup Now', onPress: () => navigation.navigate('BluetoothSetup') },
          { text: 'Cancel' }
        ]
      );
      return;
    }

    // Check Bluetooth is ON first
    const btState = await checkBluetoothState();
    if (!btState) {
      Alert.alert(
        'Bluetooth Required',
        'Please enable Bluetooth to start broadcasting',
        [
          { text: 'Enable', onPress: async () => {
            await enableBluetooth();
            handleStartSession();
          }},
          { text: 'Cancel' }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await sessionAPI.startSession({
        course_id: course.id,
        duration_minutes: selectedDuration,
      });

      const sessionData = response.data.data;
      setSessionId(sessionData.id);
      setSessionStarted(true);
      setTimeRemaining(selectedDuration * 60); // Convert to seconds
      
      // Simple approach: Just keep Bluetooth ON
      Alert.alert(
        'Session Started! ✅',
        '📱 Keep your Bluetooth ON!\n\nStudents nearby can now scan and mark their attendance automatically.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Start session error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await sessionAPI.getSession(sessionId);
      const sessionData = response.data?.data;
      const attendanceList = sessionData?.attendance || sessionData?.marked_students || [];
      
      console.log('📊 Fetched session data:', {
        sessionId,
        attendanceCount: attendanceList.length,
        totalStudents: sessionData?.total_students
      });
      
      setMarkedStudents(attendanceList);
      
      // Also update total students count if available from session
      if (sessionData?.total_students !== undefined) {
        setTotalStudents(sessionData.total_students);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      // Silently fail - don't show error to user during live session
    }
  }, [sessionId]);

  const confirmEndSession = () => {
    Alert.alert(
      'End Session Early?',
      `Are you sure you want to end this session early?\n\n${markedStudents.length}/${totalStudents} students have marked attendance.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => handleEndSession(true),
        },
      ]
    );
  };

  const handleEndSession = async (showAlert = true) => {
    if (!sessionId) return;

    try {
      // Stop timer immediately
      setSessionStarted(false);
      setTimeRemaining(0);
      
      await sessionAPI.endSession(sessionId);
      
      if (showAlert) {
        Alert.alert('Session Ended', 'Attendance session has been closed', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
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
        <Text style={styles.studentName}>{item.full_name || 'Unknown'}</Text>
        <Text style={styles.studentId}>{item.student_id}</Text>
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

          {/* Bluetooth Status Section */}
          <View style={[styles.bluetoothStatusCard, !isBluetoothOn && styles.bluetoothStatusCardOff]}>
            <View style={styles.bluetoothStatusHeader}>
              <Text style={styles.bluetoothStatusIcon}>{isBluetoothOn ? '📡' : '⚠️'}</Text>
              <View style={styles.bluetoothStatusInfo}>
                <Text style={styles.bluetoothStatusTitle}>
                  Bluetooth {isBluetoothOn ? 'ON' : 'OFF'}
                </Text>
                <Text style={styles.bluetoothStatusSubtitle}>
                  {isBluetoothOn 
                    ? 'Ready to start session'
                    : 'Please enable Bluetooth to continue'
                  }
                </Text>
              </View>
            </View>
            {!isBluetoothOn && (
              <TouchableOpacity
                style={styles.enableBluetoothButton}
                onPress={handleBluetoothToggle}
              >
                <Text style={styles.enableBluetoothText}>Enable Bluetooth</Text>
              </TouchableOpacity>
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
              {loading ? 'Starting...' : !isBluetoothOn ? '📡 Enable Bluetooth First' : '🚀 Start Attendance Session'}
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

      {/* Simple Session Active Status Bar */}
      <View style={styles.activeStatusBar}>
        <Text style={styles.activeStatusText}>✅ Session Active • Bluetooth ON</Text>
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
      <TouchableOpacity style={styles.endButton} onPress={confirmEndSession}>
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
  bluetoothStatusCard: {
    backgroundColor: '#064e3b',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  bluetoothStatusCardOff: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  bluetoothStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bluetoothStatusIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  bluetoothStatusInfo: {
    flex: 1,
  },
  bluetoothStatusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  bluetoothStatusSubtitle: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  enableBluetoothButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  enableBluetoothText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
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
  },
  studentId: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
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
  // Simple Active Status Bar
  activeStatusBar: {
    backgroundColor: '#10b981',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
