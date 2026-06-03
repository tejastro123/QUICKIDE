# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QuickIDE 2.0** is a fullstack quantum circuit development environment with:
- Custom quantum programming language (**QuCPL**) with Lark-based parser
- Python/Flask quantum engine (Qiskit backend)
- Node.js/Express API server with MongoDB
- React frontend with Monaco editor

## Quick Start Commands

### Run All Services (concurrently required)

```bash
# Terminal 1: Node.js API Server
cd server && npm run dev

# Terminal 2: Flask Quantum Engine
cd compiler_api && python app.py

# Terminal 3: React Frontend
cd client && npm start
```

### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run parser standalone
python backend/parser.py

# Compile AST to IR
python backend/compiler.py <ast.json> <output.json>

# Run simulation
python backend/simulator.py <ir.json>
```

### Frontend Development
```bash
cd client
npm install
npm start        # Dev server (port 3000)
npm test         # Run tests
npm run build    # Production build
```

### Server Development
```bash
cd server
npm install
npm run dev      # Nodemon auto-restart
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React (3000)  │────▶│  Node/Express    │────▶│  MongoDB         │
│   Monaco Editor │     │  (port 5000)     │     │  (projects/jobs)│
└─────────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Flask Engine    │
│  (port 5001)     │
│  - Parser (Lark) │
│  - Compiler      │
│  - Simulator     │
│  - IBM Cloud     │
└──────────────────┘
```

## QuCPL Language Syntax

```qucpl
// Qubit declaration
qubit q0, q1, q2;

// Quantum gates
qop h q0;
qop cx q0, q1;
qop ccx q0, q1, q2;

// Measurement
measure q0, q1 -> c0, c1;

// Classical control
if (c0 == 1) {
    qop x q1;
} else {
    print c1;
}

// Convert decimal to binary state
convert 5;

// Barrier
barrier q0, q1;
```

**Gates:** `h`, `x`, `y`, `z`, `cx`, `cz`, `cy`, `ccx`, `swap`

## Core Pipeline

1. **Parse** (`backend/parser.py`): QuCPL → AST (JSON) via Lark grammar
2. **Compile** (`backend/compiler.py`): AST → IR (JSON intermediate representation)
3. **Visualize** (`backend/visualize.py`): IR → Circuit diagram (matplotlib)
4. **Simulate** (`backend/simulator.py`): IR → Qiskit circuit → Histogram

## API Endpoints

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/parse` | POST | `{code}` | Returns AST |
| `/compile` | POST | `{ast}` | Returns IR |
| `/transpile` | POST | `{ir}` | Returns OpenQASM 3.0 |
| `/visualize` | POST | `{ir}` | Returns PNG |
| `/simulate` | POST | `{ir, backend}` | Returns histogram PNG |
| `/debug/step` | POST | `{ir, index}` | Returns statevector at step |
| `/cloud/submit` | POST | `{ir, token, backend}` | Submit to IBM Q |
| `/cloud/status` | POST | `{jobId, token}` | Get job status |

## Key Files

- `grammar.lark` - QuCPL language grammar (Lark format)
- `backend/parser.py` - Lark parser, ASTBuilder transformer
- `backend/compiler.py` - AST to IR compilation
- `backend/simulator.py` - Qiskit circuit builder, supports `ideal`, `fake_manila`, `fake_nairobi`
- `backend/visualize.py` - Circuit diagram generation
- `compiler_api/app.py` - Flask API server
- `server/server.js` - Express API + MongoDB
- `server/routes/api.js` - API route handlers
- `client/src/` - React components (Monaco editor, visualizers)

## IBM Quantum Integration

Real hardware submission via `qiskit-ibm-runtime`. Requires API token.
Supported backends: `ibm_osaka`, `ibm_brisbane`, etc.
Noise modeling via `FakeManila`, `FakeNairobi` providers.
