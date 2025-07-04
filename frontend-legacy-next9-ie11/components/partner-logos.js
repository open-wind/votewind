import React, { useEffect, useRef, useState } from 'react';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function PartnerLogos() {
  const trackRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animationReady, setAnimationReady] = useState(false);

  const pixelsPerSecond = 50;

  const logos = [
    { href: "https://ashden.org/energy-learning-network/", src: "/logos/partner-ashden.png", alt: "Ashden", height: "50px" },
    { href: "https://communityenergyengland.org/pages/energy-learning-network/", src: "/logos/partner-cee.png", alt: "Community Energy England", height: "80px" },
    { href: "https://communityenergyscotland.org.uk/projects/energy-learning-network/", src: "/logos/partner-ces.png", alt: "Community Energy Scotland", height: "50px" },
    { href: "https://communityenergy.wales/energy-learning-network", src: "/logos/partner-cew.png", alt: "Community Energy Wales", height: "50px" },
    { href: "https://actionrenewables.co.uk/energy-learning-network/", src: "/logos/partner-actionrenewables.png", alt: "Action Renewables", height: "50px" },
    { href: "https://www.cse.org.uk/my-community/community-projects/energy-learning-network/", src: "/logos/partner-cse.png", alt: "Centre for Sustainable Energy", height: "50px" },
  ];

  const totalImages = logos.length * 2; // since we duplicate

  useEffect(() => {
    if (loadedImages === totalImages) {
      const width = trackRef.current.offsetWidth;
      const durationSeconds = width / pixelsPerSecond;
      setDuration(durationSeconds);
      setAnimationReady(true);
    }
  }, [loadedImages, totalImages]);

  useEffect(() => {
    const onResize = () => {
      if (trackRef.current) {
        const width = trackRef.current.offsetWidth;
        const durationSeconds = width / pixelsPerSecond;
        setDuration(durationSeconds);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleImageLoad = () => {
    setLoadedImages((prev) => prev + 1);
  };

  return (
    <div className="mt-5 w-full h-[168px] bg-white z-9999 shadow-lg overflow-hidden">
      <div className="relative bottom-0 w-full bg-white">
        <div className="logo-slider">
          <div
            ref={trackRef}
            className={`logo-track ${animationReady ? 'logo-animate' : ''}`}
            style={animationReady ? { animationDuration: `${duration}s` } : {}}
          >
            {logos.concat(logos).map((logo, idx) => (
              <span key={idx} className="logo-slide mr-10">
                <a className="pointer-events-auto" target="_blank" rel="noopener noreferrer" href={logo.href}>
                  <img
                    src={assetPrefix + logo.src}
                    alt={logo.alt}
                    style={{ height: logo.height, width: 'auto' }}
                    onLoad={handleImageLoad}
                  />
                </a>
              </span>
            ))}
          </div>
        </div>

        <div className="w-full">
          <div className="text-9px sm-text-14px text-center w-full font-light pt-3 pb-2">
            An <a className="font-bold" target="_partner" href="https://ashden.org/energy-learning-network/">Energy Learning Network</a> project in partnership with <a className="font-bold" target="_partner" href="https://openwind.energy">Open Wind Energy</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .logo-slider {
          height: 100px;
          overflow: hidden;
          position: relative;
        }

        .logo-track {
          display: inline-block;
          white-space: nowrap;
        }

        .logo-animate {
          animation-name: scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .logo-slide {
          display: inline-block;
          padding-right: 2rem;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
