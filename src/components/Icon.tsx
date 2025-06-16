import { 
  // Outline icons
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  SparklesIcon,
  HomeIcon,
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

import {
  // Solid icons
  UserPlusIcon as UserPlusSolid,
  ArrowRightOnRectangleIcon as ArrowRightOnRectangleSolid,
  ChartBarIcon as ChartBarSolid,
  SparklesIcon as SparklesSolid,
  HomeIcon as HomeSolid,
  Cog6ToothIcon as Cog6ToothSolid,
  UserIcon as UserSolid,
  BellIcon as BellSolid,
  MagnifyingGlassIcon as MagnifyingGlassSolid,
  PlusIcon as PlusSolid,
  TrashIcon as TrashSolid,
  PencilIcon as PencilSolid,
  EyeIcon as EyeSolid,
  EyeSlashIcon as EyeSlashSolid,
  CheckIcon as CheckSolid,
  XMarkIcon as XMarkSolid,
  ArrowLeftIcon as ArrowLeftSolid,
  ArrowRightIcon as ArrowRightSolid,
} from "@heroicons/react/24/solid";

// Map of available icons
const outlineIcons = {
  'user-plus': UserPlusIcon,
  'arrow-right-on-rectangle': ArrowRightOnRectangleIcon,
  'chart-bar': ChartBarIcon,
  'sparkles': SparklesIcon,
  'home': HomeIcon,
  'cog-6-tooth': Cog6ToothIcon,
  'user': UserIcon,
  'bell': BellIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'plus': PlusIcon,
  'trash': TrashIcon,
  'pencil': PencilIcon,
  'eye': EyeIcon,
  'eye-slash': EyeSlashIcon,
  'check': CheckIcon,
  'x-mark': XMarkIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
} as const;

const solidIcons = {
  'user-plus': UserPlusSolid,
  'arrow-right-on-rectangle': ArrowRightOnRectangleSolid,
  'chart-bar': ChartBarSolid,
  'sparkles': SparklesSolid,
  'home': HomeSolid,
  'cog-6-tooth': Cog6ToothSolid,
  'user': UserSolid,
  'bell': BellSolid,
  'magnifying-glass': MagnifyingGlassSolid,
  'plus': PlusSolid,
  'trash': TrashSolid,
  'pencil': PencilSolid,
  'eye': EyeSolid,
  'eye-slash': EyeSlashSolid,
  'check': CheckSolid,
  'x-mark': XMarkSolid,
  'arrow-left': ArrowLeftSolid,
  'arrow-right': ArrowRightSolid,
} as const;

export type IconName = keyof typeof outlineIcons;
export type IconVariant = 'outline' | 'solid';
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconProps {
  name: IconName;
  variant?: IconVariant;
  size?: IconSize;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4', 
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export default function Icon({ 
  name, 
  variant = 'outline', 
  size = 'md', 
  className = '' 
}: IconProps) {
  const icons = variant === 'solid' ? solidIcons : outlineIcons;
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const sizeClass = sizeClasses[size];
  const combinedClassName = `${sizeClass} ${className}`.trim();

  return <IconComponent className={combinedClassName} />;
} 