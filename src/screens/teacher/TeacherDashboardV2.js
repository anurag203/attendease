import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { courseAPI, sessionAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function TeacherDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null);

  // Refresh courses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCourses();
    }, [])
  );

  const fetchCourses = async () => {
    try {
      const [coursesResponse, sessionsResponse] = await Promise.all([
        courseAPI.getMyCourses(),
        sessionAPI.getActiveSessions(),
      ]);
      
      // Handle both response.data and response.data.data formats
      const coursesData = coursesResponse.data?.data || coursesResponse.data;
      const sessionsData = sessionsResponse.data?.data || sessionsResponse.data || [];
      
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setActiveSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleDeleteCourse = (courseId) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting course:', courseId);
              const response = await courseAPI.deleteCourse(courseId);
              console.log('✅ Delete response:', response.data);
              Alert.alert('Success', 'Course deleted successfully');
              await fetchCourses();
            } catch (error) {
              console.error('❌ Delete course error:', error);
              const errorMsg = error.response?.data?.error || error.message || 'Failed to delete course';
              Alert.alert('Error', errorMsg);
            }
          },
        },
      ]
    );
  };

  const CourseCard = ({ course }) => {
    // Check if this course has an active session
    const activeSession = activeSessions.find(s => s.course_id === course.id);
    
    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={styles.courseCard}
          onPress={() => {
            if (menuVisible === course.id) {
              setMenuVisible(null);
            } else {
              navigation.navigate('CourseDetails', { course });
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseName}>{course.course_name}</Text>
              <Text style={styles.courseCode}>#{course.course_code}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={(e) => {
                e.stopPropagation();
                setMenuVisible(menuVisible === course.id ? null : course.id);
              }}
            >
              <Text style={styles.menuDots}>⋮</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🎓</Text>
              <Text style={styles.detailText}>{course.degree}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📖</Text>
              <Text style={styles.detailText}>{course.branch}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>Year {course.year}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Three-dot menu - OUTSIDE TouchableOpacity */}
        {menuVisible === course.id && (
          <View style={styles.menuOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(null);
                navigation.navigate('EditStudents', { course });
              }}
            >
              <Text style={styles.menuOptionText}>✏️ Edit Students</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(null);
                navigation.navigate('CourseDetails', { course });
              }}
            >
              <Text style={styles.menuOptionText}>📊 View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, styles.menuOptionDanger]}
              onPress={() => {
                setMenuVisible(null);
                handleDeleteCourse(course.id);
              }}
            >
              <Text style={[styles.menuOptionText, styles.menuOptionTextDanger]}>
                🗑️ Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Close menu overlay - moved to end for proper z-index */}

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name || 'Teacher'}</Text>
          <Text style={styles.subtitle}>📚 My Courses</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', onPress: logout },
            ]);
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={courses}
        renderItem={({ item }) => <CourseCard course={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No courses yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first course to get started
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCourse')}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Add Course</Text>
      </TouchableOpacity>

      {/* Overlay to close menu */}
      {menuVisible && (
        <View
          style={styles.fullScreenOverlay}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => setMenuVisible(null)}
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
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  courseCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  menuDots: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.lightGray,
    fontWeight: '500',
  },
  menuOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 1000,
    zIndex: 10000,
    minWidth: 180,
  },
  menuOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  menuOptionText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '500',
  },
  menuOptionDanger: {
    borderBottomWidth: 0,
  },
  menuOptionTextDanger: {
    color: '#ef4444',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 8,
  },
  fabText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  activeSessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  activeSessionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  resumeButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
