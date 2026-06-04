import React, { useContext } from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { ThemeContext } from '../context/ThemeContext';

// Define QuCPL language configuration
const qucplLanguage = {
  defaultToken: '',
  tokenPostfix: '.qucpl',
  keywords: [
    'qubit', 'qop', 'measure', 'print', 'barrier', 'if', 'else', 'convert', 'reset'
  ],
  gates: [
    'h', 'x', 'y', 'z', 'cx', 'cy', 'cz', 'ccx', 'swap', 's', 't', 'sdg', 'tdg', 'id', 'rx', 'ry', 'rz', 'p', 'u'
  ],
  operators: [
    '=', '==', '->', ',', ';'
  ],
  symbols: /[=><!~?:&|+\-*/^%]+/,
  tokenizer: {
    root: [
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@gates': 'type.identifier',
          '@default': 'identifier'
        }
      }],
      { include: '@whitespace' },
      [/[{}()[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': ''
        }
      }],
      [/\d+([.]\d+)?/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/#.*$/, 'comment'],
    ],
  },
};

const handleEditorWillMount = (monaco) => {
  // Register a new language
  monaco.languages.register({ id: 'qucpl' });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('qucpl', qucplLanguage);

  // Register a completion item provider
  monaco.languages.registerCompletionItemProvider('qucpl', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        ...qucplLanguage.keywords.map(k => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
        })),
        ...qucplLanguage.gates.map(g => {
          let insertText = g;
          let detail = `Quantum Gate: ${g.toUpperCase()}`;
          if (['rx', 'ry', 'rz', 'p'].includes(g)) {
            insertText = `${g}(\${1:0.5})`;
            detail = `Parametric Gate: ${g.toUpperCase()}(θ)`;
          } else if (g === 'u') {
            insertText = `u(\${1:0.0}, \${2:0.0}, \${3:0.0})`;
            detail = `General Unitary Gate: U(θ, φ, λ)`;
          }
          return {
            label: g,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText,
            insertTextRules: insertText.includes('$') ? monaco.languages.CompletionItemInsertRule.InsertAsSnippet : undefined,
            detail
          };
        }),
        {
          label: 'bell_state',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;',
          insertTextRules: monaco.languages.CompletionItemInsertRule.InsertAsSnippet,
          detail: 'Create a Bell State'
        }
      ];
      return { suggestions };
    }
  });
};

function CodeEditor({ code, setCode }) {
  const { theme } = useContext(ThemeContext);

  const handleEditorDidMount = (editor, monaco) => {
    const model = editor.getModel();
    if (!model) return;

    const validate = () => {
      const value = model.getValue();
      const markers = [];
      const lines = value.split('\n');
      const declaredQubits = new Set();

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;

        // 1. Qubit declaration matching (e.g., "qubit q0, q1;")
        const qubitMatch = line.match(/qubit\s+([^;]+);/);
        if (qubitMatch) {
          const names = qubitMatch[1].split(',').map(n => n.trim());
          names.forEach(name => {
            if (name) declaredQubits.add(name);
          });
        }

        // 2. Gate operations (e.g., "qop h q0;")
        if (line.includes('qop')) {
          const match = line.match(/qop\s+([a-zA-Z0-9()\-.]+)\s+([^;]+);/);
          if (match) {
            const qubits = match[2].split(',').map(q => q.trim());
            qubits.forEach(q => {
              if (q && !declaredQubits.has(q)) {
                markers.push({
                  severity: monaco.MarkerSeverity.Error,
                  message: `Qubit '${q}' is used but not declared. Declare it using 'qubit ${q};' first.`,
                  startLineNumber: lineNum,
                  startColumn: line.indexOf(q) + 1,
                  endLineNumber: lineNum,
                  endColumn: line.indexOf(q) + q.length + 1
                });
              }
            });
          } else {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              message: "Invalid gate operation syntax. Expected: 'qop <gate> <qubits>;'",
              startLineNumber: lineNum,
              startColumn: 1,
              endLineNumber: lineNum,
              endColumn: line.length + 1
            });
          }
        }

        // 3. Measurement statements (e.g., "measure q0 -> c0;")
        if (line.includes('measure')) {
          const match = line.match(/measure\s+([^->\s]+)\s*->\s*([^;]+);/);
          if (!match) {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              message: "Invalid measure syntax. Expected: 'measure <qubits> -> <classical_bits>;'",
              startLineNumber: lineNum,
              startColumn: 1,
              endLineNumber: lineNum,
              endColumn: line.length + 1
            });
          } else {
            const qubits = match[1].split(',').map(q => q.trim());
            qubits.forEach(q => {
              if (q && !declaredQubits.has(q)) {
                markers.push({
                  severity: monaco.MarkerSeverity.Error,
                  message: `Qubit '${q}' is measured but not declared.`,
                  startLineNumber: lineNum,
                  startColumn: line.indexOf(q) + 1,
                  endLineNumber: lineNum,
                  endColumn: line.indexOf(q) + q.length + 1
                });
              }
            });
          }
        }
      });

      monaco.editor.setModelMarkers(model, 'qucpl', markers);
    };

    // Run diagnostics immediately and bind to changes
    validate();
    const disposable = model.onDidChangeContent(validate);

    // clean up on unmount
    return () => {
      disposable.dispose();
    };
  };

  return (
    <div className="panel-content">
      <Editor
        height="100%"
        defaultLanguage="qucpl"
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        value={code}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={(value) => setCode(value || '')}
        options={{ 
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 }
        }}
      />
    </div>
  );
}

export default CodeEditor;