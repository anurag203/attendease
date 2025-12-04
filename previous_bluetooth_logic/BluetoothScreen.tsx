import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  FlatList,
  PermissionsAndroid,
  Platform,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

const TARGET_DEVICE_ADDRESS = '80:A9:97:36:6D:28';

const BluetoothScreen: React.FC = () => {
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTargetDeviceNearby, setIsTargetDeviceNearby] = useState(false);

  const requestPermissions = async () => {
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
          Alert.alert('Permission denied', 'Required Bluetooth permissions not granted.');
          return false;
        }
      }
    }
    return true;
  };

  const getBluetoothState = async () => {
    const state = await BluetoothStateManager.getState();
    setIsBluetoothOn(state === 'PoweredOn');
  };

  const toggleBluetooth = async (value: boolean) => {
    if (value) {
      await BluetoothStateManager.requestToEnable();
    }
    getBluetoothState();
  };

  const discoverDevices = async () => {
    if (!isBluetoothOn || isScanning) return;

    setIsScanning(true);
    try {
      const found = await RNBluetoothClassic.startDiscovery();

      // Remove duplicates
      const uniqueDevicesMap: { [address: string]: BluetoothDevice } = {};
      found.forEach(device => {
        uniqueDevicesMap[device.address] = device;
      });

      const uniqueDevices = Object.values(uniqueDevicesMap);
      setDevices(uniqueDevices);

      // Check if target device is nearby
      const isPresent = uniqueDevices.some(device => device.address === TARGET_DEVICE_ADDRESS);
      setIsTargetDeviceNearby(isPresent);
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    requestPermissions().then(getBluetoothState);

    const interval = setInterval(async () => {
      await getBluetoothState();
      if (isBluetoothOn) {
        await discoverDevices();
      } else {
        setDevices([]);
        setIsTargetDeviceNearby(false);
      }
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, [isBluetoothOn]);

  const handleMarkAttendance = () => {
    Alert.alert('Success ✅', 'Your attendance has been marked!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        Bluetooth is {isBluetoothOn ? 'ON ✅' : 'OFF ❌'}
      </Text>

      {!isBluetoothOn ? (
  <View style={styles.bluetoothOffContainer}>
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>Turn on Bluetooth 👉 </Text>
      <Switch value={isBluetoothOn} onValueChange={toggleBluetooth} />
    </View>
  </View>
) : (
        <>
          <Text style={styles.devicesTitle}>Nearby Devices:</Text>
          {devices.length > 0 ? (
            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              data={devices}
              keyExtractor={(item) => item.address}
              renderItem={({ item }) => (
                <Text style={styles.deviceItem}>
                  {item.name || 'Unknown'} - {item.address}
                </Text>
              )}
            />
          ) : (
            <Text style={{ marginTop: 10 }}>No devices found.</Text>
          )}

          {/* Attendance Status */}
          <View style={styles.attendanceContainer}>
            {isTargetDeviceNearby ? (
              <>
                <Text style={styles.attendanceText}>
                  ✅ You are present in the class, you can mark your attendance.
                </Text>
                <TouchableOpacity style={styles.attendanceButton} onPress={handleMarkAttendance}>
                  <Text style={styles.attendanceButtonText}>Mark Attendance</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.attendanceText}>
                ❌ Please go to the respective classroom to mark the attendance.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
};

export default BluetoothScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  statusText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  devicesTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deviceItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  attendanceContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  attendanceButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  attendanceButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bluetoothOffContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 50,
},

toggleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 20,
},

toggleLabel: {
  fontSize: 20,
  marginRight: 10,
},

});
