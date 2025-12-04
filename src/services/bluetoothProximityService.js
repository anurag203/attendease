import { PermissionsAndroid, Platform, NativeModules, Linking, Alert } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * Bluetooth Proximity Service
 * Simple approach: Teacher sets BT name to token, students scan for it
 */

const ATTENDEASE_PREFIX = 'ATTENDEASE-';
const SCAN_DURATION_MS = 10000; // 10 seconds

/**
 * Request Bluetooth permissions
 */
export const requestBluetoothPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }
  return true;
};

/**
 * Generate session token (4-digit)
 */
export const generateSessionToken = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * TEACHER: Get instructions to set Bluetooth name
 */
export const getTeacherSetupInstructions = (token) => {
  const deviceName = `${ATTENDEASE_PREFIX}${token}`;
  
  return {
    deviceName,
    instructions: [
      '1. Open phone Settings',
      '2. Go to Bluetooth settings',
      '3. Tap device name at the top',
      `4. Change name to: ${deviceName}`,
      '5. Keep Bluetooth ON',
      '6. Return to app',
    ],
    quickGuide: 'Settings → Bluetooth → Device Name → Change to ' + deviceName,
  };
};

/**
 * TEACHER: Open Bluetooth settings
 */
export const openBluetoothSettings = () => {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
  } else {
    Linking.openURL('App-Prefs:Bluetooth');
  }
};

/**
 * Check if Bluetooth is enabled
 */
export const checkBluetoothEnabled = async () => {
  try {
    const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
    return isEnabled;
  } catch (error) {
    console.error('Error checking Bluetooth:', error);
    return false;
  }
};

/**
 * Request to enable Bluetooth
 */
export const requestEnableBluetooth = async () => {
  try {
    await RNBluetoothClassic.requestBluetoothEnabled();
    return true;
  } catch (error) {
    console.error('Error enabling Bluetooth:', error);
    return false;
  }
};

/**
 * STUDENT: Scan for teacher's device by token
 */
export const scanForTeacherDevice = async (sessionToken) => {
  try {
    console.log('🔍 Starting scan for teacher device with token:', sessionToken);

    // Check permissions
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    // Check if Bluetooth is enabled
    const isEnabled = await checkBluetoothEnabled();
    if (!isEnabled) {
      const enabled = await requestEnableBluetooth();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }
    }

    // Expected device name
    const expectedName = `${ATTENDEASE_PREFIX}${sessionToken}`;
    console.log('📍 Looking for device name:', expectedName);

    // Start discovery
    const isDiscovering = await RNBluetoothClassic.isDiscovering();
    if (isDiscovering) {
      await RNBluetoothClassic.cancelDiscovery();
    }

    const devices = await RNBluetoothClassic.startDiscovery();
    console.log(`✅ Found ${devices.length} devices`);

    // Log all devices for debugging
    console.log('📱 Found devices:');
    devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.name || 'Unknown'} - ${device.address}`);
    });

    // Look for teacher's device
    const teacherDevice = devices.find(device => {
      const deviceName = device.name || '';
      return deviceName.includes(expectedName) || deviceName.startsWith(ATTENDEASE_PREFIX);
    });

    if (teacherDevice) {
      console.log('✅ Teacher device found!', teacherDevice.name);
      return {
        found: true,
        device: teacherDevice,
        token: sessionToken,
      };
    } else {
      console.log('❌ Teacher device not found nearby');
      
      // Check if any ATTENDEASE devices found (different token)
      const otherAttendease = devices.find(d => 
        (d.name || '').startsWith(ATTENDEASE_PREFIX)
      );
      
      if (otherAttendease) {
        return {
          found: false,
          reason: 'wrong_session',
          message: 'Found attendance device but for different session',
        };
      }

      return {
        found: false,
        reason: 'not_nearby',
        message: 'Teacher device not found nearby. Move closer and try again.',
      };
    }

  } catch (error) {
    console.error('❌ Error scanning for teacher:', error);
    throw error;
  }
};

/**
 * STUDENT: Quick proximity check
 */
export const quickProximityCheck = async (sessionToken) => {
  try {
    const result = await scanForTeacherDevice(sessionToken);
    return result.found;
  } catch (error) {
    console.error('Proximity check error:', error);
    return false;
  }
};

/**
 * Verify current Bluetooth name (for teacher to check)
 */
export const verifyBluetoothName = async (expectedToken) => {
  try {
    // We can't programmatically get BT name on Android
    // This is just a placeholder for UI flow
    const expectedName = `${ATTENDEASE_PREFIX}${expectedToken}`;
    
    return {
      expectedName,
      instructions: 'Please verify your Bluetooth name is set correctly',
      canVerify: false, // Android doesn't allow reading local BT name
    };
  } catch (error) {
    console.error('Error verifying BT name:', error);
    return null;
  }
};

export default {
  generateSessionToken,
  getTeacherSetupInstructions,
  openBluetoothSettings,
  checkBluetoothEnabled,
  requestEnableBluetooth,
  scanForTeacherDevice,
  quickProximityCheck,
  verifyBluetoothName,
  requestBluetoothPermissions,
};
