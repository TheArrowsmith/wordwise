import React from 'react';

interface NativeLanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const NativeLanguageSelector: React.FC<NativeLanguageSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
    >
      <option value="" disabled hidden>
        Select your language...
      </option>
      <option value="es">Spanish (Español)</option>
      <option value="de">German (Deutsch)</option>
      <option value="fr">French (Français)</option>
      <option value="pt">Portuguese (Português)</option>
    </select>
  );
};

export default NativeLanguageSelector; 