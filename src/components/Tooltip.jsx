import React from 'react';

const Tooltip = ({ 
  children, 
  text, 
  position = 'top',
  align = 'center',
  showArrow = true,
  className = '',
  disabled = false
}) => {
  if (disabled || !text) {
    return children;
  }

  const getPositionClasses = () => {
    const baseClasses = 'absolute opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-xl border border-slate-700/50 max-w-fit max-h-20 whitespace-nowrap overflow-hidden leading-relaxed backdrop-blur-sm';
    
    const positionClasses = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-3',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-3',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-3',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-3'
    };

    const alignmentOverrides = {
      'top-left': 'bottom-full left-0 transform translate-x-0 mb-3',
      'top-right': 'bottom-full right-0 transform translate-x-0 mb-3',
      'bottom-left': 'top-full left-0 transform translate-x-0 mt-3',
      'bottom-right': 'top-full right-0 transform translate-x-0 mt-3',
      'left-top': 'right-full top-0 transform translate-y-0 mr-3',
      'left-bottom': 'right-full bottom-0 transform translate-y-0 mr-3',
      'right-top': 'left-full top-0 transform translate-y-0 ml-3',
      'right-bottom': 'left-full bottom-0 transform translate-y-0 ml-3'
    };

    const finalPosition = alignmentOverrides[`${position}-${align}`] || positionClasses[position];
    
    return `${baseClasses} ${finalPosition} ${className}`;
  };

  const getArrowClasses = () => {
    if (!showArrow) return '';
    
    const arrowBase = 'absolute w-3 h-3 bg-slate-900 border border-slate-700/50 shadow-lg';
    
    const arrowPositions = {
      top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 border-t-0 border-l-0',
      bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-0 border-r-0',
      left: 'right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rotate-45 border-l-0 border-t-0',
      right: 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 rotate-45 border-r-0 border-b-0'
    };

    const arrowAlignmentOverrides = {
      'top-left': 'bottom-0 left-4 transform translate-y-1/2 rotate-45 border-t-0 border-l-0',
      'top-right': 'bottom-0 right-4 transform translate-y-1/2 rotate-45 border-t-0 border-l-0',
      'bottom-left': 'top-0 left-4 transform -translate-y-1/2 rotate-45 border-b-0 border-r-0',
      'bottom-right': 'top-0 right-4 transform -translate-y-1/2 rotate-45 border-b-0 border-r-0',
      'left-top': 'right-0 top-4 transform translate-x-1/2 rotate-45 border-l-0 border-t-0',
      'left-bottom': 'right-0 bottom-4 transform translate-x-1/2 rotate-45 border-l-0 border-t-0',
      'right-top': 'left-0 top-4 transform -translate-x-1/2 rotate-45 border-r-0 border-b-0',
      'right-bottom': 'left-0 bottom-4 transform -translate-x-1/2 rotate-45 border-r-0 border-b-0'
    };

    const finalArrowPosition = arrowAlignmentOverrides[`${position}-${align}`] || arrowPositions[position];
    
    return `${arrowBase} ${finalArrowPosition}`;
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div className={getPositionClasses()}>
        {text}
        {showArrow && <span className={getArrowClasses()} />}
      </div>
    </div>
  );
};

export default Tooltip;
