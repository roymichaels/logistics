import React, { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
  showCount?: boolean;
  currentLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      fullWidth = true,
      showCount,
      currentLength,
      maxLength,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      px-3 py-2 border rounded-lg
      transition-colors resize-none
      focus:ring-2 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
      ${error
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:ring-blue-500'
      }
      ${className}
    `;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          className={baseClasses.trim()}
          maxLength={maxLength}
          {...props}
        />

        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
            {currentLength || 0}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
