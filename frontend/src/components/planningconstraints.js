import { useEffect, useRef, useState } from "react";
import { IoMdClose } from 'react-icons/io'; // Close icon
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function PlanningConstraints({ containingAreas = [], content=null, longitude=null, latitude=null }) {
  const [open, setOpen] = useState(false);
  const firstSlug = containingAreas?.[0] || 'Unknown area';
  const ref = useRef();
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const hasOverflow = el.scrollHeight > el.clientHeight;
      setIsOverflowing(hasOverflow);
      setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
    };

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const createURL = (areaname, areaslug) => {
    return (
      <a className="font-bold text-blue-600 hover:underline" target="_new" href={`https://${areaslug}.votewind.org?longitude=${longitude.toFixed(5)}&latitude=${latitude.toFixed(5)}`}>{areaname}</a>
    )
  }

  return (

    <div ref={ref} className="relative inline-block text-left mt-1 max-h-[2.2em] overflow-y-auto">

      <p className="text-xs whitespace-normal font-medium text-gray-700 truncate">

      <TooltipProvider>
          <Tooltip>
          <TooltipTrigger asChild>
              <a href="#" onClick={() => setOpen(true)} className="text-blue-700"><b>Possible planning constraint issues</b></a>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
              View planning constraints maps for areas containing this position
          </TooltipContent>
          </Tooltip>
      </TooltipProvider>

      :&nbsp;{content}

      </p>
  
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="relative bg-white w-[90%] max-w-md p-4 rounded-lg text-sm sm:text-md shadow-lg">

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              aria-label="Close"
            >
              <IoMdClose className="w-5 h-5" />
            </button>

          <div className="font-semibold text-gray-800 mb-1">Detailed constraint maps available:</div>

          {containingAreas.length > 0 ? (
          <ul className="list-disc list-inside space-y-0 max-h-64 overflow-y-auto">

              {containingAreas.map((item, index) => (
                <li key={index}>
                  {createURL(item.name, item.slug)}
                </li>
              ))}
          </ul>
          ) : (
            <div className="text-gray-500">No boundaries found at this location.</div>
          )}
          </div>

        </div>
      )}

      {isOverflowing && !atBottom && (
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-6 bg-gradient-to-b from-transparent to-white" />
      )}

    </div>
  );
}
