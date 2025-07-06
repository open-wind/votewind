using System;
using UnityEngine;

public class VoteWindURL
{
    public double Longitude;
    public double Latitude;
    public double HubHeight;
    public double BladeRadius;

    public VoteWindURL(double longitude, double latitude, double hubheight, double bladeradius)
    {
        Longitude = longitude;
        Latitude = latitude;
        HubHeight = hubheight;
        BladeRadius = bladeradius;
    }
}

public static class VoteWindURLParser
{
    public static VoteWindURL Parse(string url)
    {
        try
        {
            Uri uri = new Uri(url);

            // Only accept votewind.org 
            if (uri.Host != "votewind.org") return null;

            string[] segments = uri.AbsolutePath.Trim('/').Split('/');

            // Check whether https://votewind.org/ar/[longitude]/[latitude]/[hubheight]/[bladeradius]
            if (segments.Length == 5) {
                if (segments[0].ToLower() != "ar") return null;

                if (double.TryParse(segments[1], out double longitude) &&
                    double.TryParse(segments[2], out double latitude) && 
                    double.TryParse(segments[3], out double hubheight) && 
                    double.TryParse(segments[4], out double bladeradius))
                {
                    return new VoteWindURL(longitude, latitude, hubheight, bladeradius);
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            Debug.LogWarning("VoteWind URL parse failed: " + ex.Message);
        }

        return null;
    }
}
