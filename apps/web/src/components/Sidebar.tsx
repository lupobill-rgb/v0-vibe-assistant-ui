import { 
  HomeIcon, 
  FolderIcon, 
  StarIcon, 
  ClockIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const menuItems = [
    { icon: HomeIcon, label: 'Home', active: true },
    { icon: FolderIcon, label: 'Projects', active: false },
    { icon: StarIcon, label: 'Starred', active: false },
    { icon: ClockIcon, label: 'Recent', active: false },
    { icon: Cog6ToothIcon, label: 'Settings', active: false },
  ];

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
