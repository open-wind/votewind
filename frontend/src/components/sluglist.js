import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io'; // Close icon
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function SlugList({ containingSlugs = [] }) {
  const [open, setOpen] = useState(false);
  const firstSlug = containingSlugs?.[0] || 'Unknown area';

  return (
    <div className="relative inline-block text-left z-50">

      <span className="text-sm font-medium text-gray-700 truncate max-w-[12rem]">
        Constraint map: <a className="font-bold text-blue-600" target="_new" href={`http://${firstSlug.slug}.votewind.org:3000`}>{firstSlug.name}</a>
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
              Show available constraint maps
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
                  <a
                    target="_new"
                    href={`http://${item.slug}.votewind.org:3000`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    {item.name}
                  </a>
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
