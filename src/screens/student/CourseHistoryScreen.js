import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function CourseHistoryScreen({ navigation, route }) {
  const { course } = route.params;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseHistory();
  }, []);

  const fetchCourseHistory = async () => {
    try {
      const response = await sessionAPI.getStudentCourseHistory(course.id);
      setSessions(response.data.data);
    } catch (error) {
      console.error('Fetch history error:', error);
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
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (session) => {
    if (session.ended_at && session.session_date) {
      const startTime = new Date(session.session_date);
      const endTime = new Date(session.ended_at);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    return `${session.duration_minutes} min`;
  };

  const renderSession = ({ item }) => {
    const attended = item.attended === true;
    
    return (
      <View style={[
        styles.sessionCard,
        attended ? styles.sessionCardAttended : styles.sessionCardAbsent
      ]}>
        <View style={styles.sessionHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.sessionDate}>{formatDate(item.session_date)}</Text>
            <Text style={styles.sessionTime}>{formatTime(item.session_date)}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            attended ? styles.statusBadgeAttended : styles.statusBadgeAbsent
          ]}>
            <Text style={styles.statusText}>
              {attended ? '✓ Present' : '✗ Absent'}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{formatDuration(item)}</Text>
          </View>
          {attended && item.marked_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Marked at:</Text>
              <Text style={styles.detailValue}>{formatTime(item.marked_at)}</Text>
            </View>
          )}
          {attended && item.bluetooth_verified && (
            <Text style={styles.bluetoothVerified}>🔵 Bluetooth Verified</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.courseName}>{course.course_name}</Text>
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
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {sessions.filter(s => s.attended).length}
              </Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {sessions.filter(s => !s.attended).length}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {Math.round((sessions.filter(s => s.attended).length / sessions.length) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>

          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        </>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.lightGray,
  },
  listContent: {
    padding: 16,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  sessionCardAttended: {
    backgroundColor: '#064e3b',
    borderColor: COLORS.secondary,
  },
  sessionCardAbsent: {
    backgroundColor: '#450a0a',
    borderColor: COLORS.danger,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeAttended: {
    backgroundColor: COLORS.secondary,
  },
  statusBadgeAbsent: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  bluetoothVerified: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
});
