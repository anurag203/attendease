import { PermissionsAndroid, Platform, Alert } from 'react-native';
// import BluetoothStateManager from 'react-native-bluetooth-state-manager';
// import RNBluetoothClassic from 'react-native-bluetooth-classic';

// Mock implementations for Expo Go
const BluetoothStateManager = {
  getState: async () => 'PoweredOn',
  requestToEnable: async () => true,
};

const RNBluetoothClassic = {
  getBondedDevices: async () => [],
  startDiscovery: async () => [],
};

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
