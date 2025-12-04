import { PermissionsAndroid, Platform, NativeModules, Linking, Alert } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { BleManager } from 'react-native-ble-plx';

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
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
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
 * Scan for teacher's BLE advertisement with the proximity token
 * @param {string} sessionToken - The 4-digit proximity token
 * @returns {Promise<{found: boolean, device: object, token: string, message: string}>}
 */
export async function scanForTeacherDevice(sessionToken) {
  try {
    console.log('📡 Starting BLE scan for token:', sessionToken);
    
    // Check permissions first
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      return {
        found: false,
        device: null,
        token: null,
        message: 'Bluetooth permissions not granted',
      };
    }

    // Check Bluetooth is ON
    const isOn = await checkBluetoothState();
    if (!isOn) {
      return {
        found: false,
        device: null,
        token: null,
        message: 'Bluetooth is OFF. Please enable Bluetooth.',
      };
    }

    // Try BLE scanning first (faster and better)
    try {
      const manager = new BleManager();

      // Scan for BLE devices for 5 seconds
      return new Promise((resolve) => {
        let found = false;
        const targetServiceUUID = '0000fff0-0000-1000-8000-00805f9b34fb';
        
        console.log('🔵 Starting BLE scan...');
        
        manager.startDeviceScan([targetServiceUUID], null, (error, device) => {
          if (error) {
            console.error('BLE Scan error:', error);
            return;
          }

          if (device && device.serviceData && device.serviceData[targetServiceUUID]) {
            const tokenData = device.serviceData[targetServiceUUID];
            // Convert base64 to string
            const detectedToken = Buffer.from(tokenData, 'base64').toString('utf8');
            
            console.log(`📱 Found BLE device with token: ${detectedToken}`);
            
            if (detectedToken === sessionToken && !found) {
              found = true;
              manager.stopDeviceScan();
              console.log('✅ BLE token match!');
              resolve({
                found: true,
                device: { name: `ATTENDEASE-${detectedToken}`, address: device.id },
                token: detectedToken,
                message: 'Teacher device found via BLE!',
              });
            }
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          manager.stopDeviceScan();
          if (!found) {
            console.log('⏰ BLE scan timeout, trying classic Bluetooth...');
            // Fallback to classic Bluetooth
            scanClassicBluetooth(sessionToken).then(resolve);
          }
        }, 5000);
      });
    } catch (bleError) {
      console.log('⚠️ BLE not available, using classic Bluetooth:', bleError.message);
      // Fallback to classic Bluetooth
      return await scanClassicBluetooth(sessionToken);
    }

  } catch (error) {
    console.error('❌ Scan error:', error);
    return {
      found: false,
      device: null,
      token: null,
      message: `Scan failed: ${error.message}`,
    };
  }
}

/**
 * Fallback: Scan using classic Bluetooth
 */
async function scanClassicBluetooth(sessionToken) {
  try {
    const targetName = `ATTENDEASE-${sessionToken}`;
    console.log('🔎 Looking for device name:', targetName);

    const devices = await RNBluetoothClassic.startDiscovery();
    console.log(`📡 Found ${devices.length} Bluetooth devices`);

    for (const device of devices) {
      if (device.name && device.name.startsWith('ATTENDEASE-')) {
        const detectedToken = device.name.replace('ATTENDEASE-', '');
        
        if (detectedToken === sessionToken) {
          console.log('✅ Found matching device!');
          return {
            found: true,
            device: device,
            token: detectedToken,
            message: 'Teacher device found!',
          };
        }
      }
    }

    console.log('❌ Teacher device not found');
    return {
      found: false,
      device: null,
      token: null,
      message: `Teacher device "${targetName}" not found nearby`,
    };

  } catch (error) {
    console.error('❌ Classic BT scan error:', error);
    return {
      found: false,
      device: null,
      token: null,
      message: `Scan failed: ${error.message}`,
    };
  }
}

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
