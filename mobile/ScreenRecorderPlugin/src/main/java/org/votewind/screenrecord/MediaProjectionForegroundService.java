package org.votewind.screenrecord;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;
import android.view.Surface;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.IOException;

public class MediaProjectionForegroundService extends Service {
    private static final String TAG = "VOTEWIND-APP:MediaProjectionService";
    private static final String CHANNEL_ID = "MediaProjectionChannel";
    private static final int NOTIF_ID = 1;

    // Keys for Intent extras
    public static final String EXTRA_RESULT_CODE = "result_code";

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaRecorder mediaRecorder;

    private int screenDensity;
    private int displayWidth;
    private int displayHeight;
    private String videoFileName;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand called");

        int resultCode = intent.getIntExtra("resultCode", 0);
        Intent resultData = intent.getParcelableExtra("data");
        screenDensity = intent.getIntExtra("screenDensity", 0);
        displayWidth = intent.getIntExtra("width", 0);
        displayHeight = intent.getIntExtra("height", 0);
        videoFileName = intent.getStringExtra("videoFileName");
        if (videoFileName == null || videoFileName.isEmpty()) {
            videoFileName = "recording.mp4";
        }

        Log.d(TAG, "onStartCommand called with resultCode=" + resultCode + ", resultData=" + resultData +
                ", screenDensity=" + screenDensity + ", width=" + displayWidth + ", height=" + displayHeight);

        if (resultData == null) {
            Log.e(TAG, "resultData is null");
        }
        if (resultCode != -1) {
            Log.e(TAG, "resultCode is not OK");
        }

        if (resultCode != -1 || resultData == null) {
            Log.e(TAG, "Invalid permission result, stopping service");
            stopSelf();
            return START_NOT_STICKY;
        }

        // Start foreground notification (using 2-arg startForeground for compatibility)
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Screen Recording")
                .setContentText("Recording your screen...")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .build();
        startForeground(NOTIF_ID, notification);

        // Setup MediaProjection
        MediaProjectionManager projectionManager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        if (projectionManager == null) {
            Log.e(TAG, "MediaProjectionManager is null");
            stopSelf();
            return START_NOT_STICKY;
        }
        mediaProjection = projectionManager.getMediaProjection(resultCode, resultData);
        if (mediaProjection == null) {
            Log.e(TAG, "MediaProjection is null");
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            setupMediaRecorder();
            createVirtualDisplay();
            mediaRecorder.start();
            Log.d(TAG, "MediaRecorder started");
        } catch (IOException | IllegalStateException e) {
            Log.e(TAG, "Error starting recording", e);
            stopSelf();
        }

        // Return sticky in case service gets killed
        return START_STICKY;
    }

    private void setupMediaRecorder() throws IOException {
        Log.d(TAG, "Setting up MediaRecorder");

        mediaRecorder = new MediaRecorder();

        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);

        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        String outputPath = getExternalFilesDir(null).getAbsolutePath() + "/" + videoFileName;
        mediaRecorder.setOutputFile(outputPath);
        Log.d(TAG, "Output file: " + outputPath);

        Log.d(TAG, "Setting video size to width: " + displayWidth + ", height: " + displayHeight);

        if (displayWidth > 0 && displayHeight > 0) {
            mediaRecorder.setVideoSize(displayWidth, displayHeight);
        } else {
            Log.e(TAG, "Invalid video size: width or height <= 0");
            stopSelf(); // or handle error accordingly
        }
        mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        mediaRecorder.setVideoEncodingBitRate(8 * 1000 * 1000);
        mediaRecorder.setVideoFrameRate(30);

        mediaRecorder.prepare();
        Log.d(TAG, "MediaRecorder prepared");
    }

    private void createVirtualDisplay() {
        Log.d(TAG, "Creating VirtualDisplay");

        Surface surface = mediaRecorder.getSurface();

        Log.d(TAG, "Creating VirtualDisplay with width=" + displayWidth + ", height=" + displayHeight + ", density=" + screenDensity);
        int flags = DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR;
        Log.d(TAG, "Creating VirtualDisplay with flags: " + flags);

        virtualDisplay = mediaProjection.createVirtualDisplay("ScreenRecorderDisplay",
                displayWidth, displayHeight, screenDensity,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                surface, null, null);

        Log.d(TAG, "VirtualDisplay created");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service onDestroy: starting cleanup");

        try {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping MediaRecorder", e);
                }
                mediaRecorder.reset();
                mediaRecorder.release();
                mediaRecorder = null;
            }

            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }

            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
            }

            Log.d(TAG, "Service onDestroy: recording finalized, cleanup complete");

            // Send broadcast to notify the recording is finalized
            Intent doneIntent = new Intent("org.votewind.screenrecord.RECORDING_FINISHED");
            sendBroadcast(doneIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error during cleanup in onDestroy", e);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        // Not a bound service
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Log.d(TAG, "Creating notification channel");
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Media Projection Service Channel", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
