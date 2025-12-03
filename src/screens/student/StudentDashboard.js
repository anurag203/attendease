import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { courseAPI, sessionAPI } from '../../services/api';
import { COLORS, formatYear } from '../../utils/constants';
import { useFocusEffect } from '@react-navigation/native';

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = async () => {
    try {
      const [coursesRes, sessionsRes] = await Promise.all([
        courseAPI.getCourses(),
        sessionAPI.getActiveSessions(),
      ]);
      
      const coursesData = coursesRes.data.data || [];
      console.log('📚 Student Profile:', { 
        degree: user?.degree, 
        branch: user?.branch, 
        year: user?.year 
      });
      console.log('📚 Courses Received:', coursesData.length, coursesData);
      
      setCourses(coursesData);
      setActiveSessions(sessionsRes.data.data || []);
    } catch (error) {
      console.error('Fetch data error:', error);
      if (!refreshing) { // Only show alert if not a background refresh
        Alert.alert('Error', 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const calculateTimeRemaining = (sessionDate, durationMinutes) => {
    const startTime = new Date(sessionDate);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const remaining = Math.floor((endTime - currentTime) / 1000);
    
    if (remaining <= 0) return { minutes: 0, seconds: 0, percentage: 0 };
    
    const totalSeconds = durationMinutes * 60;
    const percentage = (remaining / totalSeconds) * 100;
    
    return {
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60,
      percentage: Math.max(0, Math.min(100, percentage))
    };
  };

  const renderCircularTimer = (sessionDate, durationMinutes) => {
    const { minutes, seconds, percentage } = calculateTimeRemaining(sessionDate, durationMinutes);
    
    return (
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <View style={[styles.timerFill, { 
            transform: [{ rotate: `${(percentage / 100) * 360}deg` }] 
          }]} />
          <View style={styles.timerInner}>
            <Text style={styles.timerText}>{minutes}:{seconds.toString().padStart(2, '0')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCourse = ({ item }) => {
    const activeSession = activeSessions.find(s => s.course_id === item.id);
    const attendanceMarked = activeSession?.attendance_marked === true;
    
    return (
      <View style={styles.courseCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {activeSession && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>🔴 LIVE SESSION</Text>
              </View>
            )}
          </View>
          
          {/* Circular timer at top right */}
          {activeSession && !attendanceMarked && (
            <View style={styles.cardHeaderRight}>
              {renderCircularTimer(activeSession.session_date, activeSession.duration_minutes)}
            </View>
          )}
        </View>
        
        {/* Green attendance banner */}
        {activeSession && attendanceMarked && (
          <View style={styles.attendanceMarkedBanner}>
            <Text style={styles.attendanceMarkedIcon}>✅</Text>
            <Text style={styles.attendanceMarkedText}>Attendance Marked</Text>
          </View>
        )}
        
        <Text style={styles.courseName}>{item.course_name}</Text>
        <Text style={styles.courseCode}>{item.course_code}</Text>
        
        <View style={styles.courseDetails}>
          <Text style={styles.detailText}>👨‍🏫 {item.teacher_name}</Text>
          <Text style={styles.detailText}>📚 {item.branch}</Text>
        </View>

        <View style={styles.buttonRow}>
          {/* Show Mark Attendance if attendance NOT marked */}
          {activeSession && !attendanceMarked && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => navigation.navigate('JoinSession', { session: activeSession })}
            >
              <Text style={styles.joinButtonText}>📍 Mark Attendance</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.historyButton, (activeSession && !attendanceMarked) && { flex: 1 }]}
            onPress={() => navigation.navigate('CourseHistory', { 
              course: item
            })}
          >
            <Text style={styles.historyButtonText}>📅 View History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Courses</Text>
          <Text style={styles.headerSubtitle}>
            {user?.student_id} • {user?.branch} • {formatYear(user?.year)}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {activeSessions.length > 0 && (
        <View style={styles.activeSessionsBanner}>
          <Text style={styles.bannerText}>
            🔴 {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''} available
          </Text>
        </View>
      )}

      {loading ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          <Text style={styles.loadingText}>Loading courses...</Text>
        </ScrollView>
      ) : courses.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          <Text style={styles.emptyText}>No courses found</Text>
          <Text style={styles.emptySubtext}>
            Courses will appear based on your degree, branch, and year
          </Text>
          <Text style={styles.refreshHint}>
            👇 Pull down to refresh
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.danger,
  },
  activeSessionsBanner: {
    backgroundColor: COLORS.danger,
    padding: 12,
    alignItems: 'center',
  },
  bannerText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  refreshHint: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    marginLeft: 12,
  },
  liveBadge: {
    backgroundColor: COLORS.danger,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  timerInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceMarkedBanner: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  attendanceMarkedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  attendanceMarkedText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginBottom: 12,
  },
  courseDetails: {
    gap: 6,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.lightGray,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  joinButton: {
    flex: 2,
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  historyButton: {
    flex: 1,
    backgroundColor: COLORS.mediumGray,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  historyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
