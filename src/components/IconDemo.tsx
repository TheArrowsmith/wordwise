import Icon from './Icon';
import { HeartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';

export default function IconDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">HeroIcons Demo</h1>
      
      {/* Using the Icon component */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Using the Icon Component</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="user" />
            <span>Default</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="user" variant="solid" />
            <span>Solid</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="home" size="lg" className="text-blue-600" />
            <span>Large</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="sparkles" variant="solid" className="text-purple-600" />
            <span>Colored</span>
          </div>
        </div>
      </section>

      {/* Different sizes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Icon Sizes</h2>
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <Icon name="bell" size="xs" />
          <Icon name="bell" size="sm" />
          <Icon name="bell" size="md" />
          <Icon name="bell" size="lg" />
          <Icon name="bell" size="xl" />
        </div>
      </section>

      {/* Direct import usage */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Direct Import Usage</h2>
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <HeartIcon className="h-6 w-6 text-red-500" />
          <HeartSolid className="h-6 w-6 text-red-500" />
          <StarIcon className="h-6 w-6 text-yellow-500" />
          <StarSolid className="h-6 w-6 text-yellow-500" />
        </div>
      </section>

      {/* Button examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Buttons with Icons</h2>
        <div className="space-y-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <Icon name="plus" size="sm" />
            <span>Add Item</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            <Icon name="trash" size="sm" className="text-red-500" />
            <span>Delete</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            <Icon name="check" size="sm" />
            <span>Confirm</span>
          </button>
        </div>
      </section>

      {/* Navigation example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Navigation Menu</h2>
        <nav className="bg-white border border-gray-200 rounded-lg p-4">
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <Icon name="home" />
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <Icon name="user" />
                <span>Profile</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                <Icon name="cog-6-tooth" />
                <span>Settings</span>
              </a>
            </li>
          </ul>
        </nav>
      </section>

      {/* Available icons grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Available Icons</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4 p-4 bg-gray-50 rounded-lg">
          {[
            'user-plus', 'arrow-right-on-rectangle', 'chart-bar', 'sparkles',
            'home', 'cog-6-tooth', 'user', 'bell', 'magnifying-glass',
            'plus', 'trash', 'pencil', 'eye', 'eye-slash', 'check', 'x-mark',
            'arrow-left', 'arrow-right'
          ].map((iconName) => (
            <div key={iconName} className="flex flex-col items-center space-y-1 p-2">
              <Icon name={iconName as any} className="text-gray-600" />
              <span className="text-xs text-gray-500 text-center">{iconName}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 