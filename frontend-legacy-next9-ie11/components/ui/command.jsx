'use client';
import * as React from "react";
import Downshift from "downshift";
import { Search, LocateFixed } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CommandContext = React.createContext(null);

const DownshiftRootDiv = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    {...props}
  />
));
DownshiftRootDiv.displayName = 'DownshiftRootDiv';


const Command = ({ onSelect, className, children }) => {
  const dummyItems = React.useRef([]); // Dummy items for Downshift's internal state

  return (
    <Downshift
      onChange={(selection) => {
        var stringValue = selection
          ? (typeof selection === 'object' ? selection.label : String(selection))
          : '';
        if (onSelect) {
          onSelect(stringValue);
        }
      }}
      itemToString={function (item) {
        return item ? item.label : '';
      }}
      items={dummyItems.current}
    >
      {function (downshift) {
        var rootProps = downshift.getRootProps({
          className: cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
          )
        });

        return (
          <DownshiftRootDiv {...rootProps}>
            <CommandContext.Provider value={{ downshift: downshift, items: dummyItems.current }}>
              {children}
            </CommandContext.Provider>
          </DownshiftRootDiv>
        );
      }}
    </Downshift>
  );
};
Command.displayName = "Command";

const CommandInput = React.forwardRef(
  ({ showMagnifier = true, onLocate = null, locating, className, ...props }, ref) => {
    const { downshift } = React.useContext(CommandContext);

    // Extract onValueChange and other custom props from props
    const { onValueChange, onLocate: _, locating: __, showMagnifier: ___, ...restOfPropsForInput } = props;

    // Get Downshift's default input props
    const defaultDownshiftInputProps = downshift.getInputProps(restOfPropsForInput);

    // CRITICAL FIX: Create an adapter function for onChange
    const handleChange = (event) => {
      // Call Downshift's default onChange handler first
      defaultDownshiftInputProps.onChange?.(event);
      // Then call the parent's onValueChange with the string value
      onValueChange?.(event.target.value);
    };

    return (
      <div className="flex items-center border-b px-3 w-full" cmdk-input-wrapper="">
        {showMagnifier && (
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        )}
        <div className="relative w-full">
          {onLocate !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onLocate?.()}
                    className="absolute top-1/2 -translate-y-1/2 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none bg-white"
                    aria-label="Use my location"
                  >
                    {locating ? (
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <LocateFixed className="w-5 h-5 bg-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={20}
                  className="transform translate-x-12 font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block"
                >
                  Use your location
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <input
            // Spread Downshift's default props, but override onChange with our adapter
            {...defaultDownshiftInputProps}
            onChange={handleChange} // Use our custom handleChange adapter
            ref={ref}
            type="text"
            className={cn(
              "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
              className,
              onLocate !== null ? "pl-8" : "pl-3"
            )}
          />
        </div>
      </div>
    );
  }
);
CommandInput.displayName = "CommandInput";

const CommandList = ({ className, children }) => {
  const { downshift } = React.useContext(CommandContext);
  const { getMenuProps } = downshift;

  return (
    <ul
      {...getMenuProps()}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    >
      {children}
    </ul>
  );
};
CommandList.displayName = "CommandList";

const CommandItem = ({
value,
index,
onSelect,
className,
children,
...props
}) => {
const { downshift } = React.useContext(CommandContext);
const { getItemProps, highlightedIndex, selectedItem } = downshift;

const itemObj = { label: value, value };

const downshiftItemProps = getItemProps({
item: itemObj,
index
});

const isHighlighted = highlightedIndex === index;
const isSelected = selectedItem && selectedItem.value === value;

return (
<li
  {...downshiftItemProps}
  onClick={(e) => {
    downshiftItemProps.onClick?.(e);
    onSelect?.(value);
  }}
  className={cn(
    "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
    isHighlighted && "bg-accent text-accent-foreground",
    isSelected && "font-bold",
    className
  )}
  {...props}
>
  {children}
</li>
);
};
CommandItem.displayName = "CommandItem";

const CommandEmpty = ({ children }) => (
  <li className="py-6 text-center text-sm">{children}</li>
);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = ({ children, className }) => (
  <div className={cn("overflow-hidden p-1 text-foreground", className)}>
    {children}
  </div>
);
CommandGroup.displayName = "CommandGroup";

const CommandSeparator = ({ className }) => (
  <div className={cn("-mx-1 h-px bg-border", className)} />
);
CommandSeparator.displayName = "CommandSeparator";

const CommandShortcut = ({ className, ...props }) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
};
