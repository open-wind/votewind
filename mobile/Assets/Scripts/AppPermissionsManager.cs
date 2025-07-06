using UnityEngine;
using UnityEngine.Android; // Crucial for Permission class

public class AppPermissionsManager : MonoBehaviour
{
    private const string CAMERA_PERMISSION = Permission.Camera;
    private const string MICROPHONE_PERMISSION = Permission.Microphone;
    private const string FINE_LOCATION_PERMISSION = Permission.FineLocation;
    private const string COARSE_LOCATION_PERMISSION = Permission.CoarseLocation;

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

    void Start()
    {
        Debug.Log("Checking and requesting permissions...");
        RequestAllRequiredPermissions();
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
        }
        else
        {
            Debug.LogWarning("Some required permissions are NOT granted.");
            // Optionally, prompt the user to enable them in settings, or disable related features.
            // You might show a UI message here.
        }
    }

    // You can also use explicit callbacks if you need to react immediately to a single permission result
    // For example, if you only request Camera right before recording:
    public void RequestCameraOnly()
    {
        if (!Permission.HasUserAuthorizedPermission(CAMERA_PERMISSION))
        {
            var callbacks = new PermissionCallbacks();
            callbacks.PermissionGranted += (perm) => { Debug.Log($"{perm} Granted"); /* Start Camera activity */ };
            callbacks.PermissionDenied += (perm) => { Debug.LogWarning($"{perm} Denied"); /* Show error message */ };
            callbacks.PermissionDeniedAndDontAskAgain += (perm) => { Debug.LogError($"{perm} Denied permanently. Guide user to settings."); /* Show message and link to settings */ };

            Permission.RequestUserPermission(CAMERA_PERMISSION, callbacks);
        }
        else
        {
            Debug.Log("Camera permission already granted, ready to use.");
        }
    }
}