using UnityEngine;
using ZXing;
using System.Collections;
using UnityEngine.UI;

public class ViewQR : MonoBehaviour
{
    public CameraFeed cameraFeed;           // Camera manager
    public Views views;                      // App logic
    public RectTransform scanBoxRect;       // Scan area in UI

    private IBarcodeReader barcodeReader;
    private Coroutine scanLoopCoroutine;
    private string lastResult = "";

    void OnEnable()
    {
        barcodeReader = new BarcodeReader
        {
            AutoRotate = false,
            Options = new ZXing.Common.DecodingOptions
            {
                TryHarder = true
            }
        };

        cameraFeed.StartCamera();
        scanLoopCoroutine = StartCoroutine(ScanLoop());
    }

    void OnDisable()
    {
        if (scanLoopCoroutine != null)
        {
            StopCoroutine(scanLoopCoroutine);
            scanLoopCoroutine = null;
        }

        cameraFeed.StopCamera();
        lastResult = "";
    }

    IEnumerator ScanLoop()
    {
        while (true)
        {
            yield return StartCoroutine(ScanFrame());
            yield return new WaitForSeconds(2.0f);
        }
    }

    IEnumerator ScanFrame()
    {
        yield return new WaitForEndOfFrame();

        if (cameraFeed == null) yield break;

        Texture2D image = null;
        try
        {
            image = cameraFeed.GetCurrentFrame();
            if (image == null) yield break;

            var result = barcodeReader.Decode(image.GetPixels32(), image.width, image.height);

            if (result != null && result.Text != lastResult)
            {
                if (IsValidVoteWindQR(result, image.width, image.height))
                {
                    lastResult = result.Text;
                    Debug.Log("✅ Reliable QR inside box: " + result.Text);
                    views.InitViewPosition(result.Text);
                }
                else
                {
                    Debug.Log("⚠️ QR detected but outside scan box or invalid format.");
                }
            }
        }
        catch (System.Exception e)
        {
            Debug.LogWarning($"⚠️ ScanFrame error: {e.Message}");
        }
        finally
        {
            if (image != null)
                Destroy(image);
        }
    }

    bool IsValidVoteWindQR(Result result, int texWidth, int texHeight)
    {
        if (result == null || result.ResultPoints == null || result.ResultPoints.Length < 3)
            return false;

        if (!result.Text.StartsWith("https://votewind.org/ar/"))
            return false;

        foreach (var pt in result.ResultPoints)
        {
            Vector2 screenPos = ConvertCameraToScreen(new Vector2(pt.X, pt.Y), texWidth, texHeight);
            if (!RectTransformUtility.RectangleContainsScreenPoint(scanBoxRect, screenPos, null))
                return false;
        }

        return true;
    }

    Vector2 ConvertCameraToScreen(Vector2 point, int texWidth, int texHeight)
    {
        float viewportX = point.x / texWidth;
        float viewportY = 1.0f - (point.y / texHeight); // Y flipped
        return new Vector2(viewportX * Screen.width, viewportY * Screen.height);
    }
}
