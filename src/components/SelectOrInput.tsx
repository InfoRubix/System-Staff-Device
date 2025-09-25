'use client';

import { useState, useRef, useEffect } from 'react';

interface SelectOrInputProps {
  name: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  options: { value: string; label: string }[] | string[];
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
  options,
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

    if (value && !isValueInOptions) {
      setIsCustom(true);
      setCustomValue(value);
    } else {
      setIsCustom(false);
      setCustomValue('');
    }
  }, [value, options, groupedOptions]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === '__custom__') {
      setIsCustom(true);
      setCustomValue(value || '');
      // Focus on input after state update
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setIsCustom(false);
      setCustomValue('');
      onChange(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value);
    // Create a synthetic event for the parent
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: e.target.value
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

  const baseClassName = `mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
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
          className={baseClassName}
          placeholder="Enter custom value"
        />
        <button
          type="button"
          onClick={handleBackToSelect}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
        >
          Select
        </button>
      </div>
    );
  }

  return (
    <select
      ref={selectRef}
      name={name}
      id={id}
      value={value}
      onChange={handleSelectChange}
      className={baseClassName}
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
        Array.isArray(options) && options.map((option, index) => {
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

      <option value="__custom__">✏️ Enter custom value</option>
    </select>
  );
}

export default SelectOrInput;