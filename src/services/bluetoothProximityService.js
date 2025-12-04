import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * Bluetooth Proximity Service - Simple MAC Address Scanning
 * Teacher's MAC address is now passed from the course/session data
 */

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
 * @param {string} teacherMacAddress - The teacher's Bluetooth MAC address from the course
 * @returns {Promise<{found: boolean, device: object, allDevices: array, message: string}>}
 */
export async function scanForTeacherDevice(teacherMacAddress) {
  try {
    if (!teacherMacAddress) {
      console.log('⚠️ No teacher MAC address provided');
      return {
        found: false,
        device: null,
        allDevices: [],
        message: 'Teacher has not configured their Bluetooth address yet.',
      };
    }
    
    const targetMAC = teacherMacAddress.toUpperCase();
    console.log('🔍 Scanning for teacher device (MAC: ' + targetMAC + ')');

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

    // Cancel any existing discovery and wait for it to complete
    try {
      await RNBluetoothClassic.cancelDiscovery();
      console.log('🛑 Cancelled existing discovery');
      // Wait a bit for cancellation to fully complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (cancelError) {
      console.log('⚠️ No existing discovery to cancel');
    }

    // Start Classic Bluetooth discovery with retry
    console.log('📡 Starting Bluetooth discovery...');
    let devices = [];
    let retries = 3;
    
    while (retries > 0) {
      try {
        devices = await RNBluetoothClassic.startDiscovery();
        break; // Success, exit loop
      } catch (discoveryError) {
        console.log(`⚠️ Discovery attempt failed (${retries} retries left):`, discoveryError.message);
        retries--;
        if (retries > 0) {
          // Cancel and wait before retry
          try {
            await RNBluetoothClassic.cancelDiscovery();
          } catch (e) {}
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw discoveryError; // No more retries, throw error
        }
      }
    }
    
    console.log(`📱 Found ${devices.length} Bluetooth devices`);

    // Log all devices with comparison
    console.log('📋 Comparing each device with teacher MAC:', targetMAC);
    console.log('─'.repeat(50));
    
    let teacherDevice = null;
    devices.forEach(device => {
      const deviceMAC = device.address.toUpperCase();
      const isMatch = deviceMAC === targetMAC;
      
      console.log(`  📱 ${device.name || 'Unknown'}`);
      console.log(`     Device MAC:  ${deviceMAC}`);
      console.log(`     Teacher MAC: ${targetMAC}`);
      console.log(`     Match: ${isMatch ? '✅ YES!' : '❌ No'}`);
      console.log('');
      
      if (isMatch) {
        teacherDevice = device;
      }
    });
    
    console.log('─'.repeat(50));

    // Format all devices for display
    const allDevices = devices.map(d => ({
      name: d.name || 'Unknown Device',
      address: d.address,
    }));

    if (teacherDevice) {
      console.log('✅ Teacher device found!', teacherDevice);
      return {
        found: true,
        device: {
          name: teacherDevice.name || 'Teacher Device',
          address: teacherDevice.address,
        },
        allDevices: allDevices,
        message: 'Teacher device found nearby!',
      };
    } else {
      console.log('❌ Teacher device not found among', devices.length, 'devices');
      return {
        found: false,
        device: null,
        allDevices: allDevices,
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
