import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

// Try to import real Bluetooth libraries (for dev builds/APKs)
// If they fail (Expo Go), use mocks
let BluetoothStateManager, RNBluetoothClassic;
let USE_REAL_BLUETOOTH = false;

try {
  BluetoothStateManager = require('react-native-bluetooth-state-manager').default;
  RNBluetoothClassic = require('react-native-bluetooth-classic').default;
  USE_REAL_BLUETOOTH = true;
  console.log('✅ Real Bluetooth libraries loaded');
} catch (error) {
  console.log('⚠️ Using Bluetooth mocks (Expo Go mode)');
  // Mock implementations for Expo Go
  BluetoothStateManager = {
    getState: async () => 'PoweredOn',
    requestToEnable: async () => true,
  };

  RNBluetoothClassic = {
    getBondedDevices: async () => {
      // Simulate device address for testing
      return [{ address: Platform.OS === 'android' ? 'DEVICE-' + Date.now().toString().slice(-8) : 'SIM-DEVICE' }];
    },
    startDiscovery: async () => {
      // Simulate finding nearby devices for testing
      return [
        { name: 'Simulated Device 1', address: 'SIM-001' },
        { name: 'Simulated Device 2', address: 'SIM-002' },
      ];
    },
  };
}

export const requestBluetoothPermissions = async () => {
  if (Platform.OS === 'android') {
    const permissions = [];

    if (Platform.Version >= 31) {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    } else {
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    for (const key in granted) {
      if (granted[key] !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Required', 'Bluetooth permissions are required for attendance');
        return false;
      }
    }
  }
  return true;
};

export const checkBluetoothState = async () => {
  const state = await BluetoothStateManager.getState();
  return state === 'PoweredOn';
};

export const enableBluetooth = async () => {
  try {
    await BluetoothStateManager.requestToEnable();
    return true;
  } catch (error) {
    console.error('Enable Bluetooth error:', error);
    return false;
  }
};

export const getDeviceAddress = async () => {
  try {
    // Get the local device address
    const devices = await RNBluetoothClassic.getBondedDevices();
    if (devices && devices.length > 0) {
      // Return first device address or implement logic to get actual device address
      return devices[0].address;
    }
    return null;
  } catch (error) {
    console.error('Get device address error:', error);
    return null;
  }
};

export const discoverNearbyDevices = async () => {
  try {
    const found = await RNBluetoothClassic.startDiscovery();
    
    // Remove duplicates
    const uniqueDevicesMap = {};
    found.forEach(device => {
      uniqueDevicesMap[device.address] = device;
    });

    return Object.values(uniqueDevicesMap);
  } catch (error) {
    console.error('Discovery error:', error);
    return [];
  }
};

export const isDeviceNearby = (devices, targetAddress) => {
  return devices.some(device => device.address === targetAddress);
};
