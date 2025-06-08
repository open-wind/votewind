import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/components/functions/helpers"
import { TurbineHeightModal } from '@/components/turbineheight-modal';
import { TURBINE_HEIGHTTOTIP_DEFAULT, LAYERS_HEIGHTTOTIP_SPECIFIC, TILESERVER_BASEURL } from '@/lib/config';

export default function LayerTogglePanel({ map }) {
  const [layerGroups, setLayerGroups] = useState([]);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [selectedHeight, setSelectedHeight] = useState(TURBINE_HEIGHTTOTIP_DEFAULT);
  const [modalOpen, setModalOpen] = useState(false);

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

  const replaceVectorSourceUrl = (map, layerId, newUrl) => {
    const sourceId = layerId;

    // Ensure map style is loaded
    const layers = map.getStyle()?.layers;
    if (!layers) {
      console.warn('Map style not ready');
      return;
    }

    // Find index and layer definition
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1) {
      console.warn(`Layer '${layerId}' not found`);
      return;
    }

    const oldLayer = layers[index];
    const beforeLayerId = layers[index + 1]?.id;

    // Remove existing layer and source
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add updated source
    map.addSource(sourceId, {
      type: 'vector',
      url: newUrl,
      attribution: "Source data copyright of multiple organisations. For all data sources, see <a href=\"https://data.openwind.energy\" target=\"_blank\">data.openwind.energy</a>"
    });

    // Add the layer back with its old configuration
    map.addLayer({
      ...oldLayer,
      source: sourceId
    }, beforeLayerId);
  }

  useEffect(() => {
    // Change layer url to use specific turbine height-to-tip vector source

    if (!map) return;
    for (const layer_id of LAYERS_HEIGHTTOTIP_SPECIFIC) {
      const new_url = TILESERVER_BASEURL + '/data/' + layer_id + '--' + String(selectedHeight).padStart(3, '0') + '.json';
      replaceVectorSourceUrl(map, layer_id, new_url);
    }

  }, [selectedHeight]);

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
  <>
  <div className="absolute w-[200px] sm:w-64 overflow-y-auto top-16 left-4 sm:top-16 z-40 bg-white/100 rounded-lg shadow-md p-2 sm:p-3 max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-6rem)] mb-1 max-w-xs text-xs leading-none space-y-3">
   
      <div onClick={() => setIsOpen(prev => !prev)} className="flex items-center justify-between mb-0 cursor-pointer">
        <h4 className="text-sm font-semibold">Wind Constraints</h4>
        <button className="text-black hover:bg-gray-200 rounded-full p-0" aria-label="Toggle layer panel">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isOpen && (
      <>
      <div className="flex items-center space-x-2 mt-4 text-[0.9em] md:text-xs font-condensed">
        <span>Turbine Height to Tip: <strong>{selectedHeight ? `${selectedHeight}m` : "None"}</strong></span>

          <TooltipProvider>
            <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setModalOpen(true)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Change turbine height"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                Change turbine height-to-tip
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>

      </div>

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
                    opacity: group.layers.length > 1 && idx !== 0 ? 0.3 : 0.6,
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

    <TurbineHeightModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      selected={selectedHeight}
      onSelect={setSelectedHeight}
    />

    </>

  );
}
