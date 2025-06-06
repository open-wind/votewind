'use client';

export const TurbineHeightModal = ({ open, onClose, selected, onSelect }) => {
  const heights = [90, 100, 125, 150, 175, 200, 225, 250];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 isolate bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-[250px] sm:max-w-[330px] p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-md sm:text-lg font-semibold">Select Turbine Height to Tip</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-black text-xl">&times;</button>
        </div>
        <ul className="space-y-2">
          {heights.map((height) => (
            <li key={height}>
              <button
                onClick={() => { onSelect(height); onClose(); }}
                className={`w-full text-left px-4 py-2 rounded-md ${
                  selected === height
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100'
                }`}
              >
                {height}m
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};