"use client";

import * as React from "react";
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import { cn } from "@/lib/utils";

const TooltipProvider = ({ children }) => <>{children}</>;
TooltipProvider.displayName = 'TooltipProvider';

// TooltipTrigger is no longer needed as a wrapper
// But if you want to keep it for API consistency:
const TooltipTrigger = ({ children }) => {
  return React.Children.only(children);
};
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, portalled = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

const TooltipRoot = ({ children, ...props }) => {
  let triggerNode = null;
  let contentComponent = null;

  React.Children.forEach(children, child => {
    if (React.isValidElement(child)) {
      if (child.type.displayName === 'TooltipTrigger') {
        triggerNode = React.Children.only(child.props.children);
      } else if (child.type.displayName === 'TooltipContent') {
        contentComponent = child;
      }
    }
  });

  if (!triggerNode || !contentComponent) {
    console.warn("Tooltip: Must have exactly one TooltipTrigger and one TooltipContent child.");
    return null;
  }

  const tooltipSide = contentComponent.props.side || props.side || "top";
  const tooltipSideOffset = contentComponent.props.sideOffset || props.sideOffset || 0;

  const calculateRcTooltipOffset = (side, offsetValue) => {
    if (typeof offsetValue !== 'number' || offsetValue === 0) {
      return [0, 0];
    }

    switch (side) {
      case 'top':
        return [0, -offsetValue];
      case 'bottom':
        return [0, offsetValue];
      case 'left':
        return [-offsetValue, 0];
      case 'right':
        return [offsetValue, 0];
      default:
        return [0, 0];
    }
  };

  const rcTooltipOffset = calculateRcTooltipOffset(tooltipSide, tooltipSideOffset);

  const tooltipOverlay = (
    <TooltipContent
      ref={contentComponent.ref}
      {...contentComponent.props}
    />
  );

  return (
    <Tooltip
      overlay={tooltipOverlay}
      placement={tooltipSide}
      offset={rcTooltipOffset}
      trigger={props.trigger || ['hover', 'focus']}
      destroyTooltipOnHide
      mouseEnterDelay={0.1}
      {...props}
    >
      {triggerNode}
    </Tooltip>
  );
};
TooltipRoot.displayName = 'Tooltip';

export { TooltipRoot as Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
