'use client';

interface CEFRSelectorProps {
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  className?: string;
}

const cefrLevels = [
  {
    level: 'A1',
    name: 'Beginner',
    description: 'You can understand and use simple phrases for basic needs, like greetings or ordering food, but struggle with full conversations.'
  },
  {
    level: 'A2', 
    name: 'Elementary',
    description: 'You can handle short, routine conversations about familiar topics, like shopping or family, with basic vocabulary and simple sentences.'
  },
  {
    level: 'B1',
    name: 'Intermediate', 
    description: 'You can discuss everyday topics, like work or hobbies, with enough confidence to express opinions, though you may make some mistakes.'
  },
  {
    level: 'B2',
    name: 'Upper-Intermediate',
    description: 'You can have detailed conversations on a wide range of topics, including abstract ideas, with clear expression and only occasional errors.'
  },
  {
    level: 'C1',
    name: 'Advanced',
    description: 'You can fluently discuss complex topics, like politics or culture, with precision and ease, understanding almost everything you hear or read.'
  },
  {
    level: 'C2',
    name: 'Proficient', 
    description: 'You can speak and understand the language effortlessly, like a native speaker, even in academic or professional settings with nuanced vocabulary.'
  }
];

export default function CEFRSelector({ selectedLevel, onLevelChange, className = '' }: CEFRSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {cefrLevels.map((level) => (
        <div
          key={level.level}
          onClick={() => onLevelChange(level.level)}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-indigo-400 ${
            selectedLevel === level.level
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`font-bold text-lg ${
                selectedLevel === level.level ? 'text-indigo-700' : 'text-gray-900'
              }`}>
                {level.level}
              </span>
              <span className={`font-medium ${
                selectedLevel === level.level ? 'text-indigo-600' : 'text-gray-700'
              }`}>
                ({level.name})
              </span>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              selectedLevel === level.level
                ? 'bg-indigo-600 border-indigo-600'
                : 'border-gray-300'
            }`}>
              {selectedLevel === level.level && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
          </div>
          <p className={`text-sm ${
            selectedLevel === level.level ? 'text-indigo-600' : 'text-gray-600'
          }`}>
            {level.description}
          </p>
        </div>
      ))}
    </div>
  );
} 