import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ProjectCard from '../components/ProjectCard';
import Button from '../components/Button';
import { PlusIcon, ArrowUpIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [activeTab, setActiveTab] = useState('my-projects');
  const [prompt, setPrompt] = useState('');

  const tabs = [
    { id: 'recent', label: 'Recently viewed' },
    { id: 'my-projects', label: 'My projects' },
    { id: 'starred', label: 'Starred' },
    { id: 'templates', label: 'Templates' },
  ];

  const projects = [
    { id: '1', name: 'vibe-self-test', lastEdited: '2 hours ago', isStarred: true },
    { id: '2', name: 'UbiGrowth Marketing Hub', lastEdited: '1 day ago', isStarred: false },
    { id: '3', name: 'mindset-flow-activate', lastEdited: '3 days ago', isStarred: false },
  ];

  const handleToggleStar = (id: string) => {
    console.log('Toggle star for project:', id);
  };

  const handleProjectClick = (id: string) => {
    console.log('Open project:', id);
  };

  const handleNewProject = () => {
    console.log('Create new project');
  };

  const handleSubmitPrompt = () => {
    console.log('Submit prompt:', prompt);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Title and New Project Button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Projects</h2>
              <Button onClick={handleNewProject} className="flex items-center space-x-2">
                <PlusIcon className="w-5 h-5" />
                <span>New Project</span>
              </Button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Prompt Input Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to build?
              </label>
              <div className="flex space-x-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your idea or feature..."
                  rows={3}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <Button 
                  onClick={handleSubmitPrompt}
                  className="self-end flex items-center space-x-2"
                  disabled={!prompt.trim()}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  <span>Submit</span>
                </Button>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  onToggleStar={handleToggleStar}
                  onClick={handleProjectClick}
                />
              ))}
            </div>

            {/* Empty State (shown when no projects) */}
            {projects.length === 0 && (
              <div className="text-center py-12">
                <PlusIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Get started by creating your first project
                </p>
                <Button onClick={handleNewProject}>
                  Create New Project
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
