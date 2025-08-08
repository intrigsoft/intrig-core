import React, { useState } from 'react';

export function TestError() {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('This is a test error');
  }
  
  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-semibold mb-4">Error Boundary Test</h2>
      <p className="mb-4">Click the button below to trigger an error and test the error boundary.</p>
      <button 
        onClick={() => setShouldError(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Trigger Error
      </button>
    </div>
  );
}

export default TestError;