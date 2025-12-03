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

export default function SessionHistoryScreen({ navigation, route }) {
  const { courseId, courseName } = route.params;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const renderSession = ({ item }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{formatDate(item.session_date)}</Text>
        <View style={[styles.statusBadge, item.status === 'active' && styles.statusBadgeActive]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? '🔴 Active' : '✓ Ended'}
          </Text>
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
});
