using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using Unity.XR.CoreUtils;
using CesiumForUnity;
using DotNetCoords;
using TMPro;

static class Constants
{
    public const double TURBINEAREABUFFER = 300;
    public const double TARGETRADIUS = 0.6;
}

public static class JsonHelper
{
    public static T[] FromJson<T>(string json)
    {
        Wrapper<T> wrapper = JsonUtility.FromJson<Wrapper<T>>(json);
        return wrapper.Items;
    }

    public static string ToJson<T>(T[] array)
    {
        Wrapper<T> wrapper = new Wrapper<T>();
        wrapper.Items = array;
        return JsonUtility.ToJson(wrapper);
    }

    public static string ToJson<T>(T[] array, bool prettyPrint)
    {
        Wrapper<T> wrapper = new Wrapper<T>();
        wrapper.Items = array;
        return JsonUtility.ToJson(wrapper, prettyPrint);
    }

    [Serializable]
    private class Wrapper<T>
    {
        public T[] Items;
    }
}

[Serializable]
public class MetricCoordinatePair: System.Object 
{
    public float easting;
    public float northing;

    public MetricCoordinatePair(float initEasting, float initNorthing)
    {
        easting = initEasting;
        northing = initNorthing;
    }
}

[Serializable]
public class Properties: System.Object 
{
    public string name;
    // public bool manuallyadded;
    // public float hubheight;
    // public float bladeradius;
}

[Serializable]
public class Geometry: System.Object 
{
    public string type;
    public float[] coordinates;
}

[Serializable]
public class Feature: System.Object
{
    public string type;
    public Properties properties;
    public Geometry geometry;
}

[Serializable]
public class CRSProperties: System.Object 
{
    public string name;
}

[Serializable]
public class CRS: System.Object 
{
    public string type;
    public CRSProperties properties;
}

[Serializable]
public class FeatureCollection: System.Object
{
    public string type;
    // public string name;
    // public CRS crs;
    public Feature[] features;
}

public class ViewAsset : MonoBehaviour
{
    public      TMP_Text            LogText;
    public      Views               Views;
    public      ARRaycastManager    _RaycastManager;
    public      GameObject          _ViewAssetAR;
    public      GameObject          _UIElements;
    public      GameObject          _UIScanPlane;
    public      GameObject          ViewElements;
    public      CesiumGeoreference  cesiumGeoreference;
    public      Material            cesiumRadialClippingMaterial;
    public      Shader              cesiumRadialClippingShader;
    public      Cesium3DTileset     cesium3DTileset;

    // OriginVerticalOffset and OriginHorizontalOffset represent 
    // viewing position offset from southmost latitude, centre longitude
    // Note OriginVerticalOffset and OriginHorizontalOffset should always 
    // be positive values representing height above ground and distance 
    // south of southmost latitude respectively
    // public float OriginVerticalOffset = 1.5f;
    public float OriginVerticalOffset = 20f;
    public float OriginHorizontalOffset = 500f;

    private UTMRef OriginUtm;
    private double OriginGroundHeight = 0f;

    List<ARRaycastHit> m_Hits = new List<ARRaycastHit>();

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
    }

    public IEnumerator ProcessGeoJSON(string GeoJSON)
    {
        Debug.LogError("Force the build console open...");

        FeatureCollection featureCollection = JsonUtility.FromJson<FeatureCollection>(GeoJSON);
        Debug.Log(featureCollection.type);

        // string projection = featureCollection.crs.properties.name;
        string projection = "";

        List<LatLng> latlonCoordinates = new List<LatLng>();
        List<MetricCoordinatePair> metricCoordinates = new List<MetricCoordinatePair>();

        double centreLatitude = 0f, centreLongitude = 0f, numInstances = 0;
        Nullable<double> southmostLatitude = null;

        for(int index = 0; index < featureCollection.features.Length; index++)
        {
            Feature feature = featureCollection.features[index];
            LatLng latLng = null;

            switch(projection)
            {
                case "urn:ogc:def:crs:EPSG::27700": // OS
                    OSRef osRef = new OSRef(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
                    latLng = osRef.ToLatLng();                
                    break;
                case "urn:ogc:def:crs:EPSG::2157": // ITM
                    IrishRef irishRef = new IrishRef(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
                    latLng = irishRef.ToLatLng();                
                    break;
                case "urn:ogc:def:crs:OGC:1.3:CRS84": // 
                default:
                    latLng = new LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                    break;
            }

            if (latLng != null) 
            {
                latlonCoordinates.Add(latLng);
                if (southmostLatitude == null) southmostLatitude = latLng.Latitude;
                else if (latLng.Latitude < southmostLatitude) southmostLatitude = latLng.Latitude;
                centreLatitude += latLng.Latitude;
                centreLongitude += latLng.Longitude;
                numInstances += 1;
            }
        }

        centreLatitude /= numInstances;
        centreLongitude /= numInstances;
        LatLng centreLatLng = new LatLng(centreLatitude, centreLongitude);
        LatLng southmostLatLng = new LatLng((double)southmostLatitude, centreLongitude);
        OriginUtm = southmostLatLng.ToUtmRef();
        double OriginUtm_Northing = OriginUtm.Northing - OriginHorizontalOffset;
        OriginUtm = new UTMRef(OriginUtm.LngZone, OriginUtm.LatZone, OriginUtm.Easting, OriginUtm_Northing);
        LatLng OriginLatLng = OriginUtm.ToLatLng();

        Debug.Log("Origin: " + OriginLatLng.Longitude.ToString() + "," + OriginLatLng.Latitude.ToString());

        double maxDistance = 0f;
        for(int index = 0; index < latlonCoordinates.Count; index++)
        {
            double distance = 1000 * centreLatLng.Distance(latlonCoordinates[index]);
            if (distance > maxDistance) maxDistance = distance;
        }

        Debug.Log("Distance to most remote turbine: " + maxDistance.ToString());

        double areaRadius = Constants.TURBINEAREABUFFER + maxDistance;
        float scaleFactor = (float)(Constants.TARGETRADIUS / areaRadius);

        // Set radius of focus area - uses material shader
        // SetMaterialShaderRadius((float)areaRadius);
        // LoadMaterialShader();

        // Setup Origin position using OriginLatLng
        double3[] Originpoint = new double3[1];    
        Originpoint[0] = new double3(OriginLatLng.Longitude, OriginLatLng.Latitude, 0);
        Task<CesiumSampleHeightResult> OriginMapTask = cesium3DTileset.SampleHeightMostDetailed(Originpoint);
        yield return new WaitForTask(OriginMapTask);
            
        CesiumSampleHeightResult Originresult = OriginMapTask.Result;
        double centreheight = 0;
        if ((Originresult != null) && (Originresult.sampleSuccess.Length == 1) && (Originresult.sampleSuccess[0]))
        {
            OriginGroundHeight = Originresult.longitudeLatitudeHeightPositions[0][2];
            centreheight = OriginVerticalOffset + OriginGroundHeight;
        }

        cesiumGeoreference.latitude = OriginLatLng.Latitude;
        cesiumGeoreference.longitude = OriginLatLng.Longitude;
        cesiumGeoreference.height = centreheight;

        double3[] points = new double3[latlonCoordinates.Count];    
        for(int index = 0; index < latlonCoordinates.Count; index++)
        {
            points[index] = new double3(latlonCoordinates[index].Longitude, latlonCoordinates[index].Latitude, 0);
        }

        Task<CesiumSampleHeightResult> terrainTask = cesium3DTileset.SampleHeightMostDetailed(points);
        yield return new WaitForTask(terrainTask);
            
        foreach(Transform child in ViewElements.transform)
        {
            Destroy(child.gameObject);
        }

        CesiumSampleHeightResult result = terrainTask.Result;
        if (result != null)
        {
            UnityEngine.Object turbinePrefabReference = Resources.Load("windturbine_prefab");
            UTMRef utmCentre = centreLatLng.ToUtmRef();

            for (int index = 0; index < result.sampleSuccess.Length; index++)
            {
                if (result.sampleSuccess[index]) 
                {
                    Feature feature = featureCollection.features[index];
                    double3 longitudeLatitudeHeightPositions = result.longitudeLatitudeHeightPositions[index];
                    LatLng currentLatLng = new LatLng(longitudeLatitudeHeightPositions[1], longitudeLatitudeHeightPositions[0]);
                    UTMRef utmCurrent = currentLatLng.ToUtmRef();
                    double deltaEasting = utmCurrent.Easting - OriginUtm.Easting;
                    double deltaNorthing = utmCurrent.Northing - OriginUtm.Northing;
                    double height = longitudeLatitudeHeightPositions[2] - centreheight;
                    GameObject turbine = Instantiate(turbinePrefabReference) as GameObject;
                    turbine.name = "Turbine " + index.ToString();        
                    turbine.transform.position = new Vector3((float)deltaEasting, (float)height, (float)deltaNorthing);
                    turbine.transform.SetParent(ViewElements.transform, false);
                    float hubheight = 80;
                    float bladeradius = 45;
                    turbine.gameObject.GetComponent<windturbine>().Init(hubheight, bladeradius);
                }
            }
        }

        // cesiumGeoreference.gameObject.transform.localScale = new Vector3(scaleFactor, scaleFactor, scaleFactor);
    }

    IEnumerator GetRequest(string uri)
    {
        using (UnityWebRequest webRequest = UnityWebRequest.Get(uri))
        {
            // Request and wait for the desired page.
            yield return webRequest.SendWebRequest();

            string[] pages = uri.Split('/');
            int page = pages.Length - 1;

            switch (webRequest.result)
            {
                case UnityWebRequest.Result.ConnectionError:
                case UnityWebRequest.Result.DataProcessingError:
                    Debug.LogError(pages[page] + ": Error: " + webRequest.error);
                    break;
                case UnityWebRequest.Result.ProtocolError:
                    Debug.LogError(pages[page] + ": HTTP Error: " + webRequest.error);
                    break;
                case UnityWebRequest.Result.Success:
                    // Debug.Log(pages[page] + ":\nReceived: " + webRequest.downloadHandler.text);
                    yield return ProcessGeoJSON(webRequest.downloadHandler.text);
                    break;
            }
        }
    }

    void Enable()
    {
        _UIScanPlane.SetActive(true);
        Resources.FindObjectsOfTypeAll<XROrigin>()[0].gameObject.GetComponent<ARPlaneManager>().enabled = true;
        _ViewAssetAR.SetActive(false);
    }

    void Disable()
    {
        _UIScanPlane.SetActive(false);
        Resources.FindObjectsOfTypeAll<XROrigin>()[0].gameObject.GetComponent<ARPlaneManager>().enabled = false;
        _ViewAssetAR.SetActive(false);
    }

    void SetMaterialShaderPosition(Vector3 newPosition)
    {
        cesiumRadialClippingMaterial.SetVector("_clippingOrigin", newPosition);
    }

    void SetMaterialShaderRadius(float radius)
    {
        cesiumRadialClippingMaterial.SetFloat("_clippingRadius", radius);

    }

    void LoadMaterialShader()
    {
        cesium3DTileset.opaqueMaterial = null;
        cesium3DTileset.opaqueMaterial = cesiumRadialClippingMaterial;
    }

    public void OnTrackablesChanged(ARTrackablesChangedEventArgs<ARPlane> arChanges)
    {
        foreach (var arPlane in arChanges.added)
        {
            this.HorizontalPlaneFound(arPlane);
        }
    }

    public IEnumerator CheckUserHeight()
    {
        Vector3 CameraPosition = _ViewAssetAR.transform.position;
        double Easting = OriginUtm.Easting + CameraPosition[0];
        double Height = OriginGroundHeight + OriginVerticalOffset - CameraPosition[1];
        double Northing = OriginUtm.Northing + CameraPosition[2];
        UTMRef CameraUtm = new UTMRef(OriginUtm.LngZone, OriginUtm.LatZone, Easting, Northing);
        LatLng cameraLatLng = CameraUtm.ToLatLng();

        // Setup camera position using cameraLatLng
        double3[] camerapoint = new double3[1];    
        camerapoint[0] = new double3(cameraLatLng.Longitude, cameraLatLng.Latitude, 0);
        Task<CesiumSampleHeightResult> cameraMapTask = cesium3DTileset.SampleHeightMostDetailed(camerapoint);
        yield return new WaitForTask(cameraMapTask);
            
        CesiumSampleHeightResult cameraresult = cameraMapTask.Result;
        double centreheight = 0;
        if ((cameraresult != null) && (cameraresult.sampleSuccess.Length == 1) && (cameraresult.sampleSuccess[0]))
        {
            double newCameraGroundHeight = cameraresult.longitudeLatitudeHeightPositions[0][2];
            newCameraGroundHeight += 1;
            // Ensure we never go below ground level
            // Debug.Log("newCameraGroundHeight: " + newCameraGroundHeight.ToString() + " OriginGroundHeight: " + OriginGroundHeight.ToString() + " Desired height: " + Height.ToString());
            // Only update height if current height is below ground level
            if ((newCameraGroundHeight) > Height) 
            {
                Height = newCameraGroundHeight;
                Height -= (OriginGroundHeight + OriginVerticalOffset);
                _ViewAssetAR.transform.position = new Vector3(CameraPosition[0], -(float)Height, CameraPosition[2]);
            }
        }
    }

    public void MoveCamera(Vector3 translation, bool useXRotation)
    {
        if (useXRotation)
        {
            translation = Quaternion.Euler(Camera.main.transform.localEulerAngles.x, Camera.main.transform.localEulerAngles.y, Camera.main.transform.localEulerAngles.z) * translation;
        }
        else
        {
            translation = Quaternion.Euler(0, Camera.main.transform.localEulerAngles.y, Camera.main.transform.localEulerAngles.z) * translation;
        }
        Vector3 CameraPosition = _ViewAssetAR.transform.position;
        CameraPosition = new Vector3(CameraPosition[0] + translation[0], CameraPosition[1] + translation[1], CameraPosition[2] + translation[2]);
        double Easting = OriginUtm.Easting + CameraPosition[0];
        double Height = OriginGroundHeight + OriginVerticalOffset - CameraPosition[1];
        double Northing = OriginUtm.Northing + CameraPosition[2];
        UTMRef CameraUtm = new UTMRef(OriginUtm.LngZone, OriginUtm.LatZone, Easting, Northing);
        LatLng cameraLatLng = CameraUtm.ToLatLng();

        // Make sure height isn't below sea level as basic check on acceptable height
        if (Height < 0) Height = 0;

        Height -= (OriginGroundHeight + OriginVerticalOffset);

        _ViewAssetAR.transform.position = new Vector3(CameraPosition[0], -(float)Height, CameraPosition[2]);
    }

    public void HorizontalPlaneFound(ARPlane arPlane)
    {
        // Horizontal plane found, disabling ARPlaneManager and related UI
        XROrigin origin = Resources.FindObjectsOfTypeAll<XROrigin>()[0];
        origin.gameObject.GetComponent<ARPlaneManager>().enabled = false;
        _UIScanPlane.SetActive(false);

        Vector3 centrePosition = new Vector3(Screen.width / 2, Screen.height / 2, 0);
        Ray ray = Camera.main.ScreenPointToRay(centrePosition);
        float enter = 0.0f;
        if (arPlane.infinitePlane.Raycast(ray, out enter))
        {
            Vector3 hitPoint = ray.GetPoint(enter);
        }
    }

    public void StartViewAsset(Vector3 hitPoint, string assetURL)
    {
        _ViewAssetAR.transform.position = hitPoint;

        // var scale = 0.5f * Vector3.Distance(Camera.main.transform.position, hitPoint);
        // _ViewAssetAR.transform.localScale = new Vector3(scale, scale, scale);

        // SetMaterialShaderPosition(new Vector3(hitPoint.x, 0, hitPoint.z));

        _ViewAssetAR.SetActive(true);

        StartCoroutine(GetRequest(assetURL));

        _UIElements.SetActive(true);
    }

    public void Init(string assetURL)
    {
        // Views.SetView(Views.View.ViewAsset);
        // LogText.SetText(assetURL);
        // StartViewAsset(new Vector3(0f, 0f, 0f), assetURL);
    }

    public void InitAssetID(string assetID)
    {
        string assetURL = Views.AssetURL + assetID;
        Init(assetURL);
    }

}
