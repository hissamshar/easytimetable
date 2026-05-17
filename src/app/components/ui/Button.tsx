import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary/40 shadow-sm",
    secondary: "bg-bg-slate text-text-slate hover:bg-border border border-border focus:ring-primary/30",
    ghost: "bg-transparent text-text-muted hover:bg-bg-slate hover:text-text-slate focus:ring-primary/30",
    danger: "bg-red-light text-red hover:bg-red/10 border border-red/20 focus:ring-red/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[12px] gap-1.5",
    md: "px-4 py-2 text-[13px] gap-2",
    lg: "px-5 py-2.5 text-[14px] gap-2",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
