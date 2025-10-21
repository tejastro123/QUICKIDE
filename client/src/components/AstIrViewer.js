import React from 'react';
import ReactJson from 'react-json-view';

function AstIrViewer({ ast, ir }) {
  return (
    <div className="panel-content scrollable">
      <h3>Abstract Syntax Tree (AST)</h3>
      {ast ? (
        <ReactJson src={ast} theme="monokai" collapsed={2} />
      ) : (
        <p>Run "Parse AST" to view.</p>
      )}
      <hr />
      <h3>Intermediate Representation (IR)</h3>
      {ir ? (
        <ReactJson src={ir} theme="monokai" collapsed={false} />
      ) : (
        <p>Run "Compile IR" to view.</p>
      )}
    </div>
  );
}

export default AstIrViewer;