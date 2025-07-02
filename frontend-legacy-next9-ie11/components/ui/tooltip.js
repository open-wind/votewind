import React, { useState } from 'react';

// TooltipProvider is just a passthrough (no context needed)
export const TooltipProvider = ({ children }) => children;

// Tooltip manages the hover state
export const Tooltip = ({ children }) => {
  const [visible, setVisible] = useState(false);

  // Enhance children to pass visibility and handlers
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    return React.cloneElement(child, {
      tooltipVisible: visible,
      setTooltipVisible: setVisible
    });
  });
};

// TooltipTrigger attaches event handlers
export const TooltipTrigger = ({ children, setTooltipVisible }) => {
  const onMouseEnter = () => setTooltipVisible(true);
  const onMouseLeave = () => setTooltipVisible(false);

  return React.cloneElement(children, {
    onMouseEnter,
    onMouseLeave
  });
};

// TooltipContent renders conditionally
export const TooltipContent = ({
  children,
  tooltipVisible,
  side = 'top',
  sideOffset = 4,
  className = ''
}) => {
  if (!tooltipVisible) return null;

  const style = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    // crude side positioning (can enhance as needed)
    marginTop: side === 'top' ? -sideOffset : sideOffset,
    marginLeft: side === 'left' ? -sideOffset : sideOffset
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};
