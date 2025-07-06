package org.votewind.screenrecord;

// Change this import to point to CUnityPlayerActivity instead of UnityPlayerActivity
import net.gree.unitywebview.CUnityPlayerActivity;

import android.content.Intent;
import android.util.Log;
import com.unity3d.player.UnityPlayer;
import com.unity3d.player.UnityPlayerActivity;

public class CustomUnityPlayerActivity extends CUnityPlayerActivity {

    private static final String TAG = "VOTEWIND-APP:CustomUnityPlayerActivity";

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        Log.d(TAG, "onActivityResult called with requestCode=" + requestCode + ", resultCode=" + resultCode);
        super.onActivityResult(requestCode, resultCode, data);

        UnityPlayer.UnitySendMessage("Recorder", "OnScreenRecordPermissionResult", String.valueOf(resultCode));

        ScreenRecorder.handleActivityResult(requestCode, resultCode, data);
    }
}
