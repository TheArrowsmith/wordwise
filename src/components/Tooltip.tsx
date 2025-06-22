'use client';

import React, { useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  safePolygon,
} from '@floating-ui/react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    whileElementsMounted: autoUpdate,
    strategy: 'fixed',
    middleware: [
      offset(12),
      flip({
        fallbackPlacements: ['bottom', 'left', 'right'],
      }),
      shift({ padding: 8 }),
    ],
  });

  const hover = useHover(context, { 
    handleClose: safePolygon(),
    delay: { open: 300, close: 100 }
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      {React.cloneElement(children, getReferenceProps({ ref: refs.setReference, ...(children.props || {}) }))}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            position: 'fixed',
            top: floatingStyles.top,
            left: floatingStyles.left,
            transform: floatingStyles.transform,
          }}
          {...getFloatingProps()}
          className="z-[9999] max-w-sm rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-lg"
        >
          {content}
        </div>
      )}
    </>
  );
} 