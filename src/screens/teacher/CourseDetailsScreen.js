import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { courseAPI, sessionAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function CourseDetailsScreen({ navigation, route }) {
  const { course: initialCourse } = route.params;
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (initialCourse?.id) {
      fetchCourse();
      checkActiveSession();
    }
  }, []);

  // Refresh active session when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkActiveSession();
    }, [course.id])
  );

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourse(course.id);
      setCourse(response.data.data);
    } catch (error) {
      console.error('Fetch course error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await sessionAPI.getActiveSessions();
      const sessions = response.data.data || [];
      const session = sessions.find(s => s.course_id === course.id);
      setActiveSession(session);
    } catch (error) {
      console.error('Check active session error:', error);
    }
  };

  const handleStartSession = () => {
    // Add student count to course object
    const courseWithCount = {
      ...course,
      student_count: course.students?.length || 0
    };
    
    if (activeSession) {
      // Navigate directly to active session
      navigation.navigate('StartSession', { 
        course: courseWithCount,
        existingSessionId: activeSession.id 
      });
    } else {
      // Navigate to start new session
      navigation.navigate('StartSession', { course: courseWithCount });
    }
  };

  const handleAddStudent = async () => {
    if (!studentId.trim()) {
      Alert.alert('Error', 'Please enter a student ID');
      return;
    }

    try {
      await courseAPI.addStudentToCourse(course.id, { student_id: studentId });
      Alert.alert('Success', 'Student added to course');
      setStudentId('');
      setAddStudentModal(false);
      fetchCourse();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleRemoveStudent = (student) => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${student.full_name || student.student_id} from this course?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await courseAPI.removeStudentFromCourse(course.id, student.id);
              Alert.alert('Success', 'Student removed from course');
              fetchCourse();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove student');
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentIcon}>👤</Text>
        <View style={styles.studentDetails}>
          <Text style={styles.studentName}>{item.full_name || 'No Name'}</Text>
          <Text style={styles.studentIdText}>{item.student_id}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveStudent(item)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{course?.course_name}</Text>
        <Text style={styles.courseCode}>#{course?.course_code}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartSession}
        >
          <Text style={styles.buttonIcon}>{activeSession ? '👁️' : '🚀'}</Text>
          <Text style={styles.primaryButtonText}>
            {activeSession ? 'View Active Session' : 'Start Attendance Session'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SessionHistory', { 
            courseId: course.id, 
            courseName: course.course_name 
          })}
        >
          <Text style={styles.buttonIcon}>📊</Text>
          <Text style={styles.secondaryButtonText}>Attendance History</Text>
        </TouchableOpacity>
      </View>

      {/* Students Section */}
      <View style={styles.studentsHeader}>
        <Text style={styles.sectionTitle}>
          👥 Enrolled Students ({course?.students?.length || 0})
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddStudentModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={course?.students || []}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No students enrolled yet</Text>
              <Text style={styles.emptySubtext}>
                Students are auto-enrolled based on degree/branch/year
              </Text>
            </View>
          }
        />
      )}

      {/* Add Student Modal */}
      <Modal
        visible={addStudentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Student Manually</Text>
            <Text style={styles.modalSubtitle}>Enter the student ID to add</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Student ID (e.g., 2021UCS001)"
              placeholderTextColor={COLORS.lightGray}
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setAddStudentModal(false);
                  setStudentId('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddStudent}
              >
                <Text style={styles.modalAddText}>Add Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionSection: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: COLORS.darkGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    gap: 8,
  },
  buttonIcon: {
    fontSize: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  studentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  studentItem: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  studentIdText: {
    fontSize: 13,
    color: COLORS.lightGray,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  centerContainer: {
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
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalAddButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
