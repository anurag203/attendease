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
import { courseAPI } from '../../services/api';
import { COLORS, DEGREES, BRANCHES, YEARS, formatYear } from '../../utils/constants';

export default function CreateCourseScreen({ navigation, route }) {
  const existingCourse = route.params?.course;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    course_name: existingCourse?.course_name || '',
    course_code: existingCourse?.course_code || '',
    degree: existingCourse?.degree || 'B.Tech',
    branch: existingCourse?.branch || 'Computer Science',
    year: existingCourse?.year || 1,
  });

  const handleSubmit = async () => {
    if (!formData.course_name || !formData.course_code) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      if (existingCourse) {
        await courseAPI.updateCourse(existingCourse.id, formData);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        await courseAPI.createCourse(formData);
        Alert.alert('Success', 'Course created successfully');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{existingCourse ? 'Edit Course' : 'Create Course'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>📚 Course Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Data Structures"
              placeholderTextColor={COLORS.lightGray}
              value={formData.course_name}
              onChangeText={(text) => setFormData({ ...formData, course_name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}># Course Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., CS101"
              placeholderTextColor={COLORS.lightGray}
              value={formData.course_code}
              onChangeText={(text) => setFormData({ ...formData, course_code: text })}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Students</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>🎓 Degree</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.degree}
                onValueChange={(value) => setFormData({ ...formData, degree: value })}
                style={styles.picker}
                dropdownIconColor={COLORS.white}
              >
                {DEGREES.map((degree) => (
                  <Picker.Item key={degree} label={degree} value={degree} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>📖 Branch</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.branch}
                onValueChange={(value) => setFormData({ ...formData, branch: value })}
                style={styles.picker}
                dropdownIconColor={COLORS.white}
              >
                {BRANCHES.map((branch) => (
                  <Picker.Item key={branch} label={branch} value={branch} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>📅 Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.year}
                onValueChange={(value) => setFormData({ ...formData, year: value })}
                style={styles.picker}
                dropdownIconColor={COLORS.white}
              >
                {YEARS.map((year) => (
                  <Picker.Item key={year} label={formatYear(year)} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : existingCourse ? 'Update Course' : 'Create Course'}
          </Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
