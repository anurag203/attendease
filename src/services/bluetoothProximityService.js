import { PermissionsAndroid, Platform, NativeModules, Linking, Alert } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { BleManager } from 'react-native-ble-plx';
import { checkBluetoothState } from './bluetoothService';

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
      
      // Check BLE state first
      const state = await manager.state();
      console.log('📱 BLE Manager state:', state);
      
      if (state !== 'PoweredOn') {
        console.log('❌ BLE not powered on');
        return {
          found: false,
          device: null,
          token: null,
          message: 'Bluetooth is not powered on. Please enable Bluetooth.',
        };
      }

      // Pure BLE scanning - scan for 10 seconds
      return new Promise((resolve) => {
        let found = false;
        const targetServiceUUID = '0000fff0-0000-1000-8000-00805f9b34fb';
        
        console.log('🔵 Starting Pure BLE scan for service:', targetServiceUUID);
        console.log('🔍 Looking for token:', sessionToken);
        
        // Scan for all devices (not just with specific service, to maximize detection)
        manager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            console.error('❌ BLE Scan error:', error.message);
            return;
          }

          if (!device) return;
          
          // Log every device found for debugging
          if (device.name) {
            console.log(`📱 Found device: ${device.name} [${device.id}]`);
          }

          // Check service data first (primary method)
          if (device.serviceData) {
            const serviceData = device.serviceData[targetServiceUUID];
            
            if (serviceData) {
              try {
                // serviceData is base64 encoded, decode it
                const decodedToken = atob(serviceData);
                console.log(`🎯 Found BLE service data! Token: ${decodedToken}, Expected: ${sessionToken}`);
                
                if (decodedToken === sessionToken && !found) {
                  found = true;
                  manager.stopDeviceScan();
                  console.log('✅ BLE token match via service data!');
                  resolve({
                    found: true,
                    device: { name: `Teacher Device`, address: device.id },
                    token: decodedToken,
                    message: 'Teacher device found via BLE!',
                  });
                }
              } catch (decodeError) {
                console.log('⚠️ Error decoding service data:', decodeError.message);
              }
            }
          }
        });

        // Timeout after 10 seconds (longer for BLE to detect advertising)
        setTimeout(async () => {
          try {
            manager.stopDeviceScan();
            await manager.destroy();
            console.log('🧹 BLE Manager cleaned up');
          } catch (cleanupError) {
            console.log('⚠️ BLE cleanup error:', cleanupError.message);
          }
          
          if (!found) {
            console.log('❌ BLE scan timeout - teacher not found');
            resolve({
              found: false,
              device: null,
              token: null,
              message: 'Teacher device not found. Please ensure teacher has started the session and is nearby.',
            });
          }
        }, 10000);
      });
    } catch (bleError) {
      console.error('❌ BLE scanning error:', bleError.message);
      return {
        found: false,
        device: null,
        token: null,
        message: `BLE scan failed: ${bleError.message}`,
      };
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

    // Cancel any existing discovery first
    try {
      await RNBluetoothClassic.cancelDiscovery();
      console.log('🛑 Cancelled existing discovery');
    } catch (cancelError) {
      console.log('⚠️ No existing discovery to cancel');
    }

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
