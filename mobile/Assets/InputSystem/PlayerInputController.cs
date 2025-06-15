using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

public class PlayerInputController : MonoBehaviour
{
    public ViewAsset ViewAsset;
    public Transform objectTransform;
    public float scaleMinimumSize = 0.5f;
    public float scaleMaximumSize = 50f;
    public float dragDelay = 0.2f;

    private float lastXPosition = 0f;
    private float lastYPosition = 0f;
    private float touchDownTime = 0;
    private float inputTimer;
    private float inputTimerDelay = 0.5f;
    private bool heightCheckRequired = false;

    private void Awake()
    {
        // Enable enhanced touch support if not already
        if (!EnhancedTouchSupport.enabled)
            EnhancedTouchSupport.Enable();
    }

    public void Pinch(InputAction.CallbackContext context)
    {
        inputTimer = 0;

        // if there are not two active touches, return
        if (Touch.activeTouches.Count < 2) return;

        // get the finger inputs
        Touch primary = Touch.activeTouches[0];
        Touch secondary = Touch.activeTouches[1];

        // check if none of the fingers moved, return
        if (primary.phase == TouchPhase.Moved || secondary.phase == TouchPhase.Moved)
        {
            // if fingers have no history, then return
            if (primary.history.Count < 1 || secondary.history.Count < 1) return;

            // calculate distance before and after touch movement
            float currentDistance = Vector2.Distance(primary.screenPosition, secondary.screenPosition);
            float previousDistance = Vector2.Distance(primary.history[0].screenPosition, secondary.history[0].screenPosition);

            // the zoom distance is the difference between the previous distance and the current distance
            float pinchDistance = currentDistance - previousDistance;
            Zoom(pinchDistance);
        }
    }

    public void Scroll(InputAction.CallbackContext context)
    {
        inputTimer = 0;

        if (context.phase != InputActionPhase.Performed) return;

        float scrollDistance = context.ReadValue<Vector2>().y;
        Zoom(scrollDistance);
    }

    public void Zoom(float distance)
    {
        inputTimer = 0;

        distance = distance * 1f;
        heightCheckRequired = true;
        ViewAsset.MoveCamera(new Vector3(0, 0, -distance), false);

        // // Prevent object being scaled smaller than scaleMinimumSize
        // if ((objectTransform.localScale.x + distance) < scaleMinimumSize) return;
        // // Prevent object being scaled larger than scaleMaximumSize
        // if ((objectTransform.localScale.x + distance) > scaleMaximumSize) return;
        // objectTransform.localScale += new Vector3(distance, distance, distance);
    }

    public void TapClick(InputAction.CallbackContext context)
    {
        inputTimer = 0;

        if (context.phase == InputActionPhase.Canceled)
        {
            touchDownTime = 0;
            lastXPosition = 0f;
            lastYPosition = 0f;
        } 
        if (context.phase == InputActionPhase.Performed) touchDownTime += Time.deltaTime;
    }

    public void Drag(InputAction.CallbackContext context)
    {
        inputTimer = 0;

        float mousePositionX = Input.mousePosition.x, mousePositionY = Input.mousePosition.y;

        if (touchDownTime < dragDelay) return;
        if (Touch.activeTouches.Count > 1) return;

        if (lastXPosition != 0f)
        {
            float deltaX = mousePositionX - lastXPosition;
            float deltaY = mousePositionY - lastYPosition;

            if (Mathf.Abs(deltaX) > Mathf.Abs(deltaY)) deltaY = 0;
            else deltaX = 0;
            heightCheckRequired = true;
            if ((deltaX != 0f) || (deltaY != 0f)) ViewAsset.MoveCamera(new Vector3(deltaX, deltaY, 0), true);

            // float objectWidth = 1000 * objectTransform.transform.localScale.x;            
            // float rotateAngle = 90 * (deltaX / objectWidth);
            // objectTransform.transform.Rotate(new Vector3(0, rotateAngle, 0), Space.Self);        
        }

        lastXPosition = mousePositionX;
        lastYPosition = mousePositionY;
    }

    void Start()
    {
        inputTimer = 0;
    }

    void Update()
    {
        inputTimer += Time.deltaTime;

        if ((inputTimer >= inputTimerDelay) && (heightCheckRequired))
        {
            StartCoroutine(ViewAsset.CheckUserHeight());
            inputTimer = 0;
            heightCheckRequired = false;
        }
    }

}