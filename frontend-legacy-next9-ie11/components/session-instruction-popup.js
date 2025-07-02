'use client';

import { useEffect, useState } from 'react';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function SessionInstructionPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('votewind-instruction-seen');
    if (!hasSeenPopup) {
      setShow(true);
      sessionStorage.setItem('votewind-instruction-seen', 'true');
    }
  }, []);

  if (!show) return null;

  return (
  <div className="fixed w-full h-full mx-auto top-0 left-0 inset-0 bg-black/50 z-50">
    <div className="flex bg-white sm:bg-transparent items-center justify-center text-center w-full h-full">
      <div className="bg-white p-6 sm:max-w-md rounded-none sm:rounded-xl sm:shadow-lg">

       <h2 className="text-xl font-semibold mb-2">Using VoteWind.org</h2>

      <div className="mb-4 text-gray-700 text-sm text-left space-y-4">

        <p>Click anywhere on map to show where you'd be happy to have an onshore wind turbine then click 'Vote' to cast your vote.</p> 
        <p>If you enter your email address, that helps us confirm your vote - but if you'd rather not, you can still vote. Votes confirmed by email are <span className="font-bold text-green-500">highlighted in green</span> on map.</p>
        <img src={`${assetPrefix}/images/blue_shading_sample.png`} className="w-135px float-left h-auto mr-4 mb-2 rounded"/>
        <p><span className="font-bold text-blue-800/80">Blue shaded areas</span> (see left) show where wind turbine planning constraints may apply.
        Less shaded areas are less risky but darker shaded areas <i>may still be possible</i>.
        </p>
        <p>Consult our detailed <b>planning constraint maps</b> to explore specific planning constraints in detail.</p> 
      </div>
      <button
        onClick={() => setShow(false)}
        className="bg-blue-600 min-w-[14rem] text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Let's go!
      </button>
      </div>

    </div>
  </div>
  );
}
