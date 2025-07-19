# AST OF BELL AND GHZ STATES

## Example: **Bell State Program**

### 🌳 AST Dump Example: Bell Program

QUCPL Code:

```bash
qubit q0, q1;
qop h q0;
qop cx q0, q1;
measure q0, q1 -> c0, c1;
print c0, c1;
```

- `qubit`: Declare one or more qubits
- Gate calls like `H(q0)` and `CNOT(q0, q1)`
- `MEASURE` maps quantum results to classical bits
- `PRINT` outputs classical bit values

---
AST Output:

```json
{
  "type": "Program",
  "body": [
    {
      "type": "QubitDecl",
      "qubits": [["q0", "q1"]]
    },
    {
      "type": "QuantumOp",
      "gate": "h",
      "qubits": ["q0"]
    },
    {
      "type": "QuantumOp",
      "gate": "cx",
      "qubits": ["q0", "q1"]
    },
    {
      "type": "Measure",
      "qubits": [["q0", "q1"]],
      "classical": [["c0", "c1"]]
    },
    {
      "type": "Print",
      "args": [["c0", "c1"]]
    }
  ]
}
```

---

## Example: **GHZ State Program**

### ⚛️ AST Dump Example: Bell Program

```bash
qubit q0, q1, q2;
qop h q0;
qop cx q0, q1;
qop cx q1, q2;
measure q0, q1, q2 -> c0, c1, c2;
if (c0 == 1) {
    print c0;
} else {
    print c1;
}
```

AST Output:

```json
{
  "type": "Program",
  "body": [
    { "type": "QubitDecl", "qubits": [["q0", "q1", "q2"]] },
    { "type": "QuantumOp", "gate": "h", "qubits": ["q0"] },
    { "type": "QuantumOp", "gate": "cx", "qubits": ["q0", "q1"] },
    { "type": "QuantumOp", "gate": "cx", "qubits": ["q1", "q2"] },
    { "type": "Measure", "qubits": [["q0", "q1", "q2"]], "classical": [["c0", "c1", "c2"]] },
    {
      "type": "If",
      "condition": { "type": "Condition", "var": "c0", "value": 1 },
      "then": { "type": "Print", "args": [["c0"]] },
      "else": { "type": "Print", "args": [["c1"]] }
    }
  ]
}
```

---

When prompted:

```qucpl
qubit q0, q1;
qop h q0;
qop cx q0, q1;
measure q0, q1 -> c0, c1;
print c0, c1;
```

### 📤 Output

- JSON AST is saved to `bell_ast.json` or similar
- Console message: `AST saved to bell_ast.json`

---
