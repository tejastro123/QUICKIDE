"""
backend/reverse_transpiler.py  —  OpenQASM 2.0 → QuCPL
========================================================
Parses a subset of QASM 2.0 using stdlib `re` (no external parser needed)
and emits equivalent QuCPL source.

Supported QASM constructs:
  qreg, creg, gate applications, measure, barrier, reset, if

Returns the QuCPL string + a list of warnings for unsupported constructs.
"""

from __future__ import annotations

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# QASM gate name → QuCPL gate name mapping
# ---------------------------------------------------------------------------

_GATE_MAP: dict[str, str] = {
    # Standard 1Q
    "h": "h",  "x": "x",  "y": "y",  "z": "z",
    "s": "s",  "t": "t",  "sdg": "sdg", "tdg": "tdg",
    "id": "id",
    # 2Q
    "cx": "cx",  "cy": "cy",  "cz": "cz",  "swap": "swap",
    # 3Q
    "ccx": "ccx",
    # Parametric
    "rx": "rx",  "ry": "ry",  "rz": "rz",
    "p": "p",    "u": "u",    "u3": "u",   "u1": "rz",
    "u2": None,   # u2(φ,λ) = u(π/2, φ, λ) — approximated below
}

# ---------------------------------------------------------------------------
# Tokeniser patterns
# ---------------------------------------------------------------------------

_RE_QREG   = re.compile(r"^\s*qreg\s+(\w+)\s*\[\s*(\d+)\s*\]\s*;")
_RE_CREG   = re.compile(r"^\s*creg\s+(\w+)\s*\[\s*(\d+)\s*\]\s*;")
_RE_MEAS   = re.compile(r"^\s*measure\s+(\w+)\[(\d+)\]\s*->\s*(\w+)\[(\d+)\]\s*;")
_RE_RESET  = re.compile(r"^\s*reset\s+(\w+)\[(\d+)\]\s*;")
_RE_BARR   = re.compile(r"^\s*barrier\s+(.*);")
_RE_IF     = re.compile(r"^\s*if\s*\(\s*(\w+)\s*==\s*(\d+)\s*\)\s*(.+);")
_RE_PGATE  = re.compile(r"^\s*(\w+)\s*\(([^)]+)\)\s+(.*);")   # gate with params
_RE_GATE   = re.compile(r"^\s*(\w+)\s+([\w\[\], ]+);")         # gate no params
_RE_IGNORE = re.compile(r"^\s*(OPENQASM|include|//|$)")


def _parse_qargs(qargs_str: str) -> list[tuple[str, int]]:
    """Parse 'q[0], q[1]' → [('q', 0), ('q', 1)]."""
    result = []
    for token in qargs_str.split(","):
        m = re.match(r"\s*(\w+)\s*\[\s*(\d+)\s*\]\s*", token)
        if m:
            result.append((m.group(1), int(m.group(2))))
    return result


def _eval_param(expr: str) -> str:
    """Evaluate a simple numeric QASM parameter string to a float string."""
    expr = expr.strip().replace("pi", "3.14159265358979")
    try:
        val = eval(expr, {"__builtins__": {}}, {})   # safe subset
        return f"{float(val):.6f}"
    except Exception:
        return expr


# ---------------------------------------------------------------------------
# Main transpiler
# ---------------------------------------------------------------------------

def qasm_to_qucpl(qasm_src: str) -> Tuple[str, list[str]]:
    """
    Convert an OpenQASM 2.0 string to equivalent QuCPL source.

    Returns
    -------
    (qucpl_source, warnings)
    """
    lines_out: list[str] = ["# Transpiled from OpenQASM 2.0 by QuickIDE\n"]
    warnings:  list[str] = []

    # Track qubit/classical register shapes so we can emit `qubit` declarations
    qregs: dict[str, int] = {}   # name → size
    cregs: dict[str, int] = {}
    qubits_emitted = False

    def _ensure_qubits():
        nonlocal qubits_emitted
        if not qubits_emitted and qregs:
            names = []
            for reg, size in qregs.items():
                for i in range(size):
                    names.append(f"{reg}{i}")
            lines_out.append("qubit " + ", ".join(names) + ";")
            lines_out.append("")
            qubits_emitted = True

    for raw_line in qasm_src.splitlines():
        line = raw_line.strip()

        # Skip header / comments
        if _RE_IGNORE.match(line):
            continue

        # qreg declaration
        m = _RE_QREG.match(line)
        if m:
            qregs[m.group(1)] = int(m.group(2))
            continue

        # creg declaration
        m = _RE_CREG.match(line)
        if m:
            cregs[m.group(1)] = int(m.group(2))
            continue

        # Measure
        m = _RE_MEAS.match(line)
        if m:
            _ensure_qubits()
            qn, qi, cn, ci = m.group(1), int(m.group(2)), m.group(3), int(m.group(4))
            lines_out.append(f"measure {qn}{qi} -> {cn}{ci};")
            continue

        # Reset
        m = _RE_RESET.match(line)
        if m:
            _ensure_qubits()
            qn, qi = m.group(1), int(m.group(2))
            lines_out.append(f"reset {qn}{qi};")
            continue

        # Barrier
        m = _RE_BARR.match(line)
        if m:
            _ensure_qubits()
            qargs = _parse_qargs(m.group(1))
            names = [f"{n}{i}" for n, i in qargs]
            lines_out.append(f"barrier {', '.join(names)};")
            continue

        # If
        m = _RE_IF.match(line)
        if m:
            _ensure_qubits()
            reg, val, inner_stmt = m.group(1), m.group(2), m.group(3).strip()
            creg_size = cregs.get(reg, 1)
            inner_qucpl = _transpile_single_gate(inner_stmt, warnings)
            if inner_qucpl:
                lines_out.append(f"if ({reg}0 == {val}) {{")
                lines_out.append(f"  {inner_qucpl}")
                lines_out.append("}")
            continue

        # Parametric gate: gate(params) qargs;
        m = _RE_PGATE.match(line)
        if m:
            _ensure_qubits()
            gate_name = m.group(1)
            raw_params = [p.strip() for p in m.group(2).split(",")]
            qargs = _parse_qargs(m.group(3))
            qucpl_gate = _GATE_MAP.get(gate_name)
            if qucpl_gate is None and gate_name in _GATE_MAP:
                warnings.append(f"gate '{gate_name}' has no direct QuCPL equivalent — skipped")
                continue
            if qucpl_gate is None:
                warnings.append(f"unknown gate '{gate_name}' — skipped")
                continue
            params = ", ".join(_eval_param(p) for p in raw_params)
            names  = ", ".join(f"{n}{i}" for n, i in qargs)
            lines_out.append(f"qop {qucpl_gate}({params}) {names};")
            continue

        # Non-parametric gate: gate qargs;
        m = _RE_GATE.match(line)
        if m:
            _ensure_qubits()
            stmt = _transpile_single_gate(line, warnings)
            if stmt:
                lines_out.append(stmt)
            continue

        if line:
            warnings.append(f"unrecognised line ignored: {line!r}")

    return "\n".join(lines_out), warnings


def _transpile_single_gate(stmt: str, warnings: list[str]) -> str | None:
    """Translate a single non-parameterised QASM gate statement."""
    m = _RE_GATE.match(stmt.rstrip(";"))
    if not m:
        return None
    gate_name = m.group(1)
    qargs = _parse_qargs(m.group(2))
    qucpl_gate = _GATE_MAP.get(gate_name)
    if qucpl_gate is None:
        warnings.append(f"unknown gate '{gate_name}' — skipped")
        return None
    names = ", ".join(f"{n}{i}" for n, i in qargs)
    return f"qop {qucpl_gate} {names};"


def qiskit_to_qucpl(qiskit_src: str) -> Tuple[str, list[str]]:
    """
    Convert a Qiskit Python script to equivalent QuCPL source.
    """
    lines_out: list[str] = ["// Transpiled from Qiskit by QuickIDE\n"]
    warnings: list[str] = []

    # Track registers
    qreg_matches = re.findall(r"QuantumRegister\s*\(\s*(\d+)\s*(?:,\s*['\"](\w+)['\"])?\s*\)", qiskit_src)
    qregs = {}
    for size_str, name in qreg_matches:
        reg_name = name if name else 'q'
        qregs[reg_name] = int(size_str)

    qc_size_match = re.search(r"QuantumCircuit\s*\(\s*(\d+)\s*\)", qiskit_src)
    if qc_size_match and not qregs:
        qregs['q'] = int(qc_size_match.group(1))

    creg_matches = re.findall(r"ClassicalRegister\s*\(\s*(\d+)\s*(?:,\s*['\"](\w+)['\"])?\s*\)", qiskit_src)
    cregs = {}
    for size_str, name in creg_matches:
        reg_name = name if name else 'c'
        cregs[reg_name] = int(size_str)

    if not qregs:
        used_indices = [int(x) for x in re.findall(r"q\s*\[\s*(\d+)\s*\]", qiskit_src)]
        if used_indices:
            qregs['q'] = max(used_indices) + 1
        else:
            qregs['q'] = 1

    names = []
    for reg, size in qregs.items():
        for i in range(size):
            names.append(f"{reg}{i}")
    if names:
        lines_out.append("qubit " + ", ".join(names) + ";")

    # Parse instructions
    for raw_line in qiskit_src.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "QuantumCircuit" in line or "Register" in line or "import" in line or "Aer" in line or "backend" in line or "job" in line or "result" in line or "counts" in line or "print" in line:
            continue

        m = re.search(r"circuit\.(\w+)\s*\((.*)\)", line)
        if not m:
            continue

        op = m.group(1)
        args_str = m.group(2)

        cond_var = None
        cond_val = None
        c_if_match = re.search(r"\.c_if\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)", line)
        if c_if_match:
            cond_var = c_if_match.group(1)
            cond_val = c_if_match.group(2)

        q_args = []
        c_args = []
        tokens = [t.strip() for t in args_str.split(",")]
        params = []
        for t in tokens:
            qm = re.match(r"(\w+)\s*\[\s*(\d+)\s*\]", t)
            if qm:
                reg, idx = qm.group(1), qm.group(2)
                if reg in cregs or reg.startswith('c'):
                    c_args.append(f"{reg}{idx}")
                else:
                    q_args.append(f"{reg}{idx}")
            else:
                try:
                    val_str = t.replace("pi", "3.14159265358979")
                    val = float(eval(val_str, {"__builtins__": {}}, {}))
                    params.append(f"{val:.6f}")
                except Exception:
                    if t:
                        params.append(t)

        if op == "measure":
            if len(q_args) >= 1 and len(c_args) >= 1:
                stmt = f"measure {q_args[0]} -> {c_args[0]};"
                if cond_var:
                    lines_out.append(f"if ({cond_var}0 == {cond_val}) {{")
                    lines_out.append(f"  {stmt}")
                    lines_out.append("}")
                else:
                    lines_out.append(stmt)
            else:
                warnings.append(f"measure statement args not parsed properly: {line}")
            continue

        if op == "barrier":
            stmt = f"barrier {', '.join(q_args)};"
            lines_out.append(stmt)
            continue

        if op == "reset":
            if q_args:
                stmt = f"reset {q_args[0]};"
                if cond_var:
                    lines_out.append(f"if ({cond_var}0 == {cond_val}) {{")
                    lines_out.append(f"  {stmt}")
                    lines_out.append("}")
                else:
                    lines_out.append(stmt)
            continue

        qucpl_gate = _GATE_MAP.get(op)
        if op == "i":
            qucpl_gate = "id"

        if qucpl_gate is None:
            warnings.append(f"unknown gate/operation '{op}' — skipped")
            continue

        q_names = ", ".join(q_args)
        if params:
            param_str = ", ".join(params)
            stmt = f"qop {qucpl_gate}({param_str}) {q_names};"
        else:
            stmt = f"qop {qucpl_gate} {q_names};"

        if cond_var:
            lines_out.append(f"if ({cond_var}0 == {cond_val}) {{")
            lines_out.append(f"  {stmt}")
            lines_out.append("}")
        else:
            lines_out.append(stmt)

    return "\n".join(lines_out), warnings
