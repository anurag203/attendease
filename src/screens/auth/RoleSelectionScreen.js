import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';

export default function RoleSelectionScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>✓ AttendEase</Text>
          <Text style={styles.subtitle}>Smart Bluetooth Attendance for MNIT</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => navigation.navigate('TeacherSignup')}
          >
            <Text style={styles.roleIcon}>👨‍🏫</Text>
            <Text style={styles.roleText}>I am a Teacher</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => navigation.navigate('StudentSignup')}
          >
            <Text style={styles.roleIcon}>🎓</Text>
            <Text style={styles.roleText}>I am a Student</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 20,
  },
  roleButton: {
    backgroundColor: COLORS.darkGray,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  loginLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: COLORS.primary,
  },
});
