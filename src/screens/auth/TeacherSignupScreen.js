import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { COLORS, BRANCHES } from '../../utils/constants';

export default function TeacherSignupScreen({ navigation }) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    department: 'Computer Science',
  });

  const handleSignup = async () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Validate MNIT email
    if (!formData.email.toLowerCase().endsWith('@mnit.ac.in')) {
      Alert.alert('Invalid Email', 'Please use your MNIT email address (@mnit.ac.in)');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register({
      ...formData,
      role: 'teacher',
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Signup Failed', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Teacher Signup</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.lightGray}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@mnit.ac.in"
              placeholderTextColor={COLORS.lightGray}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor={COLORS.lightGray}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                style={styles.picker}
                dropdownIconColor={COLORS.white}
              >
                {BRANCHES.map((branch) => (
                  <Picker.Item key={branch} label={branch} value={branch} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.lightGray,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
  },
  eyeIcon: {
    padding: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  pickerContainer: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.white,
    height: 50,
  },
  signupButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.primary,
  },
});
