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
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white text-center p-6 w-full h-full sm:h-auto sm:w-auto sm:max-w-sm rounded-none sm:rounded-xl sm:p-6 shadow-lg">
       <h2 className="text-xl font-semibold mb-2">Using VoteWind.org...</h2>

        <div className="mb-4 text-gray-700 text-sm text-left space-y-4">

        <p>Click anywhere on the map to indicate where you'd be happy to have an onshore wind turbine then click 'Vote' to cast your vote.</p> 
        <p className="text-center text-lg"><strong>It's that simple!</strong></p>
        <p>If you enter your email address, that helps us confirm your vote - but you don't have to. Votes confirmed by email are <span className="font-bold text-green-500">highlighted in green</span> on the map.</p>
        <img src={`${assetPrefix}/images/blue_shading_sample.png`} className="w-[175px] float-left h-auto mr-4 mb-2 rounded"/>
        <p><span className="font-bold text-blue-800/80">Blue shaded areas</span> (see image) show where wind turbine planning constraints may apply.
        Less shaded areas are less risky but darker shaded areas <i>may still be possible</i>.
        </p>
        <p>Consult our detailed <b>planning constraint maps</b> to explore specific planning constraints in more detail.</p> 
        </div>
        <button
          onClick={() => setShow(false)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Let's go!
        </button>
      </div>
    </div>
  );
}
