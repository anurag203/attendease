import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { courseAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { useFocusEffect } from '@react-navigation/native';

export default function TeacherDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response.data.data);
    } catch (error) {
      console.error('Fetch courses error:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${courseName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await courseAPI.deleteCourse(courseId);
              fetchCourses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  const renderCourse = ({ item }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.course_name}</Text>
          <Text style={styles.courseCode}>{item.course_code}</Text>
        </View>
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => {
            Alert.alert(
              item.course_name,
              'Choose an action',
              [
                {
                  text: 'View Stats',
                  onPress: () => navigation.navigate('CourseDetails', { courseId: item.id }),
                },
                {
                  text: 'Edit',
                  onPress: () => navigation.navigate('CreateCourse', { course: item }),
                },
                {
                  text: 'Delete',
                  onPress: () => handleDeleteCourse(item.id, item.course_name),
                  style: 'destructive',
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.optionsText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.courseDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>👥</Text>
          <Text style={styles.detailText}>{item.student_count || 0} students</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>🎓</Text>
          <Text style={styles.detailText}>{item.degree}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📚</Text>
          <Text style={styles.detailText}>{item.branch}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>Year {item.year}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('StartSession', { course: item })}
        >
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('SessionHistory', { courseId: item.id, courseName: item.course_name })}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Courses</Text>
          <Text style={styles.headerSubtitle}>{user?.department}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No courses yet</Text>
          <Text style={styles.emptySubtext}>Create your first course to get started</Text>
        </View>
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

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateCourse')}
      >
        <Text style={styles.addButtonText}>+ Add Course</Text>
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
    fontSize: 14,
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
  },
  listContent: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
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
  },
  optionsButton: {
    padding: 4,
  },
  optionsText: {
    fontSize: 24,
    color: COLORS.lightGray,
  },
  courseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.lightGray,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
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
  addButton: {
    backgroundColor: COLORS.secondary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
