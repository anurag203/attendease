import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cloud backend on Render (works on ANY network)
const API_URL = 'https://attendease-backend-8oqg.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateBluetoothMac: (bluetooth_mac) => api.put('/auth/bluetooth-mac', { bluetooth_mac }),
};

// Course APIs
export const courseAPI = {
  getCourses: () => api.get('/courses'),
  getMyCourses: () => api.get('/courses'),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  addStudentToCourse: (id, data) => api.post(`/courses/${id}/students`, data),
  removeStudentFromCourse: (courseId, studentId) => api.delete(`/courses/${courseId}/students/${studentId}`),
};

// Session APIs
export const sessionAPI = {
  startSession: (data) => api.post('/sessions/start', data),
  getActiveSessions: () => api.get('/sessions/active'),
  getSession: (id) => api.get(`/sessions/${id}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    params: {
      _t: Date.now(), // Add timestamp to prevent caching
    }
  }),
  markAttendance: (id, data) => api.post(`/sessions/${id}/mark`, data),
  markAttendanceProximity: (id, data) => api.post(`/sessions/${id}/mark-proximity`, data),
  endSession: (id) => api.post(`/sessions/${id}/end`),
  getCourseHistory: (courseId) => api.get(`/sessions/course/${courseId}/history`),
  getStudentStats: (courseId) => api.get('/sessions/student/stats', { params: { course_id: courseId } }),
  deleteAttendance: (attendanceId) => api.delete(`/sessions/attendance/${attendanceId}`),
  deleteSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
  getStudentCourseHistory: (courseId) => api.get(`/sessions/course/${courseId}/student-history`),
};

export default api;
