using System;
using System.Collections;
using System.Collections.Generic;
using Google.XR.ARCoreExtensions;
using TMPro;
using UnityEngine;
#if UNITY_ANDROID
using UnityEngine.Android;
#endif
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using CesiumForUnity;
using Google.XR.ARCoreExtensions.GeospatialCreator.Internal;

public enum ARLoadState
{
    NotStarted,
    WaitingForLocationPermission,
    WaitingForLocation,
    ARSessionInitializing,
    Tracking,
    LoadingTerrain,
    LoadingTurbines,
    Ready,
    Failed
}

public class Turbine
{
    public double Longitude;
    public double Latitude;
    public float HubHeight;
    public float BladeRadius;
    public string Type;

    public Turbine(double longitude, double latitude, float hubheight, float bladeradius, string type)
    {
        Longitude = longitude;
        Latitude = latitude;
        HubHeight = hubheight;
        BladeRadius = bladeradius;
        Type = type;
    }
}

public class ViewPosition : MonoBehaviour
{
    [Header("Core Features")]
    [SerializeField]
    private TextMeshProUGUI geospatialStatusText;

    [SerializeField]
    private ARAnchorManager AnchorManager;

    [SerializeField]
    private AREarthManager earthManager;

    [SerializeField]
    private ARSession arSession;

    [SerializeField]
    private ARCoreExtensions arcoreExtensions;

    [SerializeField]
    private GameObject ViewPositionTerrain;

    [SerializeField]
    private GameObject ViewPositionElements;

    [SerializeField]
    public List<Turbine> turbines = new List<Turbine>();

    public float verticalOffset = 0f;

    private bool elementsInitialized = false;
    private bool waitingForLocationService = false;

    private Coroutine locationServiceLauncher;

    private double currentLongitude = 0.0f;
    private double currentLatitude = 0.0f;

    public double turbineLongitude = 0.0f;
    public double turbineLatitude = 0.0f;

    private string currentURL = null;

    [Header("UI Feedback")]
    [SerializeField] private TextMeshProUGUI SettingUpStatus;
    [SerializeField] private GameObject SettingUp;

    public ARLoadState CurrentState = ARLoadState.NotStarted;

    private void Awake()
    {
        // Enable geospatial sample to target 60fps camera capture frame rate
        // on supported devices.
        // Note, Application.targetFrameRate is ignored when QualitySettings.vSyncCount != 0.
        Application.targetFrameRate = 60;
    }

    public void InitURL(string url)
    {
        VoteWindURL result = VoteWindURLParser.Parse(url);

        if (result == null) return;

        currentURL = url;

        DebugInfoManager.Log($"Using position {result.Longitude}, {result.Latitude}, {result.HubHeight}, {result.BladeRadius}");

        turbines.Clear();
        turbines.Add(new Turbine(result.Longitude, result.Latitude, (float)result.HubHeight, (float)result.BladeRadius, "Active"));
        turbineLongitude = result.Longitude;
        turbineLatitude = result.Latitude;

        if (elementsInitialized) UpdateElements();
    }

    public void SetTurbine(double longitude, double latitude, float hubheight, float bladeradius)
    {
        turbines.Clear();
        DestroyChildren(ViewPositionElements);
        elementsInitialized = false;
        turbines.Add(new Turbine(longitude, latitude, hubheight, bladeradius, "Active"));
        turbineLongitude = longitude;
        turbineLatitude = latitude;
    }

    void Update()
    {
        if (earthManager == null)
            return;

        if (ARSession.state != ARSessionState.SessionInitializing &&
               ARSession.state != ARSessionState.SessionTracking)
        {
            return;
        }

        // Check feature support and enable Geospatial API when it's supported.
        var featureSupport = earthManager.IsGeospatialModeSupported(GeospatialMode.Enabled);
        switch (featureSupport)
        {
            case FeatureSupported.Unknown:
                break;
            case FeatureSupported.Unsupported:
                Debug.Log("The Geospatial API is not supported by this device.");
                break;
            case FeatureSupported.Supported:
                if (arcoreExtensions.ARCoreExtensionsConfig.GeospatialMode == GeospatialMode.Disabled)
                {
                    arcoreExtensions.ARCoreExtensionsConfig.GeospatialMode =
                        GeospatialMode.Enabled;
                    arcoreExtensions.ARCoreExtensionsConfig.StreetscapeGeometryMode =
                        StreetscapeGeometryMode.Enabled;
                }
                break;
        }

        var pose = earthManager.EarthState == EarthState.Enabled &&
            earthManager.EarthTrackingState == TrackingState.Tracking ? 
            earthManager.CameraGeospatialPose : new GeospatialPose();

        // string debugOutput = $"ARSession: {ARSession.state}\n" +
        //                     $"EarthState: {earthManager.EarthState}\n" +
        //                     $"TrackingState: {earthManager.EarthTrackingState}\n" +
        //                     $"Lat: {pose.Latitude:F5}, Lon: {pose.Longitude:F5}";

        // DebugInfoManager.Log(debugOutput);

        var supported = earthManager.IsGeospatialModeSupported(GeospatialMode.Enabled);

        if (earthManager.EarthTrackingState == TrackingState.Tracking)
        {
            if (CurrentState != ARLoadState.Tracking)
                CurrentState = ARLoadState.Tracking;
        }

        int variationAccuracy = 2;
        if ((Math.Round(currentLongitude, variationAccuracy) != Math.Round(pose.Longitude, variationAccuracy)) ||
            (Math.Round(currentLatitude, variationAccuracy) != Math.Round(pose.Latitude, variationAccuracy)))
        {
            currentLongitude = pose.Longitude;
            currentLatitude = pose.Latitude;

            CurrentState = ARLoadState.LoadingTerrain;
            UpdateTerrain(currentLatitude, currentLongitude);

            if (!elementsInitialized)
            {
                CurrentState = ARLoadState.LoadingTurbines;
                UpdateElements();
                elementsInitialized = true;
            }
        }

        UpdateStatusUI();
    }

    void UpdateTerrain(double latitude, double longitude)
    {
        // Create terrain
        DestroyChildren(ViewPositionTerrain);
        var terrainAnchor = AnchorManager.AddAnchor(currentLatitude, currentLongitude, 0, Quaternion.Euler(0, 0, 0));
        terrainAnchor.transform.SetParent(ViewPositionTerrain.transform, false);
        UnityEngine.Object cesiumTerrainPrefabReference = Resources.Load("Cesium World Terrain");
        GameObject anchoredAsset = Instantiate(cesiumTerrainPrefabReference, terrainAnchor.transform) as GameObject;
        terrainAnchor.gameObject.AddComponent<CesiumGeoreference>();
        CesiumGeoreference terrainGeoreference = terrainAnchor.gameObject.GetComponent<CesiumGeoreference>();
        terrainGeoreference.latitude = currentLatitude;
        terrainGeoreference.longitude = currentLongitude;
        terrainGeoreference.height = verticalOffset;
    }

    void UpdateElements()
    {
        DestroyChildren(ViewPositionElements);

        for (var index = 0; index < turbines.Count; index++)
        {
            Debug.Log("Creating turbine " + index.ToString());
            // Create 3D elements
            double latitude = turbines[index].Latitude;
            double longitude = turbines[index].Longitude;
            ResolveAnchorOnTerrainPromise terrainPromise = AnchorManager.ResolveAnchorOnTerrainAsync(latitude, longitude, -verticalOffset, Quaternion.Euler(0, 0, 0));
            StartCoroutine(CheckTerrainPromise(terrainPromise, index));
        }
    }

    void DestroyChildren(GameObject gameObject)
    {
        foreach (Transform child in gameObject.transform)
        {
            Destroy(child.gameObject);
        }
    }

    private IEnumerator CheckTerrainPromise(ResolveAnchorOnTerrainPromise promise, int index)
    {
        yield return promise;

        var result = promise.Result;
        if ((result.TerrainAnchorState == TerrainAnchorState.Success) && (result.Anchor != null))
        {
            // resolving anchor succeeded
            UnityEngine.Object turbinePrefabReference = Resources.Load("windturbine_prefab");
            GameObject anchorGO = Instantiate(turbinePrefabReference, result.Anchor.gameObject.transform) as GameObject;
            windturbine windturbineClass = anchorGO.GetComponent<windturbine>();
            windturbineClass.Init(turbines[index].HubHeight, turbines[index].BladeRadius);
            anchorGO.transform.parent = result.Anchor.gameObject.transform;
            result.Anchor.gameObject.transform.SetParent(ViewPositionElements.transform, false);
        }

        if (index == turbines.Count - 1)
        {
            CurrentState = ARLoadState.Ready;

            if (SettingUp != null)
            {
                SettingUp.SetActive(false);
            }
        }

        yield break;
    }

    private void UpdateStatusUI()
    {
        if (SettingUpStatus == null) return;

        string message = CurrentState switch
        {
            ARLoadState.WaitingForLocationPermission => "Requesting location permission...",
            ARLoadState.WaitingForLocation => "Starting location service...",
            ARLoadState.ARSessionInitializing => "Initializing AR session...",
            ARLoadState.Tracking => "Tracking position...",
            ARLoadState.LoadingTerrain => "Loading terrain...",
            ARLoadState.LoadingTurbines => "Placing turbines...",
            ARLoadState.Ready => "AR view is ready!",
            ARLoadState.Failed => "Something went wrong.",
            _ => "Preparing AR..."
        };

        SettingUpStatus.text = message;
    }

    private void OnEnable()
    {
        Debug.Log("Enabling ViewPosition and starting AR session.");

        if (SettingUp != null)
        {
            SettingUp.SetActive(true);
        }

        if (arSession != null)
        {
            arSession.enabled = true;
            CurrentState = ARLoadState.ARSessionInitializing;
        }

        locationServiceLauncher = StartCoroutine(StartLocationService());

        if (currentURL != null) InitURL(currentURL);
    }

    private void OnDisable()
    {
        Debug.Log("Disabling ViewPosition and stopping AR session.");

        // Stop location services
        if (locationServiceLauncher != null)
        {
            StopCoroutine(locationServiceLauncher);
            locationServiceLauncher = null;
            Input.location.Stop();
        }

        if (arSession != null)
        {
            Debug.Log("Stopping AR session.");
            arSession.Reset(); // Optional: clean tracking data
            arSession.enabled = false;
        }

        elementsInitialized = false;
    }

    private IEnumerator StartLocationService()
    {
        waitingForLocationService = true;
        CurrentState = ARLoadState.WaitingForLocationPermission;

#if UNITY_ANDROID
        if (!Permission.HasUserAuthorizedPermission(Permission.FineLocation))
        {
            Debug.Log("Requesting the fine location permission.");
            Permission.RequestUserPermission(Permission.FineLocation);
            while (!Permission.HasUserAuthorizedPermission(Permission.FineLocation))
            {
                yield return null; // Wait until user accepts
            }
        }
#endif

        if (!Input.location.isEnabledByUser)
        {
            waitingForLocationService = false;
            CurrentState = ARLoadState.Failed;
            yield break;
        }

        Debug.Log("Starting location service.");
        CurrentState = ARLoadState.WaitingForLocation;
        Input.location.Start();

        while (Input.location.status == LocationServiceStatus.Initializing)
        {
            yield return null;
        }

        waitingForLocationService = false;
        if (Input.location.status != LocationServiceStatus.Running)
        {
            Debug.Log($"Location service ended with {0} status {Input.location.status}");
            Input.location.Stop();
            CurrentState = ARLoadState.Failed;
        }
    }
}
