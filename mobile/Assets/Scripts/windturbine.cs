using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class windturbine : MonoBehaviour
{
    [SerializeField]
    private float _hubHeight = 1.0f;

    [SerializeField]
    private float _bladeRadius = 1.0f;

    private float _bladeOffset = -0.045f;
    private float _degreesPerSecond = -120.0f;
    private float _initialRotation = 0.0f;

    public void Init(float hubHeight, float bladeRadius)
    {
        _hubHeight = hubHeight;
        _bladeRadius = bladeRadius;
        UpdateTurbineSizes();
    }

    private float InitialRotation() 
    {
        return Random.Range(0.0f, 360.0f);
    }

    private GameObject GetTurbineTower()
    {
        return this.gameObject.transform.Find("windturbine_tower").gameObject;
    }

    private GameObject GetTurbineBlades()
    {
        return this.gameObject.transform.Find("windturbine_blades").gameObject;
    }

    private void UpdateTurbineSizes()
    {
        GameObject turbineTower = GetTurbineTower();
        GameObject turbineBlades = GetTurbineBlades();
        turbineTower.transform.localScale = new Vector3(_hubHeight, _hubHeight, _hubHeight);
        turbineBlades.transform.localScale = new Vector3(_bladeRadius, _bladeRadius, _bladeRadius);
        turbineBlades.transform.localPosition = new Vector3((_bladeOffset * _hubHeight), _hubHeight, 0);
    }

    // Start is called before the first frame update
    void Start()
    {
        _initialRotation = InitialRotation();
        GetTurbineBlades().transform.localRotation = Quaternion.Euler(_initialRotation, 0, 0);        
    }

    private void OnValidate() 
    {
        UpdateTurbineSizes();
    }

    // Update is called once per frame
    void Update()
    {
        GetTurbineBlades().transform.Rotate(new Vector3((_degreesPerSecond * Time.deltaTime), 0, 0), Space.Self);        
    }
}
