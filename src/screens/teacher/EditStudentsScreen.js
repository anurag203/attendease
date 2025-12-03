import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { courseAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function EditStudentsScreen({ navigation, route }) {
  const { course: initialCourse } = route.params;
  const [course, setCourse] = useState(initialCourse);
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get course with current students
      const courseResponse = await courseAPI.getCourse(course.id);
      const courseData = courseResponse.data.data;
      setCourse(courseData);

      // Create set of enrolled student IDs for quick lookup
      const enrolled = new Set(courseData.students.map(s => s.id));
      setEnrolledStudentIds(enrolled);

      // For now, all students list is the same as enrolled
      // In a real app, you'd fetch all students matching degree/branch/year
      setAllStudents(courseData.students);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    setEnrolledStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleAddStudent = async () => {
    const trimmedId = studentIdInput.trim().toUpperCase();
    
    if (!trimmedId) {
      Alert.alert('Error', 'Please enter a student ID');
      return;
    }

    try {
      await courseAPI.addStudentToCourse(course.id, { student_id: trimmedId });
      Alert.alert('Success', 'Student added to course');
      setStudentIdInput('');
      setAddStudentModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleSave = async () => {
    // Get students to remove (were enrolled but now unchecked)
    const studentsToRemove = course.students.filter(
      student => !enrolledStudentIds.has(student.id)
    );

    if (studentsToRemove.length === 0) {
      Alert.alert('No Changes', 'No students were removed');
      navigation.goBack();
      return;
    }

    Alert.alert(
      'Confirm Changes',
      `Remove ${studentsToRemove.length} student(s) from this course?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setSaving(true);
            let errors = 0;

            for (const student of studentsToRemove) {
              try {
                await courseAPI.removeStudentFromCourse(course.id, student.id);
              } catch (error) {
                errors++;
              }
            }

            setSaving(false);

            if (errors === 0) {
              Alert.alert('Success', 'Student list updated successfully');
              await fetchData(); // Refresh the list to show updated data
              // Update enrolled set to reflect current state
              const updatedEnrolledIds = new Set(
                allStudents
                  .filter(s => !studentsToRemove.find(r => r.id === s.id))
                  .map(s => s.id)
              );
              setEnrolledStudentIds(updatedEnrolledIds);
            } else {
              Alert.alert('Partial Success', `Failed to remove ${errors} student(s)`);
              await fetchData(); // Refresh even on partial success
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }) => {
    const isEnrolled = enrolledStudentIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={styles.studentItem}
        onPress={() => toggleStudent(item.id)}
      >
        <View style={styles.checkbox}>
          {isEnrolled && <View style={styles.checkboxChecked} />}
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.full_name || 'No Name'}</Text>
          <Text style={styles.studentId}>{item.student_id}</Text>
        </View>
      </TouchableOpacity>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Student List</Text>
        <Text style={styles.subtitle}>{course?.course_name}</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          ✓ Checked = Enrolled | Tap to uncheck and remove
        </Text>
      </View>

      <FlatList
        data={allStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddStudentModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Student Modal */}
      <Modal
        visible={addStudentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Student to Course</Text>
            <Text style={styles.modalSubtitle}>Enter Student ID (case-insensitive)</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 2021UCS001"
              placeholderTextColor={COLORS.lightGray}
              value={studentIdInput}
              onChangeText={setStudentIdInput}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setAddStudentModal(false);
                  setStudentIdInput('');
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
  subtitle: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  instructions: {
    backgroundColor: COLORS.darkGray,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 150,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
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
  studentId: {
    fontSize: 13,
    color: COLORS.lightGray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.mediumGray,
    gap: 12,
  },
  addButton: {
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Modal styles
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
