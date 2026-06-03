import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/hljs';

function QiskitViewer({ qiskitCode, placeholder }) {
  if (!qiskitCode) {
    return (
      <div className="panel-content scrollable" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        {placeholder || "Compile to see Qiskit Python code."}
      </div>
    );
  }

  return (
    <div className="panel-content" style={{ backgroundColor: '#1e1e1e', height: '100%' }}>
      <SyntaxHighlighter
        language="python"
        style={shadesOfPurple}
        customStyle={{
          margin: 0,
          padding: '20px',
          height: '100%',
          fontSize: '0.9rem',
          backgroundColor: 'transparent'
        }}
      >
        {qiskitCode}
      </SyntaxHighlighter>
    </div>
  );
}

export default QiskitViewer;
