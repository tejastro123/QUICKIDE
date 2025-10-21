import React, { useEffect, useRef } from 'react';

function Console({ logs }) {
  const consoleEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="panel-content console">
      {logs.map((log, index) => (
        <pre key={index} className={log.type}>
          {log.message}
        </pre>
      ))}
      <div ref={consoleEndRef} />
    </div>
  );
}

export default Console;