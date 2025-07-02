import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function Marker(props) {
  var map = props.map;
  var longitude = props.longitude;
  var latitude = props.latitude;
  var anchor = props.anchor || 'center';
  var offset = props.offset || [0, 0];
  var draggable = props.draggable || false;
  var onDragStart = props.onDragStart;
  var onDragEnd = props.onDragEnd;
  var children = props.children;

  var markerRef = useRef(null);
  var elRef = useRef(document.createElement('div'));

  useEffect(function () {
    if (!map || !window.maplibregl) return;

    var marker = new window.maplibregl.Marker({
      element: elRef.current,
      anchor: anchor,
      offset: offset,
      draggable: draggable
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    if (onDragStart) {
      marker.on('dragstart', function (e) {
        onDragStart({
          lngLat: marker.getLngLat(),
          originalEvent: e
        });
      });
    }

    if (onDragEnd) {
      marker.on('dragend', function (e) {
        onDragEnd({
          lngLat: marker.getLngLat(),
          originalEvent: e
        });
      });
    }

    return function () {
      marker.remove();
      markerRef.current = null;
    };
  }, [map]);

  useEffect(function () {
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [longitude, latitude]);

  useEffect(function () {
    if (markerRef.current) {
      markerRef.current.setDraggable(draggable);
    }
  }, [draggable]);

  return ReactDOM.createPortal(children, elRef.current);
}
