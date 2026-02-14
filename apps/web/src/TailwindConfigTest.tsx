import React from 'react';

/**
 * Test component to verify custom Tailwind configuration
 * This component uses the custom vibe colors, gradient, and border radius
 */
export const TailwindConfigTest: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Tailwind Configuration Test</h2>
      
      {/* Test custom colors */}
      <div className="space-y-2">
        <h3 className="font-semibold">Custom Colors:</h3>
        <div className="bg-vibe-blue text-white p-4 rounded">VIBE Blue (#4F8EFF)</div>
        <div className="bg-vibe-purple text-white p-4 rounded">VIBE Purple (#A855F7)</div>
        <div className="bg-vibe-pink text-white p-4 rounded">VIBE Pink (#EC4899)</div>
      </div>

      {/* Test custom gradient */}
      <div className="space-y-2">
        <h3 className="font-semibold">Custom Gradient:</h3>
        <div className="bg-vibe-gradient text-white p-8 rounded text-center">
          VIBE Gradient Background
        </div>
      </div>

      {/* Test custom border radius */}
      <div className="space-y-2">
        <h3 className="font-semibold">Custom Border Radius:</h3>
        <div className="flex gap-4">
          <div className="bg-vibe-blue text-white p-4 rounded-xl">
            rounded-xl (12px)
          </div>
          <div className="bg-vibe-purple text-white p-4 rounded-2xl">
            rounded-2xl (16px)
          </div>
          <div className="bg-vibe-pink text-white p-4 rounded-3xl">
            rounded-3xl (24px)
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindConfigTest;
