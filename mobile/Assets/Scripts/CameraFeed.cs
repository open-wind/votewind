using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class CameraFeed : MonoBehaviour
{
    public RawImage rawImage;
    private WebCamTexture camTexture;
    private AspectRatioFitter aspectRatioFitter;

    // ✅ Adjustable scan hole size (e.g. 0.33 = 33% of frame width)
    private const float ScanHoleRelativeSize = 0.5f;

    private List<Vector2Int> resolutionsToTry = new List<Vector2Int>
    {
        new Vector2Int(1920, 1080),
        new Vector2Int(1280, 720),
        new Vector2Int(1024, 576),
        new Vector2Int(800, 600),
        new Vector2Int(640, 480)
    };

    public void StartCamera()
    {
        if (camTexture != null && camTexture.isPlaying)
            return;

        StartCoroutine(CheckPermissionsAndInitializeCamera());
    }

    public void StopCamera()
    {
        if (camTexture != null)
        {
            if (camTexture.isPlaying)
                camTexture.Stop();
            camTexture = null;
        }

        if (rawImage != null)
        {
            rawImage.texture = null;
        }
    }

    IEnumerator CheckPermissionsAndInitializeCamera()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Camera))
        {
            Debug.LogWarning("🛑 Camera permission not granted — requesting...");
            UnityEngine.Android.Permission.RequestUserPermission(UnityEngine.Android.Permission.Camera);
            yield break;
        }
#endif
        yield return StartCoroutine(InitializeCamera());
    }

    IEnumerator InitializeCamera()
    {
        var devices = WebCamTexture.devices;

        WebCamDevice? rearCamera = null;
        foreach (var device in devices)
        {
            if (!device.isFrontFacing)
            {
                rearCamera = device;
                break;
            }
        }

        if (rearCamera == null)
        {
            Debug.LogError("❌ No rear-facing camera found.");
            yield break;
        }

        string deviceName = rearCamera.Value.name;

        foreach (var res in resolutionsToTry)
        {
            camTexture = new WebCamTexture(deviceName, res.x, res.y, 30);
            camTexture.Play();

            yield return new WaitUntil(() => camTexture.width > 100);

            if (Mathf.Abs(camTexture.width - res.x) < 100)
            {
                Debug.Log($"✅ Using resolution: {camTexture.width}x{camTexture.height}");
                break;
            }

            camTexture.Stop();
        }

        if (rawImage != null)
        {
            rawImage.texture = camTexture;
            rawImage.material.mainTexture = camTexture;
        }

        aspectRatioFitter = rawImage.GetComponent<AspectRatioFitter>();
    }

    void Update()
    {
        if (camTexture != null && camTexture.width > 100)
        {
            float videoRatio = (float)camTexture.width / camTexture.height;
            if (aspectRatioFitter != null)
                aspectRatioFitter.aspectRatio = videoRatio;

            rawImage.rectTransform.localEulerAngles = new Vector3(0, 0, -camTexture.videoRotationAngle);
            rawImage.rectTransform.localScale = new Vector3(
                camTexture.videoVerticallyMirrored ? -1 : 1,
                1,
                1
            );
        }
    }

    // ✅ Gets the full current camera frame as a Texture2D
    public Texture2D GetCurrentFrame()
    {
        if (camTexture == null || !camTexture.isPlaying || camTexture.width < 100)
            return null;

        Texture2D snap = new Texture2D(camTexture.width, camTexture.height, TextureFormat.RGB24, false);
        snap.SetPixels(camTexture.GetPixels());
        snap.Apply();
        return snap;
    }

    // ✅ Gets only the center square region using the default relative size
    public Texture2D GetCentralFrameRegion()
    {
        return GetCentralFrameRegion(ScanHoleRelativeSize);
    }

    private Texture2D RotateTexture(Texture2D source, int angle)
    {
        Color[] srcPixels = source.GetPixels();
        int srcWidth = source.width;
        int srcHeight = source.height;

        Texture2D result;

        switch (angle)
        {
            case 90:
                result = new Texture2D(srcHeight, srcWidth);
                for (int y = 0; y < srcHeight; y++)
                    for (int x = 0; x < srcWidth; x++)
                        result.SetPixel(y, srcWidth - 1 - x, srcPixels[y * srcWidth + x]);
                break;

            case 180:
                result = new Texture2D(srcWidth, srcHeight);
                for (int y = 0; y < srcHeight; y++)
                    for (int x = 0; x < srcWidth; x++)
                        result.SetPixel(srcWidth - 1 - x, srcHeight - 1 - y, srcPixels[y * srcWidth + x]);
                break;

            case 270:
                result = new Texture2D(srcHeight, srcWidth);
                for (int y = 0; y < srcHeight; y++)
                    for (int x = 0; x < srcWidth; x++)
                        result.SetPixel(srcHeight - 1 - y, x, srcPixels[y * srcWidth + x]);
                break;

            default:
                return source; // No rotation
        }

        result.Apply();
        return result;
    }

    public Texture2D GetCentralFrameRegion(float relativeSize)
    {
        if (camTexture == null || !camTexture.isPlaying || camTexture.width < 100)
            return null;

        int width = camTexture.width;
        int height = camTexture.height;

        int baseSize = Mathf.RoundToInt(height * relativeSize);
        int cropWidth = baseSize;
        int cropHeight = baseSize;
        int startX = (width - cropWidth) / 2;
        int startY = (height - cropHeight) / 2;

        Color[] fullPixels = camTexture.GetPixels();
        Color[] croppedPixels = new Color[cropWidth * cropHeight];

        for (int y = 0; y < cropHeight; y++)
        {
            for (int x = 0; x < cropWidth; x++)
            {
                int sourceX = startX + x;
                int sourceY = startY + y;
                int sourceIndex = sourceY * width + sourceX;
                int destIndex = y * cropWidth + x;

                if (sourceIndex < fullPixels.Length)
                    croppedPixels[destIndex] = fullPixels[sourceIndex];
            }
        }

        // Create and apply the cropped square
        Texture2D cropped = new Texture2D(cropWidth, cropHeight, TextureFormat.RGB24, false);
        cropped.SetPixels(croppedPixels);
        cropped.Apply();

        // Rotate based on videoRotationAngle
        return RotateTexture(cropped, camTexture.videoRotationAngle);
    }

}
