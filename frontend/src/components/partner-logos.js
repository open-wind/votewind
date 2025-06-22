'use client';

import Slider from 'react-infinite-logo-slider'
import { getBasePath } from './functions/helpers';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function PartnerLogos () {

    return (
    <div className="mt-5 w-full h-[168px] sm:h-[130px] bg-white z-9999 shadow-lg">
      <div className="relative bottom-0 w-full bg-white">
        <div className="w-full bg-white">

            <Slider
              width="200px"
              duration={80}
              // pauseOnHover={true}
              blurBorders={false}
              blurBorderColor={'#fff'} 
            >
              <Slider.Slide className="mr-4">
                <a className="pointer-events-auto" target="_partner" href="https://ashden.org/energy-learning-network/"><img src={assetPrefix + "/logos/partner-ashden.png"} alt="Ashden" className="h-10" /></a>
              </Slider.Slide>
              <Slider.Slide>
                <a className="pointer-events-auto" target="_partner" href="https://communityenergyengland.org/pages/energy-learning-network/"><img src={assetPrefix + "/logos/partner-cee.png"} alt="Community Energy England" className="h-20" /></a>
              </Slider.Slide>
              <Slider.Slide className="mr-10">
                <a className="pointer-events-auto" target="_partner" href="https://communityenergyscotland.org.uk/projects/energy-learning-network/"><img src={assetPrefix + "/logos/partner-ces.png"} alt="Community Energy Scotland" /></a>
              </Slider.Slide>
              <Slider.Slide className="mr-10">
                <a className="pointer-events-auto" target="_partner" href="https://communityenergy.wales/energy-learning-network"><img src={assetPrefix + "/logos/partner-cew.png"} alt="Community Energy Wales" className="h-12" /></a>
              </Slider.Slide>
              <Slider.Slide className="mr-14">
                <a className="pointer-events-auto" target="_partner" href="https://actionrenewables.co.uk/energy-learning-network/"><img src={assetPrefix + "/logos/partner-actionrenewables.png"} alt="Action Renewables" className="h-14" /></a>
              </Slider.Slide>
              <Slider.Slide className="mr-0">
                <a className="pointer-events-auto" target="_partner" href="https://www.cse.org.uk/my-community/community-projects/energy-learning-network/"><img src={assetPrefix + "/logos/partner-cse.png"} alt="Centre for Sustainable Energy" className="h-14" /></a>
              </Slider.Slide>
            </Slider>
        </div>
        
        <div className="w-full">
            <div className="text-[9px] sm:text-[14px] text-center w-full font-light pt-3 pb-2">
              An <a className="font-bold" target="_partner" href="https://ashden.org/energy-learning-network/">Energy Learning Network</a> project in partnership with <a className="font-bold" target="_partner" href="https://openwind.energy">Open Wind Energy</a>
            </div>
        </div>
      </div>
    </div>

    )
}