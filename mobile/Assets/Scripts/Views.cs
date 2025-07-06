using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Android;
#if UNITY_2018_4_OR_NEWER
using UnityEngine.Networking;
#endif
using UnityEngine.UI;
using TMPro;

public class Views : MonoBehaviour
{
    public enum View {ViewMap, ViewQR, ViewPosition, ViewInfo};

    public  string                          Url;
    public  GameObject                      ViewMap;
    public  ViewPosition                    ViewPosition;
    public  ViewQR                          ViewQR;
    public  ViewInfo                        ViewInfo;
    public  Image                           ButtonViewMap;
    public  Image                           ButtonViewPosition;
    public  Image                           ButtonViewQR;
    public  Image                           ButtonViewInfo;
    public  TMP_InputField                  InputHubheight;
    public  TMP_InputField                  InputBladeradius;
    public  GameObject                      ButtonContainerViewPosition;
    public  RectTransform                   ButtonPanel; 
    public  GeospatialStreetscapeManager    GeospatialStreetscapeManager;
    public  string                          AssetURL;
    public  TMP_Text                        ViewName;
    public  TextMeshProUGUI                 DebugText;
    private bool                            MapVisibility = true;
    private bool                            MapLoaded = false;
    private string                          ViewPositionURL = "";
    private float                           updateInterval = 0.1f;
    private WebViewObject                   webViewObject;
    private ScreenOrientation               lastOrientation;
    private float                           lastLatitude = float.MinValue;
    private float                           lastLongitude = float.MinValue;
    private float                           lastHeading = float.MinValue;
    private int                             sampleSize = 20;
    private Queue<float>                    headingSamples = new Queue<float>();
    private const string                    CAMERA_PERMISSION = Permission.Camera;
    private const string                    MICROPHONE_PERMISSION = Permission.Microphone;
    private const string                    FINE_LOCATION_PERMISSION = Permission.FineLocation;
    private const string                    COARSE_LOCATION_PERMISSION = Permission.CoarseLocation;
    private bool                            locationServicesStarted = false;
    public  float                           turbineHubheight = 124.2f;
    public  float                           turbineBladeradius = 47.8f;
    private Coroutine                       checkOrientationChangeLauncher;
    private Coroutine                       initializeWebViewLauncher;
    private Coroutine                       startLocationServiceLauncher;
    private Coroutine                       loadViewPositionLauncher;

    // A list of all permissions we want to request upfront
    private string[] requiredPermissions = new string[]
    {
        CAMERA_PERMISSION,
        MICROPHONE_PERMISSION,
        FINE_LOCATION_PERMISSION,
        // COARSE_LOCATION_PERMISSION is often implicitly granted with FINE_LOCATION,
        // but explicitly adding it here ensures all bases are covered.
        COARSE_LOCATION_PERMISSION
    };

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

    public float GetHubheight() 
    {
        return (float)System.Math.Round(turbineHubheight, 1);
    }

    public float GetBladeradius()
    {
        return (float)System.Math.Round(turbineBladeradius, 1);
    } 

    private void SetMapLoaded(bool loaded)
    {
        Debug.Log("VOTEWIND-APP: SetMapLoaded");
        MapLoaded = loaded;
    }

    void SetTurbinePosition(PositionData pos)
    {
        Debug.Log($"Setting turbine position: {pos.longitude}, {pos.latitude}");
        ViewPosition.SetTurbine((float)pos.longitude, (float)pos.latitude, turbineHubheight, turbineBladeradius);
    }

    private void RequestAllRequiredPermissions()
    {
        foreach (string permission in requiredPermissions)
        {
            if (!Permission.HasUserAuthorizedPermission(permission))
            {
                Debug.Log($"Requesting permission: {permission}");
                // RequestUserPermission will show the dialog.
                // It's asynchronous, but doesn't block.
                Permission.RequestUserPermission(permission);
            }
            else
            {
                Debug.Log($"Permission already granted: {permission}");
            }
        }
    }

    // This callback is invoked when the application gains or loses focus.
    // It's useful for re-checking permissions after the user interacts with a permission dialog
    // or goes to app settings and returns.
    void OnApplicationFocus(bool hasFocus)
    {
        if (hasFocus)
        {
            Debug.Log("Application gained focus. Re-checking permission status.");
            CheckCurrentPermissionStatus();
        }
    }

    // You can call this method anytime to get the current status of permissions
    private void CheckCurrentPermissionStatus()
    {
        bool allGranted = true;
        foreach (string permission in requiredPermissions)
        {
            bool granted = Permission.HasUserAuthorizedPermission(permission);
            Debug.Log($"Current status for {permission}: {granted}");
            if (!granted)
            {
                allGranted = false;
            }
        }

        if (allGranted)
        {
            Debug.Log("All required permissions are granted!");
            // Proceed with app functionalities that depend on these permissions
            if (!locationServicesStarted) startLocationServiceLauncher = StartCoroutine(StartLocationService());
        }
        else
        {
            Debug.LogWarning("Some required permissions are NOT granted.");
            // Optionally, prompt the user to enable them in settings, or disable related features.
            // You might show a UI message here.
        }
    }

    void RefreshTurbineView()
    {
        double turbineLongitude = ViewPosition.turbineLongitude;
        double turbineLatitude = ViewPosition.turbineLatitude;

        Debug.Log($"Refreshing turbine position: {turbineLongitude}, {turbineLatitude}, {turbineHubheight} {turbineBladeradius}");

        ViewPosition.SetTurbine((float)turbineLongitude, (float)turbineLatitude, turbineHubheight, turbineBladeradius);
    }

    void BindInputField(string fieldname, TMPro.TMP_InputField input, float initialValue, Action<float> setter)
    {
        // Set the initial value
        input.text = initialValue.ToString("F1");

        // Local variable to track the valid value
        float currentValidValue = initialValue;

        input.onEndEdit.AddListener(str => {
            if (float.TryParse(str, out var value))
            {
                // Sanitise values
                if (fieldname == "bladeradius")
                {
                    if (value > (turbineHubheight - 10))
                    {
                        input.text = currentValidValue.ToString("F1");
                        return;
                    }
                }

                if (fieldname == "hubheight")
                {
                    if (value < (turbineBladeradius + 10) || value < 50 || value > 300)
                    {
                        input.text = currentValidValue.ToString("F1");
                        return;
                    }
                }

                currentValidValue = value;  // Update the valid value
                setter(value);
                RefreshTurbineView();
            }
            else
            {
                // Reset if not a valid float
                input.text = currentValidValue.ToString("F1");
            }
        });
    }

    void Start()
    {
        InvokeRepeating("UpdateInterval", updateInterval, updateInterval);

        BindInputField("hubheight", InputHubheight, turbineHubheight, val => turbineHubheight = val);
        BindInputField("bladeradius", InputBladeradius, turbineBladeradius, val => turbineBladeradius = val);

        lastOrientation = Screen.orientation;
        checkOrientationChangeLauncher = StartCoroutine(CheckOrientationChange());
        initializeWebViewLauncher = StartCoroutine(InitializeWebView());

        // Check all required permissions which will launch location tracking if location is enabled
        // If location not yet enabled then
        RequestAllRequiredPermissions();
        CheckCurrentPermissionStatus();
    }

    private void ClearCheckOrientationChangeLauncher()
    {
        if (checkOrientationChangeLauncher != null)
        {
            StopCoroutine(checkOrientationChangeLauncher);
            checkOrientationChangeLauncher = null;
        }
    }

    private void ClearInitializeWebViewLauncher()
    {
        if (initializeWebViewLauncher != null)
        {
            StopCoroutine(initializeWebViewLauncher);
            initializeWebViewLauncher = null;
        }
    }

    private void ClearStartLocationServiceLauncher()
    {
        if (startLocationServiceLauncher != null)
        {
            StopCoroutine(startLocationServiceLauncher);
            startLocationServiceLauncher = null;
        }
    }

    private void ClearLoadViewPositionLauncher()
    {
        if (loadViewPositionLauncher != null)
        {
            StopCoroutine(loadViewPositionLauncher);
            loadViewPositionLauncher = null;
        }
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
                if (command.method == "MapLoaded")
                {
                    SetMapLoaded(true);
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
        SetViewMap();

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
    }

    private void UpdateLocation(float latitude, float longitude, float heading)
    {
        DebugText.text = $"Lat: {latitude:F5}\nLon: {longitude:F5}\nHeading: {heading:F5}";

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

        locationServicesStarted = true;
    }

    void Update()
    {
        if (!locationServicesStarted) CheckCurrentPermissionStatus();

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

        ClearCheckOrientationChangeLauncher();
        ClearStartLocationServiceLauncher();
        ClearLoadViewPositionLauncher();
        ClearInitializeWebViewLauncher();
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

        ClearLoadViewPositionLauncher();
        loadViewPositionLauncher = StartCoroutine(LoadViewPosition(url));
    }

    private IEnumerator LoadViewPosition(string url)
    {
        VoteWindURL result = VoteWindURLParser.Parse(url);

        if (result == null) 
        {
            Debug.Log($"Invalid URL for VoteWind {url}");
        }
        else 
        {

            SetViewPosition();

            while (!MapLoaded)
            {
                Debug.Log("VOTEWIND-APP: Map not yet loaded, waiting 100ms...");
                if (!MapLoaded) yield return new WaitForSeconds(0.1f);
            }

            string js = $"setTurbine({{ longitude: {result.Longitude}, latitude: {result.Latitude} }});";
            Debug.Log($"VOTEWIND-APP: Executing JS: {js}");
            webViewObject.EvaluateJS(js);

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
