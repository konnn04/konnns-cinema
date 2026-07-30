'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { useTVFocusable } from '@/hooks/useTVFocusable';
import { cn } from '@/lib/utils';

interface FocusableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  focusKey?: string;
}

const FocusableButton = forwardRef<HTMLButtonElement, FocusableButtonProps>(
  ({ className, onClick, focusKey, children, ...rest }, forwardedRef) => {
    const { ref, tvFocusClassName } = useTVFocusable<HTMLButtonElement | null>({ focusKey });

    return (
      <button
        ref={(node) => {
          ref.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        onClick={onClick}
        className={cn(className, tvFocusClassName)}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
FocusableButton.displayName = 'FocusableButton';

export default FocusableButton;
