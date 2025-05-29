import { useRef, useEffect, useState } from "react";

const partners = [
  { name: "CEE", logo: "/logos/partner-cee.png", url: "https://partner-a.com" },
  { name: "CES", logo: "/logos/partner-ces.png", url: "https://partner-b.com" },
  { name: "CEW", logo: "/logos/partner-cew.png", url: "https://partner-c.com" },
  { name: "Ashden", logo: "/logos/partner-ashden.png", url: "https://partner-c.com" },
  { name: "CSE", logo: "/logos/partner-cse.png", url: "https://partner-c.com" },
  { name: "Action Renewables", logo: "/logos/partner-actionrenewables.png", url: "https://partner-c.com" },

];

export default function PartnerLogos() {
  const scrollRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  // ✅ Auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let frameId;

    const scrollStep = () => {
      if (!isHovering) {
        scrollContainer.scrollLeft += 0.2;
            console.log("scrolling:", scrollContainer.scrollLeft); // ✅ log it


        if (
          scrollContainer.scrollLeft + scrollContainer.clientWidth >=
          scrollContainer.scrollWidth
        ) {
          scrollContainer.scrollLeft = 0; // loop back
        }
      }

      frameId = requestAnimationFrame(scrollStep);
    };

    const timeoutId = setTimeout(() => {
      frameId = requestAnimationFrame(scrollStep);
    }, 300); // allow time for layout

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [isHovering]);

  // ✅ Drag-to-scroll logic
  let isDown = false;
  let startX;
  let scrollLeft;

  const startDrag = (e) => {
    isDown = true;
    scrollRef.current.classList.add("cursor-grabbing");
    startX = e.pageX || e.touches?.[0].pageX;
    scrollLeft = scrollRef.current.scrollLeft;
  };

  const stopDrag = () => {
    isDown = false;
    scrollRef.current.classList.remove("cursor-grabbing");
  };

  const dragMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX || e.touches?.[0].pageX;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow z-50">
      <div
        ref={scrollRef}
        onMouseDown={startDrag}
        onMouseLeave={() => {
          stopDrag();
          setIsHovering(false);
        }}
        onMouseUp={stopDrag}
        onMouseMove={dragMove}
        onMouseEnter={() => setIsHovering(true)}
        onTouchStart={startDrag}
        onTouchEnd={stopDrag}
        onTouchMove={dragMove}
          style={{ maxWidth: "100vw" }} // explicitly ensure it doesn't collapse

  className="flex overflow-x-auto whitespace-nowrap gap-8 px-6 py-4 cursor-grab no-scrollbar w-full"
      >
        {partners.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img
              src={partner.logo}
              alt={partner.name}
              className="h-12 object-contain"
            />
          </a>
        ))}
      </div>
    </div>
  );
}