// components/common/Input.tsx
import { InputHTMLAttributes, forwardRef, memo } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = memo(forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label 
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
                
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
                    
          <input
            ref={ref}
            className={`
              w-full rounded-lg border shadow-sm transition-colors
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
              ${icon ? 'pl-10' : 'pl-4'} py-2 pr-4
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
              ${className}
            `}
            {...props}
          />
        </div>
                
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
));

Input.displayName = 'Input';

export default Input;