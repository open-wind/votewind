'use client';

import CesiumViewer from '@/components/cesium-viewer';

function App() {
  return (
    <div>
      <CesiumViewer longitude={0.1482} latitude={51}/>
    </div>
  );
}

export default App;
