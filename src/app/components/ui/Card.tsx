import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export function Card({ className = '', children, hoverable = false, ...props }: CardProps) {
  const baseStyle = "bg-bg-card rounded-xl border border-border p-5 flex flex-col";
  const hoverStyle = hoverable ? "transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "";
  
  return (
    <div className={`${baseStyle} ${hoverStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}
