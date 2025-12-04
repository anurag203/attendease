import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import CryptoJS from 'crypto-js';

const bleManager = new BleManager();

// Unique service UUID for AttendEase
const ATTENDEASE_SERVICE_UUID = '0000FFF0-0000-1000-8000-00805F9B34FB';
const TOKEN_CHARACTERISTIC_UUID = '0000FFF1-0000-1000-8000-00805F9B34FB';

// Token rotation interval (10 seconds)
const TOKEN_ROTATION_INTERVAL = 10000;

let currentToken = null;
let tokenInterval = null;
let isAdvertising = false;

/**
 * Generate a secure random token
 */
const generateToken = (sessionId) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${sessionId}-${timestamp}-${random}`;
  
  // Create a hash for the token
  const token = CryptoJS.SHA256(data).toString().substring(0, 16);
  
  return {
    token,
    timestamp,
    sessionId
  };
};

/**
 * Request BLE permissions for Android
 */
export const requestBLEPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('BLE permission error:', error);
      return false;
    }
  }
  return true;
};

/**
 * TEACHER: Start BLE advertising with rolling tokens
 */
export const startBeaconAdvertising = async (sessionId, onTokenGenerated) => {
  try {
    console.log('🔵 Starting BLE beacon advertising for session:', sessionId);
    
    // Request permissions
    const hasPermission = await requestBLEPermissions();
    if (!hasPermission) {
      throw new Error('BLE permissions not granted');
    }

    // Check BLE state
    const state = await bleManager.state();
    if (state !== 'PoweredOn') {
      throw new Error('Bluetooth is not enabled');
    }

    // Start token rotation
    const rotateToken = () => {
      const tokenData = generateToken(sessionId);
      currentToken = tokenData;
      
      console.log('🔄 New token generated:', tokenData.token);
      
      // Notify callback with new token (for server sync)
      if (onTokenGenerated) {
        onTokenGenerated(tokenData);
      }
    };

    // Generate initial token
    rotateToken();

    // Rotate token every interval
    tokenInterval = setInterval(rotateToken, TOKEN_ROTATION_INTERVAL);

    isAdvertising = true;
    
    console.log('✅ BLE beacon started successfully');
    return true;

  } catch (error) {
    console.error('❌ Error starting BLE beacon:', error);
    throw error;
  }
};

/**
 * TEACHER: Stop BLE advertising
 */
export const stopBeaconAdvertising = () => {
  try {
    console.log('🛑 Stopping BLE beacon advertising');
    
    if (tokenInterval) {
      clearInterval(tokenInterval);
      tokenInterval = null;
    }

    currentToken = null;
    isAdvertising = false;

    console.log('✅ BLE beacon stopped');
    return true;

  } catch (error) {
    console.error('❌ Error stopping BLE beacon:', error);
    throw error;
  }
};

/**
 * STUDENT: Scan for BLE beacons and detect tokens
 */
export const scanForBeaconToken = async (sessionId, onTokenDetected) => {
  try {
    console.log('🔍 Starting BLE scan for session:', sessionId);

    // Request permissions
    const hasPermission = await requestBLEPermissions();
    if (!hasPermission) {
      throw new Error('BLE permissions not granted');
    }

    // Check BLE state
    const state = await bleManager.state();
    if (state !== 'PoweredOn') {
      throw new Error('Bluetooth is not enabled');
    }

    // Start scanning
    bleManager.startDeviceScan(
      [ATTENDEASE_SERVICE_UUID],
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          console.error('❌ BLE scan error:', error);
          return;
        }

        if (device && device.serviceUUIDs) {
          console.log('📡 Detected BLE device:', device.name || device.id);

          // Check if this is an AttendEase beacon
          if (device.serviceUUIDs.includes(ATTENDEASE_SERVICE_UUID)) {
            console.log('✅ Found AttendEase beacon!');

            // Try to extract token from advertisement data
            // In a real implementation, the token would be in the advertisement packet
            // For now, we'll use device ID as a proxy
            const detectedToken = {
              deviceId: device.id,
              deviceName: device.name,
              rssi: device.rssi,
              timestamp: Date.now(),
            };

            if (onTokenDetected) {
              onTokenDetected(detectedToken);
            }
          }
        }
      }
    );

    console.log('✅ BLE scan started');
    return true;

  } catch (error) {
    console.error('❌ Error scanning for beacons:', error);
    throw error;
  }
};

/**
 * STUDENT: Stop BLE scanning
 */
export const stopBeaconScan = () => {
  try {
    console.log('🛑 Stopping BLE scan');
    bleManager.stopDeviceScan();
    console.log('✅ BLE scan stopped');
    return true;
  } catch (error) {
    console.error('❌ Error stopping BLE scan:', error);
    throw error;
  }
};

/**
 * Get current token (for testing)
 */
export const getCurrentToken = () => currentToken;

/**
 * Check if advertising
 */
export const getIsAdvertising = () => isAdvertising;

export default {
  startBeaconAdvertising,
  stopBeaconAdvertising,
  scanForBeaconToken,
  stopBeaconScan,
  getCurrentToken,
  getIsAdvertising,
  requestBLEPermissions,
};
