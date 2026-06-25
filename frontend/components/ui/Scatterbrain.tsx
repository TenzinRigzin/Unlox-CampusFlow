import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PostItColor = 'yellow' | 'blue' | 'pink' | 'green' | 'orange' | 'purple' | 'white';

export interface PostItProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: PostItColor;
  rotation?: number; // custom rotation if needed, otherwise uses standard classes
  pin?: boolean;
  pinColor?: 'red' | 'blue' | 'green' | 'gold';
  tape?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const PostIt = React.forwardRef<HTMLDivElement, PostItProps>(({
  color = 'yellow',
  rotation,
  pin = false,
  pinColor = 'red',
  tape = false,
  className,
  children,
  style,
  ...props
}, ref) => {
  
  // Background classes based on color
  const colorClasses = {
    yellow: 'bg-gradient-to-br from-yellow to-yellow-deep',
    blue: 'bg-gradient-to-br from-blue to-blue-deep',
    pink: 'bg-gradient-to-br from-pink to-pink-deep',
    green: 'bg-gradient-to-br from-green to-green-deep',
    orange: 'bg-orange',
    purple: 'bg-purple',
    white: 'bg-white border-2 border-ink'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative p-6 sm:p-10',
        'shadow-[2px_3px_15px_rgba(45,42,38,0.15),0_1px_3px_rgba(45,42,38,0.25)]',
        colorClasses[color],
        className
      )}
      style={{
        transform: rotation !== undefined ? `rotate(${rotation}deg)` : undefined,
        ...style
      }}
      {...props}
    >
      {pin && <Pin color={pinColor} />}
      {tape && <Tape />}
      {children}
    </div>
  );
});
PostIt.displayName = 'PostIt';

export function Pin({ color = 'red' }: { color?: 'red' | 'blue' | 'green' | 'gold' }) {
  const pinGradients = {
    red: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
    blue: 'radial-gradient(circle at 30% 30%, #4dabf7, #1864ab)',
    green: 'radial-gradient(circle at 30% 30%, #69db7c, #2f9e44)',
    gold: 'radial-gradient(circle at 30% 30%, #ffd43b, #f59f00)'
  };
  
  return (
    <div 
      className="absolute top-[-12px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-10"
      style={{
        background: pinGradients[color],
        boxShadow: '0 2px 4px rgba(45, 42, 38, 0.25), inset -2px -2px 4px rgba(0,0,0,0.2)'
      }}
    />
  );
}

export function Tape() {
  return (
    <div 
      className="absolute top-[-15px] left-1/2 -translate-x-1/2 w-[80px] h-[25px] -rotate-2 z-10"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    />
  );
}

export function Doodle({ type = 'circle', className }: { type?: 'circle' | 'squiggly' | 'triangle' | 'x', className?: string }) {
  // A simple component to inject SVG doodles
  return (
    <div className={cn("absolute opacity-15 pointer-events-none text-ink z-0", className)}>
      {type === 'circle' && (
        <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="50" cy="50" r="40" />
        </svg>
      )}
      {type === 'x' && (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="10" y1="10" x2="90" y2="90" />
          <line x1="90" y1="10" x2="10" y2="90" />
        </svg>
      )}
      {/* Can add more doodle SVGs here */}
    </div>
  );
}
