import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useIsMobile } from "@/components/functions/helpers"

export default function LayerTogglePanel({ map }) {
  const [layerGroups, setLayerGroups] = useState([]);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  const desiredColorOrder = [
    'darkgrey',
    'purple',
    'darkgreen',
    'blue',
    'darkgoldenrod',
    'chartreuse',
    'red',
    'darkorange'
  ];

  useEffect(() => {
    if (!map) return;

    const layers = map.getStyle().layers
      .filter(l => l.source && l.id.startsWith('latest--'))
      .map(l => {
        const color = map.getPaintProperty(l.id, 'fill-color') || '#999';
        const visible = map.getLayoutProperty(l.id, 'visibility') !== 'none';
        return { id: l.id, color, visible };
      });

    const colorMap = {};
    for (const layer of layers) {
      if (!colorMap[layer.color]) {
        colorMap[layer.color] = [];
      }
      colorMap[layer.color].push(layer);
    }

    // Sort each group with visible layers first
    const sortedGroups = Object.entries(colorMap).map(([color, groupLayers]) => {
      const visibleFirst = [...groupLayers].sort((a, b) => {
        if (a.visible === b.visible) return 0;
        return a.visible ? -1 : 1;
      });
      return { color, layers: visibleFirst };
    });

    sortedGroups.sort((a, b) => {
      const aIdx = desiredColorOrder.indexOf(a.color);
      const bIdx = desiredColorOrder.indexOf(b.color);
      if (aIdx === -1 && bIdx === -1) return a.color.localeCompare(b.color);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });


    setLayerGroups(sortedGroups);
  }, [map]);

  const toggleLayer = (layerId) => {
    const isVisible = map.getLayoutProperty(layerId, 'visibility') !== 'none';
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'none' : 'visible');

    // Update internal state to re-render
    setLayerGroups(prev =>
      prev.map(group => ({
        ...group,
        layers: group.layers.map(l =>
          l.id === layerId ? { ...l, visible: !isVisible } : l
        ),
      }))
    );
  };

  return (
    <div className="absolute w-[200px] sm:w-64 overflow-y-auto top-16 left-4 sm:top-16 z-40 bg-white/90 rounded-lg shadow-md p-2 sm:p-3 max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-6rem)] mb-1 max-w-xs text-xs leading-none space-y-3">
   

      <div onClick={() => setIsOpen(prev => !prev)} className="flex items-center justify-between mb-0 cursor-pointer">
        <h4 className="text-sm font-semibold">Wind Constraints</h4>
        <button className="text-black hover:bg-gray-200 rounded-full p-0" aria-label="Toggle layer panel">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isOpen && (
      <>
      {layerGroups.map(group => (
        <div key={group.color}>
          {group.layers.map((layer, idx) => {
            const cleanName = layer.id
              .replace(/^latest--/, '')
              .replaceAll('separation-distance-from-residential', 'residential-separation')
              .replaceAll('windconstraints', 'all-wind-constraints')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());

            return (
              <label
                key={layer.id}
                className={`cursor-pointer flex items-center gap-1 mb-1 ${idx === 0 ? 'font-semibold' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  className="mr-1"
                />
                <span className="text-[0.7em] sm:text-[0.7rem] font-condensed truncate overflow-hidden text-ellipsis whitespace-nowrap">{cleanName}</span>
                <span
                  className="inline-block pl-3 w-3 h-3 rounded-full ml-auto"
                  style={{
                    backgroundColor: layer.color,
                    opacity: group.layers.length > 1 && idx !== 0 ? 0.6 : 1,
                  }}
                  />
              </label>
            );
          })}
        </div>
      ))}
      </>
      )}
    </div>
  );
}
