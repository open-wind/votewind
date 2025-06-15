using System.Collections;
using UnityEngine;
#if UNITY_2018_4_OR_NEWER
using UnityEngine.Networking;
#endif
using UnityEngine.UI;
using TMPro;

public class Views : MonoBehaviour
{
    public enum View {ViewQR, ViewPosition, ViewInfo};

    public  ViewQR          ViewQR;
    public  ViewPosition    ViewPosition;
    public  ViewInfo        ViewInfo;
    public  Image           ButtonViewQR;
    public  Image           ButtonViewPosition;
    public  Image           ButtonViewInfo;
    public  GameObject      ButtonContainerViewPosition;
    public  RectTransform   ButtonPanel; 
    public  GeospatialStreetscapeManager GeospatialStreetscapeManager;
    public  string          AssetURL;
    public  TMP_Text        ViewName;
    private string          ViewPositionURL = "";
    private VoteWindURL     votewindurl = null;
    private float           updateInterval = 0.1f;

    IEnumerator Start()
    {
        InvokeRepeating("UpdateInterval",updateInterval,updateInterval);

        // InitViewPosition("");
        SetViewQR();

        yield break;
    }

    private void UpdateInterval()
    {
        getIntentData();
    }

    private void getIntentData () {
        string url = "";

    #if (!UNITY_EDITOR && UNITY_ANDROID)
        AndroidJavaClass UnityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
        AndroidJavaObject currentActivity = UnityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        AndroidJavaObject intent = currentActivity.Call<AndroidJavaObject>("getIntent");
        url = intent.Call<string>("getStringExtra", "data");
    #endif

        if ((url != null) && (url != ViewPositionURL))
        {
            ViewPositionURL = url;
            InitViewPosition(ViewPositionURL);
        }
    }

    public void DisableView(View view)
    {
        switch (view)
        {
            case View.ViewQR:
                ViewQR.gameObject.SetActive(false);
                ButtonViewQR.enabled = false;
                break;
            case View.ViewPosition:
                GeospatialStreetscapeManager.DestroyAllRenderGeometry();
                ViewPosition.gameObject.SetActive(false);
                ButtonViewPosition.enabled = false;
                break;
            case View.ViewInfo:
                ViewInfo.gameObject.SetActive(false);
                ButtonViewInfo.enabled = false;
                break;

        }
    }

    public void EnableView(View view)
    {
        switch (view)
        {
            case View.ViewQR:
                ViewQR.gameObject.SetActive(true);
                ButtonViewQR.enabled = true;
                break;
            case View.ViewPosition:
                ButtonContainerViewPosition.SetActive(true);
                LayoutRebuilder.ForceRebuildLayoutImmediate(ButtonPanel);
                ViewPosition.gameObject.SetActive(true);
                ButtonViewPosition.enabled = true;
                break;
            case View.ViewInfo:
                ViewInfo.gameObject.SetActive(true);
                ButtonViewInfo.enabled = true;
                break;
        }

    }

    public void SetViewQR()
    {
        SetView(View.ViewQR);
    }

    public void SetViewPosition()
    {
        SetView(View.ViewPosition);
    }

    public void InitViewPosition(string url)
    {
        DebugInfoManager.Log($"Triggered by {url} - QRCode or Intent");

        VoteWindURL result = VoteWindURLParser.Parse(url);

        if (result == null) 
        {
            Debug.Log($"Invalid URL for VoteWind {url}");
        }
        else 
        {
            SetViewPosition();
            ViewPositionURL = url;
            ViewPosition.Init(ViewPositionURL);
        }
    }

    public void SetViewInfo()
    {
        SetView(View.ViewInfo);
    }

    public void SetView(View view)
    {
        switch (view)
        {
            case View.ViewPosition:
                ViewName.SetText("ViewPosition");
                DisableView(View.ViewQR);
                EnableView(View.ViewPosition);
                DisableView(View.ViewInfo);
                break;
            case View.ViewQR:
                ViewName.SetText("ViewQR");
                DisableView(View.ViewPosition);
                EnableView(View.ViewQR);
                DisableView(View.ViewInfo);
                break;
            case View.ViewInfo:
                ViewName.SetText("ViewInfo");
                DisableView(View.ViewPosition);
                DisableView(View.ViewQR);
                EnableView(View.ViewInfo);
                break;

        }
    }

    // Update is called once per frame
    void Update()
    {
    }
}
