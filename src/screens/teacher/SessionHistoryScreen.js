import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function SessionHistoryScreen({ navigation, route }) {
  const { courseId, courseName } = route.params;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await sessionAPI.getCourseHistory(courseId);
      setSessions(response.data.data);
    } catch (error) {
      console.error('Fetch sessions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const viewStudents = async (session) => {
    setSelectedSession(session);
    setLoadingStudents(true);
    setModalVisible(true);
    
    try {
      const response = await sessionAPI.getSession(session.id);
      const attendance = response.data?.data?.attendance || [];
      setStudentList(attendance);
    } catch (error) {
      console.error('Fetch students error:', error);
      Alert.alert('Error', 'Failed to load student list');
    } finally {
      setLoadingStudents(false);
    }
  };

  const confirmDeleteStudent = (attendanceId, studentName) => {
    Alert.alert(
      'Remove Student?',
      `Are you sure you want to remove ${studentName} from this session's attendance?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteStudentAttendance(attendanceId),
        },
      ]
    );
  };

  const deleteStudentAttendance = async (attendanceId) => {
    try {
      await sessionAPI.deleteAttendance(attendanceId);
      // Refresh student list
      setStudentList(prev => prev.filter(s => s.id !== attendanceId));
      // Update session count
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id 
          ? { ...s, total_attendance: s.total_attendance - 1 }
          : s
      ));
      Alert.alert('Success', 'Student removed from attendance');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove student');
    }
  };

  const confirmDeleteSession = (session) => {
    Alert.alert(
      'Delete Session?',
      `Are you sure you want to delete this session?\n\nDate: ${formatDate(session.session_date)}\nAttendance: ${session.total_attendance} students\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(session.id),
        },
      ]
    );
  };

  const deleteSession = async (sessionId) => {
    try {
      await sessionAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      Alert.alert('Success', 'Session deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  const renderSession = ({ item }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{formatDate(item.session_date)}</Text>
        <View style={styles.sessionActions}>
          <View style={[styles.statusBadge, item.status === 'active' && styles.statusBadgeActive]}>
            <Text style={styles.statusText}>
              {item.status === 'active' ? '🔴 Active' : '✓ Ended'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => confirmDeleteSession(item)}
            style={styles.deleteIconButton}
          >
            <Text style={styles.deleteIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.sessionStats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.total_attendance}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.duration_minutes} min</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.viewStudentsButton}
        onPress={() => viewStudents(item)}
      >
        <Text style={styles.viewStudentsText}>👥 View Students</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session History</Text>
        <Text style={styles.courseName}>{courseName}</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No sessions yet</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Student List Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Students Present</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingStudents ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.modalLoader} />
            ) : studentList.length === 0 ? (
              <Text style={styles.modalEmptyText}>No students marked attendance</Text>
            ) : (
              <FlatList
                data={studentList}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.studentItem}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{item.student_name}</Text>
                      <Text style={styles.studentId}>{item.student_id}</Text>
                      {item.bluetooth_verified && (
                        <Text style={styles.bluetoothBadge}>🔵 Bluetooth Verified</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDeleteStudent(item.id, item.student_name)}
                      style={styles.studentDeleteButton}
                    >
                      <Text style={styles.studentDeleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
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
  courseName: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
  listContent: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadge: {
    backgroundColor: COLORS.mediumGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.lightGray,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIconButton: {
    padding: 4,
  },
  deleteIconText: {
    fontSize: 20,
  },
  viewStudentsButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  viewStudentsText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.lightGray,
    fontWeight: 'bold',
  },
  modalLoader: {
    marginVertical: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginVertical: 40,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
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
    fontSize: 14,
    color: COLORS.lightGray,
    marginBottom: 4,
  },
  bluetoothBadge: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
  },
  studentDeleteButton: {
    padding: 8,
  },
  studentDeleteIcon: {
    fontSize: 20,
  },
});
