package com.leevon.delivery;

import android.app.Activity;
import android.content.Intent;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
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
                            // Launch the native Google Play Services dialog using Capacitor's startActivityForResult
                            startActivityForResult(call, resolvable.getResolution().getIntentSender(), "resolveGpsCallback");
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

    @ActivityCallback
    private void resolveGpsCallback(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            call.resolve();
        } else {
            call.reject("User cancelled GPS enablement");
        }
    }
}
