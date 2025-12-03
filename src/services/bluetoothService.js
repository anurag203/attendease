import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

// Try to import real Bluetooth libraries (for dev builds/APKs)
// If they fail (Expo Go), use mocks
let BluetoothStateManager, RNBluetoothClassic;
let USE_REAL_BLUETOOTH = false;

try {
  // Try different import methods
  const BTStateModule = require('react-native-bluetooth-state-manager');
  const BTClassicModule = require('react-native-bluetooth-classic');
  
  // Handle both default and named exports
  BluetoothStateManager = BTStateModule.default || BTStateModule;
  RNBluetoothClassic = BTClassicModule.default || BTClassicModule;
  
  // Verify the modules loaded correctly
  if (BluetoothStateManager && RNBluetoothClassic) {
    USE_REAL_BLUETOOTH = true;
    console.log('✅ Real Bluetooth libraries loaded successfully!');
    console.log('BluetoothStateManager methods:', Object.keys(BluetoothStateManager));
  } else {
    throw new Error('Modules loaded but objects are undefined');
  }
} catch (error) {
  console.log('⚠️ Bluetooth library error:', error.message);
  console.log('⚠️ Using Bluetooth mocks');
  
  // Mock implementations for Expo Go or if native modules fail
  BluetoothStateManager = {
    getState: async () => {
      console.log('📱 Mock: Getting Bluetooth state');
      return 'PoweredOn';
    },
    requestToEnable: async () => {
      console.log('📱 Mock: Requesting to enable Bluetooth');
      Alert.alert('Mock Mode', 'Bluetooth mocks are active. Real Bluetooth will work in production APK.');
      return true;
    },
  };

  RNBluetoothClassic = {
    getBondedDevices: async () => {
      console.log('📱 Mock: Getting bonded devices');
      // Simulate device address for testing
      return [{ address: Platform.OS === 'android' ? 'DEVICE-' + Date.now().toString().slice(-8) : 'SIM-DEVICE' }];
    },
    startDiscovery: async () => {
      console.log('📱 Mock: Starting device discovery');
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
