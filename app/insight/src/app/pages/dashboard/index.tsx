import React from 'react';

export function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>This is the dashboard page for the Insight application.</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p>Your analytics data will appear here.</p>
        </div>
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold">Reports</h2>
          <p>Your reports will appear here.</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;