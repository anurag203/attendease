import { PermissionsAndroid, Platform, Alert, NativeModules, Linking } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import DeviceInfo from 'react-native-device-info';

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
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
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

    // Priority 1: Use react-native-device-info getMacAddress() - most reliable!
    try {
      console.log('📱 Trying DeviceInfo.getMacAddress()...');
      const macAddress = await DeviceInfo.getMacAddress();
      console.log('📱 DeviceInfo.getMacAddress() returned:', macAddress);
      
      // Check if we got a valid MAC address (not the iOS default or empty)
      if (macAddress && macAddress !== '02:00:00:00:00:00' && macAddress !== 'unknown') {
        console.log('✅ Got REAL Bluetooth MAC address:', macAddress);
        return macAddress;
      } else {
        console.log('⚠️ DeviceInfo returned invalid/default MAC:', macAddress);
      }
    } catch (error) {
      console.log('⚠️ DeviceInfo.getMacAddress() failed:', error.message);
    }

    // Priority 2: Try custom native module
    if (CustomBluetoothModule && typeof CustomBluetoothModule.getAddress === 'function') {
      console.log('📱 Trying CustomBluetoothModule.getAddress()...');
      try {
        const address = await CustomBluetoothModule.getAddress();
        if (address && address !== '02:00:00:00:00:00' && !address.startsWith('ANDROID-')) {
          console.log('✅ Got address from custom module:', address);
          return address;
        }
      } catch (error) {
        console.log('⚠️ Custom module failed:', error.message);
      }
    }
    
    // Priority 2: Try RNBluetoothClassic local address (if available)
    if (RNBluetoothClassic && typeof RNBluetoothClassic.getLocalAddress === 'function') {
      try {
        const address = await RNBluetoothClassic.getLocalAddress();
        if (address && address !== '02:00:00:00:00:00') {
          console.log('📱 Got LOCAL device address from RNBluetoothClassic:', address);
          return address;
        }
      } catch (error) {
        console.log('⚠️ RNBluetoothClassic getLocalAddress failed:', error.message);
      }
    }
    
    // Fallback: Generate unique device identifier based on timestamp
    // This is better than failing completely
    const fallbackAddress = 'DEVICE-' + Date.now().toString().slice(-8);
    console.log('⚠️ Using fallback address (couldn\'t get real address):', fallbackAddress);
    console.log('⚠️ Note: This may affect proximity detection accuracy');
    return fallbackAddress;
  } catch (error) {
    console.error('Get device address error:', error.message);
    // Still return a fallback to allow the session to start
    return 'DEVICE-' + Date.now().toString().slice(-8);
  }
};

export const discoverNearbyDevices = async () => {
  try {
    // Always try to cancel first (ignore errors)
    try {
      await RNBluetoothClassic.cancelDiscovery();
      // Wait a bit for cancellation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (cancelError) {
      // Ignore - discovery might not be running
    }

    // Start fresh discovery
    const found = await RNBluetoothClassic.startDiscovery();
    
    // Remove duplicates
    const uniqueDevicesMap = {};
    found.forEach(device => {
      uniqueDevicesMap[device.address] = device;
    });

    const uniqueDevices = Object.values(uniqueDevicesMap);
    console.log(`✅ Found ${uniqueDevices.length} devices`);
    return uniqueDevices;
  } catch (error) {
    if (error.message.includes('already in discovery')) {
      // Just return empty, next scan will work
      console.log('⏭️ Skipping scan (already in progress)');
      return [];
    }
    console.error('Discovery error:', error.message);
    return [];
  }
};

export const isDeviceNearby = (devices, targetAddress) => {
  return devices.some(device => device.address === targetAddress);
};
