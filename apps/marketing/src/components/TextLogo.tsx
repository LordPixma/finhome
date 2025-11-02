'use client';

interface TextLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  className?: string;
}

const sizeClasses = {
  xs: 'text-lg',
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl'
};

const variantClasses = {
  light: {
    finhome: 'text-white',
    number: 'text-blue-300'
  },
  dark: {
    finhome: 'text-gray-900',
    number: 'text-primary-600'
  }
};

export default function TextLogo({ 
  size = 'md', 
  variant = 'dark', 
  className 
}: TextLogoProps) {
  const baseClasses = `font-bold tracking-tight select-none ${sizeClasses[size]}`;
  const finalClasses = className ? `${baseClasses} ${className}` : baseClasses;
  
  return (
    <div className={finalClasses}>
      <span className={`font-extrabold ${variantClasses[variant].finhome}`}>
        FINHOME
      </span>
      <span className={`font-bold ${variantClasses[variant].number}`}>
        360
      </span>
    </div>
  );
}