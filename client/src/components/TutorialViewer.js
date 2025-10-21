import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'; // A nice theme
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './TutorialViewer.css'; // We'll create this CSS file next

function TutorialViewer() {
  const [mdContent, setMdContent] = useState('Select a tutorial file (.md) to get started.');
  const fileInputRef = useRef(null);

  const handleOpenFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMdContent(e.target.result);
      };
      reader.readAsText(file);
    } else {
      setMdContent('Error: Please select a valid .md file.');
    }
    // Reset the input value to allow opening the same file again
    event.target.value = null;
  };

  return (
    <div className="tutorial-viewer">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".md"
        style={{ display: 'none' }}
      />
      <button onClick={handleOpenFileClick}>Open Tutorial File</button>

      <div className="markdown-content">
        <ReactMarkdown
          children={mdContent}
          remarkPlugins={[remarkGfm]}  // Adds GitHub Flavored Markdown (tables, etc.)
          rehypePlugins={[rehypeRaw]}  // Renders HTML inside markdown
          components={{
            // This is the magic for syntax highlighting code blocks
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, '')}
                  style={tomorrow}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        />
      </div>
    </div>
  );
}

export default TutorialViewer;