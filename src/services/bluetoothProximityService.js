import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * Bluetooth Proximity Service - Simple MAC Address Scanning
 * Teacher's hardcoded Bluetooth MAC address
 */
const TEACHER_MAC_ADDRESS = '44:16:FA:1D:D2:8D';

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
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  }
  return true; // iOS handles permissions differently
};

/**
 * Scan for teacher's Bluetooth device by MAC address
 * @param {string} sessionToken - The 4-digit proximity token (for logging)
 * @returns {Promise<{found: boolean, device: object, token: string, message: string}>}
 */
export async function scanForTeacherDevice(sessionToken) {
  try {
    console.log('🔍 Scanning for teacher device (MAC: ' + TEACHER_MAC_ADDRESS + ')');
    console.log('📡 Session token:', sessionToken);

    // Request permissions first
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      return {
        found: false,
        device: null,
        token: null,
        message: 'Bluetooth permissions not granted',
      };
    }

    // Cancel any existing discovery
    try {
      await RNBluetoothClassic.cancelDiscovery();
      console.log('🛑 Cancelled existing discovery');
    } catch (cancelError) {
      console.log('⚠️ No existing discovery to cancel');
    }

    // Start Classic Bluetooth discovery
    console.log('📡 Starting Bluetooth discovery...');
    const devices = await RNBluetoothClassic.startDiscovery();
    console.log(`📱 Found ${devices.length} Bluetooth devices`);

    // Log all devices
    devices.forEach(device => {
      console.log(`  - ${device.name || 'Unknown'} [${device.address}]`);
    });

    // Look for teacher's MAC address
    const teacherDevice = devices.find(device => 
      device.address.toUpperCase() === TEACHER_MAC_ADDRESS.toUpperCase()
    );

    if (teacherDevice) {
      console.log('✅ Teacher device found!', teacherDevice);
      return {
        found: true,
        device: {
          name: teacherDevice.name || 'Teacher Device',
          address: teacherDevice.address,
        },
        message: 'Teacher device found nearby!',
      };
    } else {
      console.log('❌ Teacher device not found');
      return {
        found: false,
        device: null,
        message: 'Teacher device not found. Please ensure teacher is nearby with Bluetooth ON.',
      };
    }

  } catch (error) {
    console.error('❌ Scan error:', error);
    return {
      found: false,
      device: null,
      message: `Scan failed: ${error.message}`,
    };
  }
}
