package org.votewind.screenrecord;

import static android.provider.Settings.System.getString;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.core.content.FileProvider;

import java.io.File;
import java.util.Objects;
import androidx.annotation.Nullable;

public class ScreenRecorder {

    private static final String TAG = "VOTEWIND-APP:ScreenRecorder";
    private static final int REQUEST_CODE = 1000;
    static boolean serviceStarted = false;

    private static Activity activity;
    private static int screenDensity;
    private static int displayWidth;
    private static int displayHeight;
    private static String videoFileName = "VoteWind-Recording.mp4";  // default
    private static String extraShareText = "";
    private static BroadcastReceiver recordingFinishedReceiver;

    private static Intent mediaProjectionIntent = null;
    private static int mediaProjectionResultCode = 0;

    public static void requestPermission(Activity currentActivity) {
        Log.d(TAG, "requestPermission called");
        activity = currentActivity;

        android.media.projection.MediaProjectionManager projectionManager =
                (android.media.projection.MediaProjectionManager) activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        if (projectionManager == null) {
            Log.e(TAG, "MediaProjectionManager is null");
            return;
        }

        Intent intent = projectionManager.createScreenCaptureIntent();
        activity.startActivityForResult(intent, REQUEST_CODE);
    }

    public static void startRecording(String fileName, @Nullable String extraText) {
        if (mediaProjectionIntent == null) {
            Log.e(TAG, "Screen recording not enabled — please call enableScreenRecording first");
            return;
        }

        if (serviceStarted) {
            Log.d(TAG, "Recording already in progress");
            return;
        }

        registerRecordingFinishedReceiver();  // ✅ Ensure receiver is ready

        Intent serviceIntent = new Intent(activity, MediaProjectionForegroundService.class);
        serviceIntent.putExtra("resultCode", mediaProjectionResultCode);
        serviceIntent.putExtra("data", mediaProjectionIntent);
        serviceIntent.putExtra("screenDensity", screenDensity);
        serviceIntent.putExtra("width", displayWidth);
        serviceIntent.putExtra("height", displayHeight);
        serviceIntent.putExtra("videoFileName", fileName);
        extraShareText = (extraText != null) ? extraText : "";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.startForegroundService(serviceIntent);
        } else {
            activity.startService(serviceIntent);
        }

        serviceStarted = true;
        Log.d(TAG, "Started screen recording service");
    }

    private static void registerRecordingFinishedReceiver() {
        if (activity == null) {
            Log.e(TAG, "Cannot register receiver: activity is null");
            return;
        }

        if (recordingFinishedReceiver != null) {
            Log.d(TAG, "Recording finished receiver already registered");
            return;
        }

        recordingFinishedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Received RECORDING_FINISHED broadcast");
                shareVideo();
            }
        };

        IntentFilter filter = new IntentFilter("org.votewind.screenrecord.RECORDING_FINISHED");
        activity.registerReceiver(recordingFinishedReceiver, filter);
        Log.d(TAG, "Recording finished receiver registered");
    }

    public static void unregisterRecordingFinishedReceiver() {
        if (activity != null && recordingFinishedReceiver != null) {
            try {
                activity.unregisterReceiver(recordingFinishedReceiver);
                Log.d(TAG, "Recording finished receiver unregistered");
            } catch (IllegalArgumentException e) {
                Log.w(TAG, "Receiver was not registered or already unregistered");
            }
            recordingFinishedReceiver = null;
        }
    }

    public static void shareVideo() {
        if (activity == null) {
            Log.e(TAG, "Cannot share video: activity is null");
            return;
        }

        try {
            File videoFile = new File(activity.getExternalFilesDir(null), videoFileName);
            if (!videoFile.exists()) {
                Log.e(TAG, "Recorded video file does not exist: " + videoFile.getAbsolutePath());
                return;
            }

            Uri videoUri = FileProvider.getUriForFile(activity,
                    activity.getPackageName() + ".fileprovider",
                    videoFile);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("video/*");
            shareIntent.putExtra(Intent.EXTRA_STREAM, videoUri);
            if (!Objects.equals(extraShareText, "")) shareIntent.putExtra(Intent.EXTRA_TEXT, extraShareText);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            activity.startActivity(Intent.createChooser(shareIntent, "Share video"));
            Log.d(TAG, "Share intent started for recorded video.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to share recorded video", e);
        }
    }

    public static void handleActivityResult(int requestCode, int resultCode, Intent data) {
        Log.d(TAG, "handleActivityResult called with requestCode=" + requestCode + ", resultCode=" + resultCode);

        if (requestCode == REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                mediaProjectionIntent = data;
                mediaProjectionResultCode = resultCode;

                // Capture screen metrics now — handles rotation changes between permission and recording
                DisplayMetrics metrics = new DisplayMetrics();
                activity.getWindowManager().getDefaultDisplay().getMetrics(metrics);

                screenDensity = metrics.densityDpi;
                displayWidth = metrics.widthPixels;
                displayHeight = metrics.heightPixels;

                Log.d(TAG, "Screen recording permission granted: width=" + displayWidth +
                        ", height=" + displayHeight + ", density=" + screenDensity);
            } else {
                Log.e(TAG, "Screen recording permission denied");
            }
        }
    }

    public static void stopRecording() {
        Log.d(TAG, "stopRecording called");

        if (!serviceStarted) {
            Log.d(TAG, "Service not started, ignoring stopRecording call");
            return;
        }

        if (activity != null) {
            Intent serviceIntent = new Intent(activity, MediaProjectionForegroundService.class);
            activity.stopService(serviceIntent);
            serviceStarted = false;
            Log.d(TAG, "Requested foreground service stop");
        } else {
            Log.e(TAG, "Cannot stop service — activity is null");
        }
    }
}
