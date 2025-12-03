import { PermissionsAndroid, Platform, Alert, NativeModules, Linking } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

// Try to import real Bluetooth libraries (for dev builds/APKs)
// If they fail (Expo Go), use mocks
let BluetoothStateManager, RNBluetoothClassic;
let USE_REAL_BLUETOOTH = false;
let USE_NATIVE_ANDROID = false;

// Try to get native Android Bluetooth adapter as fallback
const { RNBluetoothClassic: NativeBluetoothModule, BluetoothModule: CustomBluetoothModule } = NativeModules;

console.log('🔍 Available modules:', {
  RNBluetoothClassic: !!NativeBluetoothModule,
  BluetoothModule: !!CustomBluetoothModule
});

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
  try {
    // Priority 1: Use our custom native module (most accurate)
    if (Platform.OS === 'android' && CustomBluetoothModule) {
      try {
        const enabled = await CustomBluetoothModule.isEnabled();
        console.log('✅ Custom Bluetooth module - enabled:', enabled);
        return enabled === true;
      } catch (customError) {
        console.log('⚠️ Custom module check failed:', customError.message);
      }
    }
    
    // Priority 2: Try native bluetooth classic module
    if (Platform.OS === 'android' && NativeBluetoothModule) {
      try {
        const enabled = await NativeBluetoothModule.isEnabled();
        console.log('📱 Native BT Classic - enabled:', enabled);
        return enabled === true;
      } catch (nativeError) {
        console.log('⚠️ Native BT Classic failed:', nativeError.message);
      }
    }
    
    // Priority 3: Try library method
    if (BluetoothStateManager && typeof BluetoothStateManager.getState === 'function') {
      const state = await BluetoothStateManager.getState();
      console.log('📱 BT State Manager - state:', state);
      return state === 'PoweredOn' || state === 'On';
    }
    
    // If all else fails, return false (safer than true)
    console.log('❌ Cannot determine Bluetooth state, assuming OFF');
    return false;
  } catch (error) {
    console.error('Check Bluetooth state error:', error);
    // Return false on error (safer than true)
    return false;
  }
};

export const enableBluetooth = async () => {
  try {
    // Try using the library method first
    if (BluetoothStateManager && typeof BluetoothStateManager.requestToEnable === 'function') {
      await BluetoothStateManager.requestToEnable();
      return true;
    }
    
    // Fallback: Open Android Bluetooth settings
    if (Platform.OS === 'android') {
      Alert.alert(
        'Enable Bluetooth',
        'Please enable Bluetooth from your device settings',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
              } catch (err) {
                await Linking.openSettings();
              }
            }
          }
        ]
      );
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Enable Bluetooth error:', error);
    
    // Final fallback: Open settings
    Alert.alert(
      'Bluetooth Error',
      'Cannot enable Bluetooth automatically. Please enable it manually.',
      [
        { text: 'OK', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
};

export const getDeviceAddress = async () => {
  try {
    // First check if Bluetooth is enabled
    const isEnabled = await checkBluetoothState();
    if (!isEnabled) {
      console.log('⚠️ Cannot get device address: Bluetooth is OFF');
      return null;
    }

    // Try to get the local device address
    if (RNBluetoothClassic && typeof RNBluetoothClassic.getBondedDevices === 'function') {
      const devices = await RNBluetoothClassic.getBondedDevices();
      if (devices && devices.length > 0) {
        const address = devices[0].address;
        console.log('📱 Got device address:', address);
        return address;
      }
    }
    
    // Fallback: Try native module
    if (NativeBluetoothModule && typeof NativeBluetoothModule.getAddress === 'function') {
      const address = await NativeBluetoothModule.getAddress();
      console.log('📱 Got native device address:', address);
      return address;
    }
    
    // Mock for testing (but only if Bluetooth is ON)
    const mockAddress = 'DEVICE-' + Date.now().toString().slice(-8);
    console.log('📱 Using mock address:', mockAddress);
    return mockAddress;
  } catch (error) {
    console.error('Get device address error:', error.message);
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
