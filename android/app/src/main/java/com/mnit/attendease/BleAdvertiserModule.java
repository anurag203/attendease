package com.mnit.attendease;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.ParcelUuid;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class BleAdvertiserModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BleAdvertiser";
    private static final String SERVICE_UUID = "0000FFF0-0000-1000-8000-00805F9B34FB";
    
    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    private final ReactApplicationContext reactContext;

    public BleAdvertiserModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "BleAdvertiser";
    }

    @ReactMethod
    public void startAdvertising(String token, Promise promise) {
        try {
            BluetoothManager bluetoothManager = (BluetoothManager) reactContext.getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();

            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                promise.reject("BT_DISABLED", "Bluetooth is not enabled");
                return;
            }

            advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            if (advertiser == null) {
                promise.reject("BLE_NOT_SUPPORTED", "BLE advertising not supported on this device");
                return;
            }

            // Stop any existing advertising
            if (advertiseCallback != null) {
                advertiser.stopAdvertising(advertiseCallback);
            }

            // Create advertise settings
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(false)
                    .setTimeout(0)
                    .build();

            // Create advertise data with token
            ParcelUuid serviceUuid = ParcelUuid.fromString(SERVICE_UUID);
            byte[] tokenBytes = token.getBytes(StandardCharsets.UTF_8);
            
            AdvertiseData data = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .setIncludeTxPowerLevel(false)
                    .addServiceUuid(serviceUuid)
                    .addServiceData(serviceUuid, tokenBytes)
                    .build();

            // Create scan response with device name
            String advertiseName = "ATTENDEASE-" + token;
            AdvertiseData scanResponse = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .addServiceUuid(serviceUuid)
                    .build();

            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    super.onStartSuccess(settingsInEffect);
                    Log.d(TAG, "BLE Advertising started successfully for token: " + token);
                }

                @Override
                public void onStartFailure(int errorCode) {
                    super.onStartFailure(errorCode);
                    Log.e(TAG, "BLE Advertising failed with error code: " + errorCode);
                }
            };

            advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
            
            Log.d(TAG, "Started BLE advertising with token: " + token);
            promise.resolve("Advertising started: ATTENDEASE-" + token);

        } catch (Exception e) {
            Log.e(TAG, "Error starting BLE advertising", e);
            promise.reject("ERROR", "Failed to start advertising: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopAdvertising(Promise promise) {
        try {
            if (advertiser != null && advertiseCallback != null) {
                advertiser.stopAdvertising(advertiseCallback);
                Log.d(TAG, "BLE Advertising stopped");
                promise.resolve("Advertising stopped");
            } else {
                promise.resolve("No active advertising");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping BLE advertising", e);
            promise.reject("ERROR", "Failed to stop advertising: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isAdvertisingSupported(Promise promise) {
        try {
            BluetoothManager bluetoothManager = (BluetoothManager) reactContext.getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
            
            boolean supported = bluetoothAdapter != null && 
                               bluetoothAdapter.isEnabled() && 
                               bluetoothAdapter.getBluetoothLeAdvertiser() != null;
            
            promise.resolve(supported);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }
}
