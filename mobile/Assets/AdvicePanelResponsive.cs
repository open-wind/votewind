using UnityEngine;
using UnityEngine.UI;

public class AdvicePanelResponsive : MonoBehaviour
{
    public RectTransform advicePanel;  // Assign your AdvicePanel RectTransform in the inspector
    public VerticalLayoutGroup layoutGroup;  // Assign your Vertical Layout Group

    public int landscapeIndent = 1200;
    public int portraitIndent = 100;

    void Update()
    {
        if (Mathf.Approximately((float)Screen.width / Screen.height, 1f))
        {
            // Square (unlikely, but fallback)
            SetIndent(portraitIndent);
        }
        else if (Screen.width > Screen.height)
        {
            // Landscape, regardless of left/right
            SetIndent(landscapeIndent);
        }
        else
        {
            // Portrait
            SetIndent(portraitIndent);
        }

    }

    void SetIndent(int indent)
    {
        // Adjust left/right offsets if anchors are stretch
        advicePanel.offsetMin = new Vector2(indent, advicePanel.offsetMin.y);  // Left
        advicePanel.offsetMax = new Vector2(-indent, advicePanel.offsetMax.y); // Right

        // (Optional) adjust layout group padding instead, if you'd rather
        // layoutGroup.padding.left = indent;
        // layoutGroup.padding.right = indent;
    }
}
