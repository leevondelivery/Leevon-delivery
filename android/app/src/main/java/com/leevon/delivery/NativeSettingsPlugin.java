package com.leevon.delivery;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.LocationSettingsResponse;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.SettingsClient;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeSettings")
public class NativeSettingsPlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> gpsResolutionLauncher;
    private String lastCallbackId;

    @Override
    public void load() {
        gpsResolutionLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                if (lastCallbackId != null) {
                    PluginCall savedCall = bridge.getSavedCall(lastCallbackId);
                    if (savedCall != null) {
                        if (result.getResultCode() == Activity.RESULT_OK) {
                            savedCall.resolve();
                        } else {
                            savedCall.reject("User cancelled GPS enablement");
                        }
                        bridge.releaseCall(savedCall);
                    }
                }
            }
        );
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open location settings", e);
        }
    }

    @PluginMethod
    public void isLocationEnabled(PluginCall call) {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            boolean gpsEnabled = false;
            boolean networkEnabled = false;

            try {
                gpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
            } catch (Exception e) {}

            try {
                networkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            } catch (Exception e) {}

            JSObject result = new JSObject();
            result.put("enabled", gpsEnabled || networkEnabled);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not check location status", e);
        }
    }

    @PluginMethod
    public void requestGpsEnable(PluginCall call) {
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                LocationRequest locationRequest = LocationRequest.create()
                        .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
                        .setInterval(10000)
                        .setFastestInterval(2000);

                LocationSettingsRequest.Builder builder = new LocationSettingsRequest.Builder()
                        .addLocationRequest(locationRequest)
                        .setAlwaysShow(true); // Force Google Play Services GPS Dialog

                SettingsClient client = LocationServices.getSettingsClient(getActivity());
                Task<LocationSettingsResponse> task = client.checkLocationSettings(builder.build());

                task.addOnSuccessListener(getActivity(), response -> {
                    // GPS is already enabled
                    call.resolve();
                });

                task.addOnFailureListener(getActivity(), e -> {
                    if (e instanceof ResolvableApiException) {
                        try {
                            ResolvableApiException resolvable = (ResolvableApiException) e;
                            
                            // Save the call to retrieve it in the launcher callback
                            lastCallbackId = call.getCallbackId();
                            bridge.saveCall(call);
                            
                            // Create IntentSenderRequest using AndroidX builder
                            IntentSenderRequest intentSenderRequest = new IntentSenderRequest.Builder(
                                resolvable.getResolution().getIntentSender()
                            ).build();
                            
                            // Launch resolution dialog
                            gpsResolutionLauncher.launch(intentSenderRequest);
                        } catch (Exception sendEx) {
                            call.reject("Failed to show GPS enable dialog", sendEx);
                        }
                    } else {
                        call.reject("GPS is not available on this device");
                    }
                });
            }
        });
    }
}
