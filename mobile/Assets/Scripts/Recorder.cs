using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Android;
#if UNITY_2018_4_OR_NEWER
using UnityEngine.Networking;
#endif
using UnityEngine.UI;
using TMPro;
using ZXing;
using ZXing.Common;

public class Recorder : MonoBehaviour
{
    private     bool                isRecording = false;
    public      Views               Views;
    public      ViewPosition        viewPosition;
    public      GameObject          recordingUILocked;
    public      GameObject          recordingUIEnabled;
    public      GameObject          buttonsNavigation;
    public      GameObject          buttonRecord;
    public      GameObject          buttonStop;
    public      GameObject          recorderTimePill;
    public      GameObject          qrArea;
    public      TextMeshProUGUI     recorderTimeValue;
    public      RawImage            qrImage;
    public      float               pulseSpeed = 2f;       // Speed of pulsation
    public      float               minScale = 0.8f;       // Minimum scale factor
    public      float               maxScale = 1.2f;       // Maximum scale factor

    private     float               elapsedTime = 0f;
    private     Coroutine           timerCoroutine;
    private     AndroidJavaObject   activity;
    private     AndroidJavaClass    pluginClass;
    private     Vector3             initialScale;
    private     string              videoFileName = "VoteWind-Recording.mp4";
    private     string              extraShareText = "https://votewind.org/0.1/51/vote";
    private     bool                recordingEnabled = false;

    public void DebugLog(string logtext)
    {
        Debug.Log("VOTEWIND-APP: " + logtext);
    }

    public void OnScreenRecordPermissionResult(string resultCode)
    {
        Debug.Log($"Screen record permission result: {resultCode}");
        if (resultCode == "-1") EnableRecording(); 
    }

    public void EnableRecording()
    {
        recordingEnabled = true;
        recordingUILocked.SetActive(false);
        recordingUIEnabled.SetActive(true);
    }

    private string GetDefaultURL() 
    {
        double longitude = viewPosition.turbineLongitude;
        double latitude = viewPosition.turbineLatitude;
        string url = "https://votewind.org/" + ((float)System.Math.Round(longitude, 5)).ToString() + "/" + ((float)System.Math.Round(latitude, 5)).ToString() + "/vote";
        return url;
    }

    private string GetQRURL() 
    {
        double longitude = viewPosition.turbineLongitude;
        double latitude = viewPosition.turbineLatitude;
        float hubheight = Views.GetHubheight();
        float bladeradius = Views.GetBladeradius();
        string url = "https://votewind.org/ar/" + ((float)System.Math.Round(longitude, 5)).ToString() + "/" + ((float)System.Math.Round(latitude, 5)).ToString() + "/" + hubheight.ToString() + "/" + bladeradius.ToString();
        Debug.Log("VOTEWIND-APP:" + url);

        return url;
    }

    private string GetFileName()
    {
        string fileName = "VoteWind-Recording.mp4";
        return fileName;
    }

    public void RecordingStart() 
    {
        DebugLog("RecordingStart");

        pluginClass.CallStatic("startRecording", GetFileName(), GetDefaultURL());

        DebugLog("Step 1");

        qrImage.texture = GenerateQRCode(GetQRURL());

        initialScale = transform.localScale;

        buttonsNavigation.SetActive(false);
        // buttonRecord.SetActive(false);
        // buttonStop.SetActive(true);

        elapsedTime = 0f;
        recorderTimeValue.text = "00:00:00";  
        timerCoroutine = StartCoroutine(UpdateTimer());

        isRecording = true;
    }

    public void RecordingStop()
    {
        pluginClass.CallStatic("stopRecording");

        buttonsNavigation.SetActive(true);

        qrArea.SetActive(false);
        buttonRecord.SetActive(true);
        buttonStop.SetActive(false);
        // recorderTimePill.SetActive(false);

        if (timerCoroutine != null)
        {
            StopCoroutine(timerCoroutine);
            timerCoroutine = null;
        }

        recorderTimeValue.text = "";  
        buttonRecord.transform.localScale = initialScale;

        isRecording = false;
    }

    public void RecordingToggle()
    {
        DebugLog("RecordingToggle");

        if (recordingEnabled)
        {
            DebugLog("Recording is enabled");
            if (isRecording) RecordingStop();
            else RecordingStart();
        } 
        else 
        {
            DebugLog("Starting Request Permissions");

            RequestPermissions();  // make sure permissions are requested
            DebugLog("Creating unityPlayer");

            using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            {
                DebugLog("Getting current activity");

                using (AndroidJavaObject currentActivity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
                {
                    DebugLog("Getting screenrecord.Screenrecorder plugin");

                    using (AndroidJavaClass pluginClass = new AndroidJavaClass("org.votewind.screenrecord.ScreenRecorder"))
                    {
                        try
                        {
                            DebugLog("Calling requestPermission");

                            pluginClass.CallStatic("requestPermission", currentActivity);

                            DebugLog("Finished calling requestPermission");
                        }
                        catch (System.Exception e)
                        {
                            DebugLog("Exception during requestPermission: " + e.Message);
                        }
                    }
                }
            }
        }
    }
    
    public void RequestPermissions()
    {
        if (!Permission.HasUserAuthorizedPermission(Permission.Microphone))
        {
            Permission.RequestUserPermission(Permission.Microphone);
        }

        if (!Permission.HasUserAuthorizedPermission(Permission.ExternalStorageWrite))
        {
            Permission.RequestUserPermission(Permission.ExternalStorageWrite);
        }
    }

    void Awake() {
        using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer")) {
            activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        }
        pluginClass = new AndroidJavaClass("org.votewind.screenrecord.ScreenRecorder");
    }

    Texture2D GenerateQRCode(string text)
    {
        var writer = new BarcodeWriterPixelData
        {
            Format = BarcodeFormat.QR_CODE,
            Options = new ZXing.Common.EncodingOptions
            {
                Height = 256,
                Width = 256
            }
        };

        var pixelData = writer.Write(text);
        var texture = new Texture2D(pixelData.Width, pixelData.Height, TextureFormat.RGBA32, false);
        texture.LoadRawTextureData(pixelData.Pixels);
        texture.Apply();

        return texture;
    }

    private IEnumerator UpdateTimer()
    {
        while (true)
        {
            yield return new WaitForSeconds(0.1f);
            elapsedTime += 0.1f;

            float scale = Mathf.Lerp(minScale, maxScale, (Mathf.Sin(Time.time * pulseSpeed) + 1f) / 2f);
            buttonRecord.transform.localScale = 1.3f * initialScale * scale;

            int hours = Mathf.FloorToInt(elapsedTime / (60 * 60));
            int minutes = Mathf.FloorToInt(elapsedTime / 60);
            int seconds = Mathf.FloorToInt(elapsedTime % 60);
            // Wait until here before activating any UI 
            if (seconds > 0) {
                qrArea.SetActive(true);
                // recorderTimePill.SetActive(true);
            }
            
            recorderTimeValue.text = string.Format("{0:00}:{1:00}:{2:00}", hours, minutes, seconds);
        }
    }

}
