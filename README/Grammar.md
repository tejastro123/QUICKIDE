
# 🧠 QuCPL programming langugae Grammar (With Detailed Explanations)

This document describes the grammar for QuCPL programming language used to construct and simulate quantum circuits. The grammar is defined using Lark, a modern parsing library for Python.

---

## 🔹 Start Rule

```bash
?start: stmt+
```

This is the entry point of the grammar. A valid program must consist of one or more statements.

---

## 🔹 Statement Rule

```bash
?stmt: qubit_decl ";"
     | qop_stmt ";"
     | measure_stmt ";"
     | print_stmt ";"
     | if_stmt
     | convert_command ";"
```

Defines the types of statements allowed in the language. All statements end with a semicolon, except the `if` statement which uses curly braces for blocks.

---

## 🔹 Qubit Declaration

```bash
qubit_decl: "qubit" id_list
```

Declares one or more quantum bits (qubits). For example:

```bash
qubit q0, q1, q2;
```

---

## 🔹 Quantum Operations

```bash
qop_stmt: "qop" GATE_NAME id_list
```

Applies quantum gates to the specified qubits. Example:

```bash
qop h q0;
qop cx q0, q1;
```

---

## 🔹 Allowed Gates

```bash
GATE_NAME: "h" | "x" | "y" | "z" | "cx" | "cz" | "ccx" | "swap" | "cy"
```

List of supported gates:

- `h`: Hadamard gate
- `x`, `y`, `z`: Pauli gates
- `cx`, `cz`, `cy`: Controlled gates
- `ccx`: Toffoli gate (controlled-controlled-not)
- `swap`: Swaps two qubit states

---

## 🔹 Measurement

```bash
measure_stmt: "measure" id_list "->" id_list
```

Measures qubits into classical bits. For example:

```bash
measure q0, q1 -> c0, c1;
```

---

## 🔹 Print Statement

```bash
print_stmt: "print" id_list
```

Prints the values of classical registers. Example:

```bash
print c0, c1;
```

---

## 🔹 Convert Command

```bash
convert_command: "convert" DECIMAL
```

Performs a numeric conversion or configuration. Usage depends on implementation.

Example:

```bash
convert 3;
```

---

## 🔹 If Statement

```bash
if_stmt: "if" "(" condition ")" "{" stmt+ "}" ("else" "{" stmt+ "}")?
```

Conditionally executes code based on classical register values.

Example:

```bash
if (c0 == 1) {
    qop x q1;
} else {
    print c1;
}
```

---

## 🔹 Condition

```bash
condition: CNAME "==" INT
```

Used in the `if` statement to compare a classical register with a value (usually 0 or 1).

---

## 🔹 Identifier List

```bash
id_list: CNAME ("," CNAME)*
```

Comma-separated list of variable names (e.g., qubits or classical bits).

---

## 🔹 Tokens and Whitespace

```bash
DECIMAL: /[0-9]+/

%import common.CNAME
%import common.INT
%import common.WS
%ignore WS
```

- `DECIMAL`: Matches whole numbers.
- `CNAME`: Matches valid variable names like `q0`, `c1`.
- `INT`: Integer literals.
- Whitespace is ignored.

---

## 🧪 Example Program

```bash
qubit q0, q1;
qop h q0;
qop cx q0, q1;
measure q0, q1 -> c0, c1;

if (c0 == 1) {
    print c1;
} else {
    qop x q1;
}
```

This example demonstrates declaring qubits, applying gates, measuring, and conditionally executing based on the measurement.

---

## ✅ Summary

This grammar defines a beginner-friendly language for building quantum circuits with classical control logic. It can be parsed and executed using Python's Lark parser and extended for simulation or visualization.
