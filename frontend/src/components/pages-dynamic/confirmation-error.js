'use client';

import PartnerLogos from '@/components/partner-logos';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function ConfirmationError() {

  return (
  <div className="mx-auto mt-0">

    <div className="w-full h-screen bg-cover bg-center"
          style={{ backgroundImage: `url('${assetPrefix}/images/sunrise-3579931_1920.jpg')` }} >

      <div className="fixed top-1/3 -translate-y-1/2 left-0 text-center w-full items-center">

        <header className="relative w-full sm:mt-0 text-center py-3">
            <h1 className="text-center text-6xl sm:text-[70px] font-thin text-gray-900 mb-2 sm:mb-10" style={{ textShadow: '0 0px 30px rgba(255,255,255,.25)' }}>
            <span className="text-black tracking-wide pr-[1px]">VoteWind!</span>
            </h1>
        </header>

        <div className="mx-auto w-full max-w-[640px]">
          <p className="font-light text-zinc-600 pl-5 pr-5 mb-5 text-xl sm:text-xl text-center leading-tight">
            There was a problem processing your vote confirmation
          </p>

          <p className="font-light text-zinc-600 pl-5 pr-5 mb-5 text-medium sm:text-lg text-center leading-tight">
            This may be because the confirmation link you clicked on has expired. Please try to cast your vote again or email us at <a className="font-bold hover:text-blue-600" href="mailto:voting@votewind.org">voting@votewind.org</a>
          </p>
        </div>


      </div>
        <PartnerLogos />

    </div>

  </div>

  );
}
