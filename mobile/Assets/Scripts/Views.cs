using System.Collections;
using System.Collections.Generic;
using UnityEngine;
#if UNITY_2018_4_OR_NEWER
using UnityEngine.Networking;
#endif
using UnityEngine.UI;
using TMPro;

public class Views : MonoBehaviour
{
    public enum View {ViewMap, ViewQR, ViewPosition, ViewInfo};

    private bool                            MapVisibility = true;
    public  string                          Url;
    public  GameObject                      ViewMap;
    public  ViewPosition                    ViewPosition;
    public  ViewQR                          ViewQR;
    public  ViewInfo                        ViewInfo;
    public  Image                           ButtonViewMap;
    public  Image                           ButtonViewPosition;
    public  Image                           ButtonViewQR;
    public  Image                           ButtonViewInfo;
    public  GameObject                      ButtonContainerViewPosition;
    public  RectTransform                   ButtonPanel; 
    public  GeospatialStreetscapeManager    GeospatialStreetscapeManager;
    public  string                          AssetURL;
    public  TMP_Text                        ViewName;
    public  TextMeshProUGUI                 DebugText;
    private string                          ViewPositionURL = "";
    private VoteWindURL                     votewindurl = null;
    private float                           updateInterval = 0.1f;
    private WebViewObject                   webViewObject;
    private ScreenOrientation               lastOrientation;
    private float                           lastLatitude = float.MinValue;
    private float                           lastLongitude = float.MinValue;
    private float                           lastHeading = float.MinValue;
    private int                             sampleSize = 20;
    private Queue<float>                    headingSamples = new Queue<float>();

    [System.Serializable]
    public class Command
    {
        public string method;
        public PositionData data;
    }

    [System.Serializable]
    public class PositionData
    {
        public float longitude;
        public float latitude;
    }

    void SetTurbinePosition(PositionData pos)
    {
        Debug.Log($"Setting turbine position: {pos.longitude}, {pos.latitude}");
        ViewPosition.SetTurbine((float)pos.longitude, (float)pos.latitude);
    }

    void Start()
    {
        InvokeRepeating("UpdateInterval",updateInterval,updateInterval);

        lastOrientation = Screen.orientation;
        StartCoroutine(CheckOrientationChange());
        StartCoroutine(StartLocationService());
        StartCoroutine(InitializeWebView());
    }

    IEnumerator InitializeWebView()
    {
        webViewObject = (new GameObject("WebViewObject")).AddComponent<WebViewObject>();
#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
        webViewObject.canvas = GameObject.Find("Canvas");
#endif
        webViewObject.Init(
            cb: (msg) =>
            {
                Debug.Log(string.Format("CallFromJS[{0}]", msg));
                // DebugText.text = msg;

                var command = JsonUtility.FromJson<Command>(msg);
                if (command.method == "SetTurbinePosition")
                {
                    SetTurbinePosition(command.data);
                }
            },
            err: (msg) =>
            {
                Debug.Log(string.Format("CallOnError[{0}]", msg));
            },
            httpErr: (msg) =>
            {
                Debug.Log(string.Format("CallOnHttpError[{0}]", msg));
            },
            started: (msg) =>
            {
                Debug.Log(string.Format("CallOnStarted[{0}]", msg));
            },
            hooked: (msg) =>
            {
                Debug.Log(string.Format("CallOnHooked[{0}]", msg));
            },
            cookies: (msg) =>
            {
                Debug.Log(string.Format("CallOnCookies[{0}]", msg));
            },
            ld: (msg) =>
            {
                Debug.Log(string.Format("CallOnLoaded[{0}]", msg));
#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IOS
                // NOTE: the following js definition is required only for UIWebView; if
                // enabledWKWebView is true and runtime has WKWebView, Unity.call is defined
                // directly by the native plugin.
#if true
                var js = @"
                    if (!(window.webkit && window.webkit.messageHandlers)) {
                        window.Unity = {
                            call: function(msg) {
                                window.location = 'unity:' + msg;
                            }
                        };
                    }
                ";
#else
                // NOTE: depending on the situation, you might prefer this 'iframe' approach.
                // cf. https://github.com/gree/unity-webview/issues/189
                var js = @"
                    if (!(window.webkit && window.webkit.messageHandlers)) {
                        window.Unity = {
                            call: function(msg) {
                                var iframe = document.createElement('IFRAME');
                                iframe.setAttribute('src', 'unity:' + msg);
                                document.documentElement.appendChild(iframe);
                                iframe.parentNode.removeChild(iframe);
                                iframe = null;
                            }
                        };
                    }
                ";
#endif
#elif UNITY_WEBPLAYER || UNITY_WEBGL
                var js = @"
                    window.Unity = {
                        call:function(msg) {
                            parent.unityWebView.sendMessage('WebViewObject', msg);
                        }
                    };
                ";
#else
                var js = "";
#endif
                webViewObject.EvaluateJS(js + @"Unity.call('ua=' + navigator.userAgent)");
            },
            transparent: false
            //zoom: true,
            //ua: "custom user agent string",
            //radius: 0,  // rounded corner radius in pixel
            //// android
            //androidForceDarkMode: 0,  // 0: follow system setting, 1: force dark off, 2: force dark on
            //// ios
            //enableWKWebView: true,
            //wkContentMode: 0,  // 0: recommended, 1: mobile, 2: desktop
            //wkAllowsLinkPreview: true,
            //// editor
            //separated: false
            );
#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
        webViewObject.bitmapRefreshCycle = 1;
        webViewObject.devicePixelRatio = 1;  // 1 or 2
#endif
        webViewObject.SetAlertDialogEnabled(false);
        webViewObject.SetCameraAccess(false);
        webViewObject.SetMicrophoneAccess(false);
        webViewObject.SetScrollbarsVisibility(false);
        webViewObject.SetMargins(0, 0, 0, 0);
        webViewObject.SetTextZoom(100);
        webViewObject.SetVisibility(MapVisibility);
        WebViewObject.ClearMasks();

        RefreshMaskedArea();

#if !UNITY_WEBPLAYER && !UNITY_WEBGL
        if (Url.StartsWith("http")) {
            webViewObject.LoadURL(Url.Replace(" ", "%20"));
        } else {
            var exts = new string[]{
                ".jpg",
                ".js",
                ".html"  // should be last
            };
            foreach (var ext in exts) {
                var url = Url.Replace(".html", ext);
                var src = System.IO.Path.Combine(Application.streamingAssetsPath, url);
                var dst = System.IO.Path.Combine(Application.temporaryCachePath, url);
                byte[] result = null;
                if (src.Contains("://")) {  // for Android
#if UNITY_2018_4_OR_NEWER
                    // NOTE: a more complete code that utilizes UnityWebRequest can be found in https://github.com/gree/unity-webview/commit/2a07e82f760a8495aa3a77a23453f384869caba7#diff-4379160fa4c2a287f414c07eb10ee36d
                    var unityWebRequest = UnityWebRequest.Get(src);
                    yield return unityWebRequest.SendWebRequest();
                    result = unityWebRequest.downloadHandler.data;
#else
                    var www = new WWW(src);
                    yield return www;
                    result = www.bytes;
#endif
                } else {
                    result = System.IO.File.ReadAllBytes(src);
                }
                System.IO.File.WriteAllBytes(dst, result);
                if (ext == ".html") {
                    webViewObject.LoadURL("file://" + dst.Replace(" ", "%20"));
                    break;
                }
            }
        }
#else
        if (Url.StartsWith("http")) {
            webViewObject.LoadURL(Url.Replace(" ", "%20"));
        } else {
            webViewObject.LoadURL("StreamingAssets/" + Url.Replace(" ", "%20"));
        }
#endif
        // SetViewMap();

        yield break;
    }

    System.Collections.IEnumerator CheckOrientationChange()
    {
        while (true)
        {
            if (Screen.orientation != lastOrientation)
            {
                lastOrientation = Screen.orientation;
                RefreshMaskedArea();
                Debug.Log($"Orientation changed to {lastOrientation}");
            }
            yield return new WaitForSeconds(0.5f);
        }
    }

    public void ToggleMap()
    {
        SetMapVisibility(!MapVisibility);
    }

    public void SetMapVisibility (bool visibility)
    {
        webViewObject.SetVisibility(visibility);
        MapVisibility = visibility;
    }

    public void RefreshMaskedArea() 
    {
        WebViewObject.ClearMasks();

        LayoutRebuilder.ForceRebuildLayoutImmediate(ButtonPanel);

        Vector3[] worldCorners = new Vector3[4];
        ButtonPanel.GetWorldCorners(worldCorners);

        Vector3 bottomLeftScreen = RectTransformUtility.WorldToScreenPoint(null, worldCorners[0]);
        Vector3 topRightScreen = RectTransformUtility.WorldToScreenPoint(null, worldCorners[2]);

        float width = topRightScreen.x - bottomLeftScreen.x;
        float height = topRightScreen.y - bottomLeftScreen.y;

        float distanceFromRight = Screen.width - bottomLeftScreen.x;

        Debug.Log($"Bounding box screen coords: bottom-left {bottomLeftScreen}, top-right {topRightScreen}");
        Debug.Log($"Width: {width}px, Height: {height}px");
        Debug.Log($"Distance from right edge: {distanceFromRight}px");

        DebugText.text = $"BL:{bottomLeftScreen} TR:{topRightScreen} W:{Screen.width} H:{Screen.height}";

        WebViewObject.AddMask((int)bottomLeftScreen.x, Screen.height - (int)topRightScreen.y, (int)topRightScreen.x, Screen.height - (int)bottomLeftScreen.y);

        // WebViewObject.AddMask(0, 0, Screen.width, Screen.height);
    }

    private void UpdateLocation(float latitude, float longitude, float heading)
    {
        // DebugText.text = $"Lat: {latitude:F5}\nLon: {longitude:F5}\nHeading: {heading:F5}";

        string js = $"setCentre({{ longitude: {longitude}, latitude: {latitude}, heading: {heading} }});";
        Debug.Log($"Executing JS: {js}");

        webViewObject.EvaluateJS(js);
    }

    IEnumerator StartLocationService()
    {
        Debug.Log("StartLocationService");

        if (!Input.location.isEnabledByUser)
        {
            Debug.LogWarning("Location service is disabled by user.");
            yield break;
        }

        Input.location.Start();
        Input.compass.enabled = true;

        int maxWait = 20;
        while (Input.location.status == LocationServiceStatus.Initializing && maxWait > 0)
        {
            yield return new WaitForSeconds(1);
            maxWait--;
        }

        if (maxWait <= 0)
        {
            Debug.LogWarning("Timed out waiting for location service.");
            yield break;
        }

        if (Input.location.status == LocationServiceStatus.Failed)
        {
            Debug.LogWarning("Unable to determine device location.");
            yield break;
        }
    }

    void Update()
    {
        if (Input.location.status != LocationServiceStatus.Running)
            return;

        var data = Input.location.lastData;
        float heading = Input.compass.trueHeading;
        if (headingSamples.Count == sampleSize) headingSamples.Dequeue();
        headingSamples.Enqueue(heading);

        float sumX = 0f;
        float sumY = 0f;

        foreach (var angle in headingSamples)
        {
            float rad = angle * Mathf.Deg2Rad;
            sumX += Mathf.Cos(rad);
            sumY += Mathf.Sin(rad);
        }

        float avgRad = Mathf.Atan2(sumY, sumX);
        float smoothedHeading = avgRad * Mathf.Rad2Deg;
        if (smoothedHeading < 0) smoothedHeading += 360f;

        smoothedHeading = Mathf.Round(smoothedHeading * 1f) / 1f;

        if (!Mathf.Approximately(data.latitude, lastLatitude) || !Mathf.Approximately(data.longitude, lastLongitude) || !Mathf.Approximately(smoothedHeading, lastHeading))
        {
            lastLatitude = data.latitude;
            lastLongitude = data.longitude;
            lastHeading = smoothedHeading;
            UpdateLocation(lastLatitude, lastLongitude, lastHeading);
        }
    }

    private void OnDestroy()
    {
        if (Input.location.status == LocationServiceStatus.Running)
        {
            Input.location.Stop();
        }
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

    public void SetViewMap()
    {
        SetView(View.ViewMap);
    }

    public void SetViewPosition()
    {
        SetView(View.ViewPosition);
    }

    public void SetViewQR()
    {
        SetView(View.ViewQR);
    }

    public void SetViewInfo()
    {
        SetView(View.ViewInfo);
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
            ViewPosition.InitURL(ViewPositionURL);
        }
    }

    public void SetView(View view)
    {
        switch (view)
        {
            case View.ViewMap:
                ViewName.SetText("ViewMap");
                EnableView(View.ViewMap);
                DisableView(View.ViewPosition);
                DisableView(View.ViewQR);
                DisableView(View.ViewInfo);
                break;
            case View.ViewPosition:
                ViewName.SetText("ViewPosition");
                DisableView(View.ViewMap);
                EnableView(View.ViewPosition);
                DisableView(View.ViewQR);
                DisableView(View.ViewInfo);
                break;
            case View.ViewQR:
                ViewName.SetText("ViewQR");
                DisableView(View.ViewMap);
                DisableView(View.ViewPosition);
                EnableView(View.ViewQR);
                DisableView(View.ViewInfo);
                break;
            case View.ViewInfo:
                ViewName.SetText("ViewInfo");
                DisableView(View.ViewMap);
                DisableView(View.ViewPosition);
                DisableView(View.ViewQR);
                EnableView(View.ViewInfo);
                break;
        }
    }

    public void DisableView(View view)
    {
        switch (view)
        {
            case View.ViewMap:
                ButtonViewMap.enabled = false;
                SetMapVisibility(false);
                ViewMap.SetActive(false);
                break;
            case View.ViewPosition:
                GeospatialStreetscapeManager.DestroyAllRenderGeometry();
                ViewPosition.gameObject.SetActive(false);
                ButtonViewPosition.enabled = false;
                break;
            case View.ViewQR:
                ViewQR.gameObject.SetActive(false);
                ButtonViewQR.enabled = false;
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
            case View.ViewMap:
                ViewMap.SetActive(true);
                ButtonViewMap.enabled = true;
                SetMapVisibility(true);
                break;
            case View.ViewPosition:
                ButtonContainerViewPosition.SetActive(true);
                LayoutRebuilder.ForceRebuildLayoutImmediate(ButtonPanel);
                ViewPosition.gameObject.SetActive(true);
                ButtonViewPosition.enabled = true;
                break;
            case View.ViewQR:
                ViewQR.gameObject.SetActive(true);
                ButtonViewQR.enabled = true;
                break;
            case View.ViewInfo:
                ViewInfo.gameObject.SetActive(true);
                ButtonViewInfo.enabled = true;
                break;
        }
    }

}
