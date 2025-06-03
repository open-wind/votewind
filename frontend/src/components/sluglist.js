import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io'; // Close icon
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function SlugList({ containingSlugs = [], longitude=null, latitude=null }) {
  const [open, setOpen] = useState(false);
  const firstSlug = containingSlugs?.[0] || 'Unknown area';

  const createURL = (areaname, areaslug) => {
    return (
      <a className="font-bold text-blue-600 hover:underline" target="_new" href={`https://${areaslug}.votewind.org?longitude=${longitude.toFixed(5)}&latitude=${latitude.toFixed(5)}`}>{areaname}</a>
    )
  }

  return (
    <div className="relative inline-block text-left z-50">

      <span className="text-xs font-medium text-gray-700 truncate sm:max-w-[12rem]">
        <b>Constraints map:</b> {createURL(firstSlug.name, firstSlug.slug)}
      </span>

      <TooltipProvider>
          <Tooltip>
          <TooltipTrigger asChild>
            <button type="button"
              onClick={() => setOpen(!open)}
              className="p-1 pl-2 rounded-full hover:bg-gray-200"
            >
              <FaInfoCircle className="w-4 h-4 text-blue-600" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
              All available constraint maps for position
          </TooltipContent>
          </Tooltip>
      </TooltipProvider>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="relative bg-white w-[90%] max-w-md p-4 rounded-lg shadow-lg">

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              aria-label="Close"
            >
              <IoMdClose className="w-5 h-5" />
            </button>

          <div className="font-semibold text-gray-800 mb-1">Detailed constraint maps available</div>

          {containingSlugs.length > 0 ? (
          <ul className="list-disc list-inside space-y-0 max-h-64 overflow-y-auto">

              {containingSlugs.map((item, index) => (
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
    </div>
  );
}
