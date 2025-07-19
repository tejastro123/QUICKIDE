
# QuCPL: Quantum Computing Programming Language

## 🧠 What is QuCPL?

**QuCPL (Quantum Computing Programming Language)** is a custom-designed, high-level quantum programming language developed as part of the Quinfosys™ initiative. It provides a simplified and expressive syntax for describing quantum circuits, classical control logic, and quantum algorithms such as Bell state generation, GHZ state preparation, and quantum teleportation.

The language is built with its own grammar, parser, and compiler infrastructure that generates an intermediate representation (IR) which integrates with the Qiskit framework for simulation and visualization.

---

## 🎯 Objectives

The main goal of the QuCPL project is to design a quantum programming language that:

- Allows easy and readable expression of quantum logic and circuits.
- Converts user-written code into an Abstract Syntax Tree (AST) and then into a machine-friendly JSON-based Intermediate Representation (IR).
- Executes quantum programs using Qiskit as the backend for circuit construction, simulation, and result visualization.
- Supports canonical quantum programs such as Bell state, GHZ state, and quantum teleportation.
- Includes robust error handling and validation at runtime.
- Provides user-friendly documentation and demo support via GitHub Pages and video tutorials.

---

## 🔧 Features

### ✅ Custom Grammar and Language Syntax

- A domain-specific language (DSL) for quantum computing.
- Defined using Lark for syntax parsing.
- Supports standard quantum gates (H, X, CX, CZ, SWAP, etc.) and conditional logic (`if`, `else`).

### ✅ AST Generation and Compilation

- Parses QuCPL source code into a structured Abstract Syntax Tree.
- AST nodes include `QubitDecl`, `QuantumOp`, `Measure`, `If`, `Convert`, and `Print`.

### ✅ Intermediate Representation (IR)

- AST is compiled into a clean, flattened IR in JSON format.
- IR is backend-independent and used for generating Qiskit-compatible quantum circuits.

### ✅ Qiskit Backend Integration

- The IR is translated into actual Qiskit quantum circuits.
- Circuits are executed using simulators like `AerSimulator`.

### ✅ Visualization Tools

- Circuit diagrams and measurement histograms are generated using:
  - `qiskit.visualization`
  - `matplotlib`
  - `plotly`

### ✅ Program Support

- Bell state preparation
- GHZ state creation
- Quantum teleportation
- Measurement and conditional operations

### ✅ Runtime Validation and Error Handling

- Validates qubit and classical register mapping.
- Checks for invalid operations (e.g., undeclared qubits).
- Graceful error messages during runtime.

### ✅ Documentation and Demonstrations

- Markdown-based documentation for syntax, usage, and features.
- GitHub Pages for hosting a documentation site.
- Video demos created using OBS or Loom.

---

## 💻 Installation Guide

Before using or contributing to QuCPL, set up your environment with the following steps:

### 1. Set Up Python Environment

Ensure you're using **Python 3.8 or higher**.

### 2. Install Dependencies

Use pip to install required packages:

```bash
pip install lark-parser qiskit matplotlib plotly jupyterlab qiskit-aer
```

If you're using Jupyter Notebook or JupyterLab for demos:

```bash
pip install notebook jupyterlab
```

### 4. Optional Tools

- **VS Code** or **PyCharm** – For code editing.
- **OBS Studio** or **Loom** – For screen recording/demo videos.
- **GitHub CLI** – For version control (optional).

---

## 📂 Directory Structure

```bash
qucpl/
|── overview.md             # This file
├── grammar.lark            # Language grammar definition
├── parser.py               # Lark-based parser and AST builder
├── ast_to_ir.py            # AST to IR compiler
├── ir_to_qiskit.py         # Qiskit integration
├── examples/               # Sample QuCPL programs (Bell, GHZ, etc.)
├── docs/                   # Markdown files for documentation
├── ast.json                # Sample output AST
├── program.ir.json         # Sample IR output

```

---

## 📌 Summary

QuCPL is a lightweight, educational quantum programming language that bridges the gap between human-readable quantum logic and Qiskit-executable quantum circuits. Through its layered compilation model and Qiskit integration, it provides a simple yet powerful platform for learning and demonstrating foundational quantum algorithms.
