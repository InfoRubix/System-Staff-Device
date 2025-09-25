'use client';

import { useState, useRef, useEffect } from 'react';

interface SelectOrInputProps {
  name: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  options?: { value: string; label: string }[] | string[];
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  groupedOptions?: { [key: string]: string[] };
}

function SelectOrInput({
  name,
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select or enter custom value",
  className = "",
  hasError = false,
  groupedOptions
}: SelectOrInputProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is in the predefined options
  useEffect(() => {
    let isValueInOptions = false;

    if (groupedOptions) {
      for (const group of Object.values(groupedOptions)) {
        if (group.includes(value)) {
          isValueInOptions = true;
          break;
        }
      }
    } else {
      const optionValues = Array.isArray(options) && options.length > 0
        ? (typeof options[0] === 'string' ? options as string[] : (options as { value: string; label: string }[]).map(o => o.value))
        : [];
      isValueInOptions = optionValues.includes(value);
    }

    // Only switch to custom mode if there's a value that doesn't match options
    // Don't switch to custom mode for empty values
    if (value && value.trim() !== '' && !isValueInOptions) {
      setIsCustom(true);
      setCustomValue(value);
    } else if (!value || value.trim() === '' || isValueInOptions) {
      setIsCustom(false);
      setCustomValue('');
    }
  }, [value, options, groupedOptions]);

  // Auto-focus input when switching to custom mode
  useEffect(() => {
    if (isCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustom]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === '__custom__') {
      setIsCustom(true);
      setCustomValue(value || '');
      // Focus on input after state update
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setIsCustom(false);
      setCustomValue('');
      onChange(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);

    // Create a synthetic event for the parent
    const syntheticEvent = {
      target: {
        name,
        value: newValue
      }
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };

  const handleBackToSelect = () => {
    setIsCustom(false);
    setCustomValue('');
    // Clear the value by creating a synthetic event
    const syntheticEvent = {
      target: {
        name,
        value: ''
      }
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };

  const baseSelectClassName = `mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer ${
    hasError ? 'border-red-300' : 'border-gray-300'
  } ${className}`;

  const baseInputClassName = `mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
    hasError ? 'border-red-300' : 'border-gray-300'
  } ${className}`;

  if (isCustom) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          id={id}
          value={customValue}
          onChange={handleInputChange}
          onFocus={(e) => e.target.select()}
          className={baseInputClassName}
          placeholder="Enter custom value"
          autoComplete="off"
          style={{ paddingRight: '4rem' }}
        />
        <button
          type="button"
          onClick={handleBackToSelect}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors z-10"
        >
          Select
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        ref={selectRef}
        name={name}
        id={id}
        value={value || ''}
        onChange={handleSelectChange}
        className={baseSelectClassName}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
          pointerEvents: 'auto'
        }}
      >
        <option value="">{placeholder}</option>

        {groupedOptions ? (
          // Render grouped options
          Object.entries(groupedOptions).map(([groupLabel, groupOptions]) => (
            <optgroup key={groupLabel} label={groupLabel}>
              {groupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          // Render regular options
          Array.isArray(options) && options.map((option) => {
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            } else {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            }
          })
        )}

        <option value="__custom__" style={{ fontWeight: 'bold', borderTop: '1px solid #ccc' }}>
          ✏️ Enter custom value
        </option>
      </select>
    </div>
  );
}

export default SelectOrInput;