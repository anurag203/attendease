import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function AttendanceHistoryScreen({ navigation, route }) {
  const { courseId, courseName } = route.params;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await sessionAPI.getStudentStats(courseId);
      if (response.data.data.length > 0) {
        setStats(response.data.data[0]);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance History</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.courseName}>{courseName}</Text>

          {stats ? (
            <>
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.attended_sessions}</Text>
                  <Text style={styles.statLabel}>Classes Attended</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.total_sessions}</Text>
                  <Text style={styles.statLabel}>Total Classes</Text>
                </View>
              </View>

              <View style={styles.percentageCard}>
                <Text style={styles.percentageValue}>{stats.attendance_percentage}%</Text>
                <Text style={styles.percentageLabel}>Attendance Percentage</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${stats.attendance_percentage}%`,
                        backgroundColor:
                          stats.attendance_percentage >= 75
                            ? COLORS.secondary
                            : stats.attendance_percentage >= 60
                            ? COLORS.warning
                            : COLORS.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance data yet</Text>
            </View>
          )}
        </ScrollView>
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
  },
  content: {
    padding: 20,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.mediumGray,
    marginHorizontal: 20,
  },
  percentageCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  percentageValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  percentageLabel: {
    fontSize: 16,
    color: COLORS.lightGray,
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.lightGray,
  },
});
