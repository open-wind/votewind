import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function PlanningConstraints({ setOpen=null, content=null }) {
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

  return (

    <div ref={ref} className="relative inline-block text-left mt-1 max-h-[2.2em] overflow-y-auto">

      <p className="text-xs whitespace-normal text-gray-700 truncate select-text">

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
  
      {isOverflowing && !atBottom && (
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-6 bg-gradient-to-b from-[rgba(255,255,255,0)] to-white" />
      )}

    </div>
  );
}
