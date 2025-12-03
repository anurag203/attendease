import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth Screens
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';
import StudentSignupScreen from './src/screens/auth/StudentSignupScreen';
import TeacherSignupScreen from './src/screens/auth/TeacherSignupScreen';
import LoginScreen from './src/screens/auth/LoginScreen';

// Teacher Screens
import TeacherDashboard from './src/screens/teacher/TeacherDashboardV2';
import CreateCourseScreen from './src/screens/teacher/CreateCourseScreen';
import StartSessionScreen from './src/screens/teacher/StartSessionScreenV2';
import SessionHistoryScreen from './src/screens/teacher/SessionHistoryScreen';
import CourseDetailsScreen from './src/screens/teacher/CourseDetailsScreen';
import EditStudentsScreen from './src/screens/teacher/EditStudentsScreen';

// Student Screens
import StudentDashboard from './src/screens/student/StudentDashboard';
import JoinSessionScreen from './src/screens/student/JoinSessionScreen';
import AttendanceHistoryScreen from './src/screens/student/AttendanceHistoryScreen';
import CourseHistoryScreen from './src/screens/student/CourseHistoryScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="StudentSignup" component={StudentSignupScreen} />
      <Stack.Screen name="TeacherSignup" component={TeacherSignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function TeacherStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
      <Stack.Screen name="StartSession" component={StartSessionScreen} />
      <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
      <Stack.Screen name="EditStudents" component={EditStudentsScreen} />
    </Stack.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
      <Stack.Screen name="JoinSession" component={JoinSessionScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Stack.Screen name="CourseHistory" component={CourseHistoryScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthStack />;
  }

  if (user.role === 'teacher') {
    return <TeacherStack />;
  }

  return <StudentStack />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
