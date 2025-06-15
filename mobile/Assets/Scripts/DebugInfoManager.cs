using UnityEngine;
using TMPro;

public class DebugInfoManager : MonoBehaviour
{
    public static DebugInfoManager Instance;

    [SerializeField]
    private TextMeshProUGUI debugText;

    private void Awake()
    {
        Instance = this;
        if (debugText != null)
        {
            debugText.text = "";
        }
    }

    public static void Log(string message)
    {
        if (Instance != null && Instance.debugText != null)
        {
            Instance.debugText.text = message;
        }
    }
}
