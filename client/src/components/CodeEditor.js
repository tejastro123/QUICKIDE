import React from 'react';
import { Editor } from '@monaco-editor/react';

function CodeEditor({ code, setCode }) {
  return (
    <div className="panel-content">
      <Editor
        height="100%"
        defaultLanguage="plaintext" // You can research custom Monaco languages
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || '')}
        options={{ minimap: { enabled: false } }}
      />
    </div>
  );
}

export default CodeEditor;