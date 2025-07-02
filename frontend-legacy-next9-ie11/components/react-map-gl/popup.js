import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function Popup(props) {
  var mapRef = props.mapRef;
  var longitude = props.longitude;
  var latitude = props.latitude;
  var children = props.children;
  var closeButton = props.closeButton !== undefined ? props.closeButton : true;
  var closeOnClick = props.closeOnClick !== undefined ? props.closeOnClick : true;
  var anchor = props.anchor || 'bottom';
  var offset = props.offset || 0;
  var className = props.className || '';
  var onClose = props.onClose;

  var popupRef = useRef(null);
  var containerRef = useRef(document.createElement('div'));

  useEffect(function () {
    if (!mapRef || !mapRef.current || !mapRef.current.getMap) return;
    if (!window.maplibregl) {
      console.error('MapLibre GL is not loaded');
      return;
    }

    var mapInstance = mapRef.current.getMap();
    if (!mapInstance) return;

    var popup = new window.maplibregl.Popup({
      closeButton: closeButton,
      closeOnClick: closeOnClick,
      anchor: anchor,
      offset: offset,
      className: className
    })
      .setLngLat([longitude, latitude])
      .setDOMContent(containerRef.current)
      .addTo(mapInstance);

    if (onClose) {
      popup.on('close', onClose);
    }

    popupRef.current = popup;

    return function () {
      popup.remove();
      popupRef.current = null;
    };
  }, [mapRef, longitude, latitude, closeButton, closeOnClick, anchor, offset, className, onClose]);

  return ReactDOM.createPortal(children, containerRef.current);
}
