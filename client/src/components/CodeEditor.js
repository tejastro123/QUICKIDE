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

  return (
    <div className="panel-content">
      <Editor
        height="100%"
        defaultLanguage="qucpl"
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        value={code}
        beforeMount={handleEditorWillMount}
        onChange={(value) => setCode(value || '')}
        options={{ 
          minimap: { enabled: false },
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