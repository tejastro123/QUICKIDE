"""
backend/simulator.py  —  Pure NumPy statevector simulator
==========================================================
Replaces Qiskit + Qiskit-Aer entirely.

Public API (unchanged signatures so compiler_api/app.py needs no edits):
    simulate(ir, title, backend_name)  → PNG bytes  (histogram)
    get_qasm(ir)                       → QASM string
    get_debug_step(ir, step_index)     → dict with statevector + circuit_img
"""

from __future__ import annotations

import io
import json
import math
import cmath
import random
import numpy as np
import matplotlib
matplotlib.use("Agg")          # headless — no display required
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from collections import Counter
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Gate library  (all matrices are 2^k × 2^k complex numpy arrays)
# ---------------------------------------------------------------------------

_I2 = np.eye(2, dtype=complex)

GATES_1Q: Dict[str, np.ndarray] = {
    "x":  np.array([[0, 1], [1, 0]], dtype=complex),
    "y":  np.array([[0, -1j], [1j, 0]], dtype=complex),
    "z":  np.array([[1, 0], [0, -1]], dtype=complex),
    "h":  np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2),
    "s":  np.array([[1, 0], [0, 1j]], dtype=complex),
    "t":  np.array([[1, 0], [0, cmath.exp(1j * math.pi / 4)]], dtype=complex),
    "sdg": np.array([[1, 0], [0, -1j]], dtype=complex),
    "tdg": np.array([[1, 0], [0, cmath.exp(-1j * math.pi / 4)]], dtype=complex),
    # identity (barrier / no-op placeholder)
    "id": _I2.copy(),
}


def _rx(theta: float) -> np.ndarray:
    c, s = math.cos(theta / 2), math.sin(theta / 2)
    return np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)


def _ry(theta: float) -> np.ndarray:
    c, s = math.cos(theta / 2), math.sin(theta / 2)
    return np.array([[c, -s], [s, c]], dtype=complex)


def _rz(theta: float) -> np.ndarray:
    return np.array([[cmath.exp(-1j * theta / 2), 0],
                     [0, cmath.exp(1j * theta / 2)]], dtype=complex)


def _p(lam: float) -> np.ndarray:
    """Phase gate P(λ)."""
    return np.array([[1, 0], [0, cmath.exp(1j * lam)]], dtype=complex)


def _u(theta: float, phi: float, lam: float) -> np.ndarray:
    """General single-qubit unitary U(θ,φ,λ) — IBM convention."""
    c, s = math.cos(theta / 2), math.sin(theta / 2)
    return np.array([
        [c,                                -cmath.exp(1j * lam) * s],
        [cmath.exp(1j * phi) * s,   cmath.exp(1j * (phi + lam)) * c],
    ], dtype=complex)


# ---------------------------------------------------------------------------
# Statevector engine
# ---------------------------------------------------------------------------

class StatevectorSimulator:
    """
    Maintains a 2^n complex statevector and applies unitary gates.

    Qubit ordering convention: qubit 0 is the *least* significant bit (LSB),
    matching the most common convention in quantum computing literature and
    what the original Qiskit-based code used.
    """

    def __init__(self, n_qubits: int):
        self.n = n_qubits
        self.dim = 1 << n_qubits                       # 2^n
        self.state = np.zeros(self.dim, dtype=complex)
        self.state[0] = 1.0                            # |00...0⟩

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _full_unitary(self, gate: np.ndarray, target: int) -> np.ndarray:
        """Expand a 1-qubit gate into the full n-qubit space via Kronecker products."""
        ops = [_I2] * self.n
        ops[target] = gate
        # ops[0] is qubit 0 (LSB): U_n ⊗ … ⊗ U_1 ⊗ U_0
        result = ops[0]
        for op in ops[1:]:
            result = np.kron(op, result)
        return result

    def _apply_1q(self, gate: np.ndarray, target: int):
        """Apply a 1-qubit gate to the statevector in-place."""
        U = self._full_unitary(gate, target)
        self.state = U @ self.state

    def _apply_controlled(self, gate: np.ndarray, control: int, target: int):
        """
        Apply a controlled-U gate (one control qubit, one target qubit).
        Builds the full 2^n × 2^n unitary explicitly.
        """
        dim = self.dim
        new_state = self.state.copy()

        for basis in range(dim):
            ctrl_bit = (basis >> control) & 1
            if ctrl_bit == 1:
                # Which row of gate to use?
                tgt_bit = (basis >> target) & 1
                # Gate row 0 maps |0⟩ → gate[0,:], row 1 maps |1⟩ → gate[1,:]
                row = gate[tgt_bit]          # 2-element row
                # Amplitude contribution to this basis state
                amp = self.state[basis]
                # The gate redistributes amplitude between basis and basis^(tgt flip)
                # We need to compute the full column action: clear this and add gate col
                new_state[basis] -= amp * (1 - row[tgt_bit]) if False else 0
                # More cleanly: iterate output rows
        
        # Rebuild via explicit column action (cleaner and correct):
        new_state = np.zeros(dim, dtype=complex)
        for basis in range(dim):
            ctrl_bit = (basis >> control) & 1
            if ctrl_bit == 0:
                new_state[basis] += self.state[basis]
            else:
                tgt_bit = (basis >> target) & 1
                for out_tgt in range(2):
                    out_basis = (basis & ~(1 << target)) | (out_tgt << target)
                    new_state[out_basis] += gate[out_tgt, tgt_bit] * self.state[basis]

        self.state = new_state

    def _apply_ccx(self, ctrl0: int, ctrl1: int, target: int):
        """Toffoli gate: X on target iff both controls are |1⟩."""
        dim = self.dim
        new_state = self.state.copy()
        for basis in range(dim):
            if ((basis >> ctrl0) & 1) and ((basis >> ctrl1) & 1):
                flipped = basis ^ (1 << target)
                new_state[basis], new_state[flipped] = (
                    self.state[flipped], self.state[basis]
                )
        self.state = new_state

    def _apply_swap(self, q0: int, q1: int):
        """SWAP gate — exchange amplitudes where q0 and q1 differ."""
        dim = self.dim
        new_state = self.state.copy()
        for basis in range(dim):
            b0 = (basis >> q0) & 1
            b1 = (basis >> q1) & 1
            if b0 != b1:
                swapped = basis ^ (1 << q0) ^ (1 << q1)
                new_state[basis] = self.state[swapped]
        self.state = new_state

    # ------------------------------------------------------------------
    # Public gate methods
    # ------------------------------------------------------------------

    def apply_gate(self, op: str, targets: List[int], params: List[float] = []):
        """Dispatch to the appropriate gate implementation."""
        op = op.lower()

        # 1-qubit named gates
        if op in GATES_1Q:
            self._apply_1q(GATES_1Q[op], targets[0])

        # Parametric 1-qubit gates
        elif op == "rx":
            self._apply_1q(_rx(params[0]), targets[0])
        elif op == "ry":
            self._apply_1q(_ry(params[0]), targets[0])
        elif op == "rz":
            self._apply_1q(_rz(params[0]), targets[0])
        elif op == "p":
            self._apply_1q(_p(params[0]), targets[0])
        elif op == "u":
            # U(θ, φ, λ)
            theta = params[0] if len(params) > 0 else 0.0
            phi   = params[1] if len(params) > 1 else 0.0
            lam   = params[2] if len(params) > 2 else 0.0
            self._apply_1q(_u(theta, phi, lam), targets[0])

        # 2-qubit gates
        elif op == "cx":
            self._apply_controlled(GATES_1Q["x"], targets[0], targets[1])
        elif op == "cy":
            self._apply_controlled(GATES_1Q["y"], targets[0], targets[1])
        elif op == "cz":
            self._apply_controlled(GATES_1Q["z"], targets[0], targets[1])
        elif op == "ch":
            self._apply_controlled(GATES_1Q["h"], targets[0], targets[1])
        elif op == "swap":
            self._apply_swap(targets[0], targets[1])

        # Reset: project qubit to |0⟩ (collapse + conditional flip)
        elif op == "reset":
            if targets:
                t = targets[0]
                # Measure the qubit
                probs = self.probabilities()
                prob_1 = sum(
                    float((self.state[b].conj() * self.state[b]).real)
                    for b in range(self.dim) if (b >> t) & 1
                )
                if np.random.random() < prob_1:
                    # Collapsed to |1⟩ — flip it back
                    self._apply_1q(GATES_1Q["x"], t)
                # Renormalise after projection
                norm = math.sqrt(float(np.sum(self.probabilities())))
                if norm > 1e-12:
                    self.state /= norm

        # 3-qubit gates
        elif op == "ccx":
            self._apply_ccx(targets[0], targets[1], targets[2])

        # Barrier / no-op
        elif op in ("barrier", "print", "convert"):
            pass

        else:
            print(f"[WARN] Unknown gate '{op}' — skipped.")

    def probabilities(self) -> np.ndarray:
        """Return the Born-rule probability for each basis state."""
        return (self.state.conj() * self.state).real

    def measure_once(self, qubit_indices: List[int]) -> Dict[int, int]:
        """
        Sample the full statevector once and collapse it.
        Returns {qubit_index: measured_bit}.
        """
        probs = self.probabilities()
        outcome = int(np.random.choice(self.dim, p=probs))
        bits = {q: (outcome >> q) & 1 for q in range(self.n)}
        # Collapse: project onto the measured outcome (unnormalized then renormalise)
        new_state = np.zeros(self.dim, dtype=complex)
        new_state[outcome] = 1.0
        self.state = new_state
        return bits

    def statevector_list(self) -> List[List[float]]:
        """
        Return the statevector as a JSON-serialisable list of [real, imag] pairs.
        """
        return [[float(a.real), float(a.imag)] for a in self.state]


# ---------------------------------------------------------------------------
# IR executor
# ---------------------------------------------------------------------------

def _execute_ir(ir: dict, sim: StatevectorSimulator,
                qmap: Dict[str, int], cmap: Dict[str, int],
                classical_state: Dict[str, int],
                instructions: Optional[List[dict]] = None) -> None:
    """
    Walk through IR instructions and apply them to `sim`.
    classical_state is mutated in place by measure operations.
    """
    if instructions is None:
        instructions = ir.get("instructions", [])

    for instr in instructions:
        op = instr.get("op", "")

        if op == "measure":
            bits = sim.measure_once(list(qmap.values()))
            for q_name, c_name in zip(instr["qubits"], instr["classical"]):
                classical_state[c_name] = bits.get(qmap[q_name], 0)

        elif instr.get("type") == "if":
            cond = instr["condition"]
            var, expected = cond["var"], cond["value"]
            if classical_state.get(var, 0) == expected:
                _execute_ir(ir, sim, qmap, cmap, classical_state,
                            instructions=instr.get("then", []))
            else:
                _execute_ir(ir, sim, qmap, cmap, classical_state,
                            instructions=instr.get("else", []))

        elif op == "convert":
            # QuCPL `convert N` — initialise qubits to the binary rep of N
            val = instr.get("value", 0)
            binary_str = bin(val)[2:]
            print(f"[CONVERT] Decimal {val} → Binary {binary_str}")
            for i, bit in enumerate(reversed(binary_str)):
                if i < sim.n and bit == "1":
                    sim.apply_gate("x", [i])

        elif op in ("print", "barrier"):
            if op == "print":
                print(f"[PRINT] {', '.join(instr.get('args', []))}")

        elif op:
            args = instr.get("args", [])
            params = instr.get("params", [])
            targets = [qmap[a] for a in args if a in qmap]
            if targets:
                sim.apply_gate(op, targets, params)


def _build_maps(ir: dict):
    """Return (qmap, cmap) name→index mappings and the classical register."""
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])

    classical_bits: set = set()
    for instr in instructions:
        if instr.get("op") == "measure":
            classical_bits.update(instr.get("classical", []))
        elif instr.get("type") == "if":
            classical_bits.add(instr["condition"]["var"])

    classical_bits_sorted = sorted(classical_bits)
    qmap = {q: i for i, q in enumerate(qubits)}
    cmap = {c: i for i, c in enumerate(classical_bits_sorted)}
    return qmap, cmap


def _run_one_shot(ir: dict) -> str:
    """Run one shot of the simulation and return the bitstring result."""
    qubits = ir.get("qubits", [])
    n = len(qubits)
    if n == 0:
        return ""

    qmap, cmap = _build_maps(ir)
    classical_state: Dict[str, int] = {}

    sim = StatevectorSimulator(n)
    _execute_ir(ir, sim, qmap, cmap, classical_state)

    # Read off classical register results (bits that were measured)
    if cmap:
        bits_list = ["0"] * len(cmap)
        for c_name, c_idx in cmap.items():
            bits_list[c_idx] = str(classical_state.get(c_name, 0))
        return "".join(reversed(bits_list))          # MSB first, like Qiskit

    # If no measurements, sample from final statevector probabilities
    probs = sim.probabilities()
    outcome = int(np.random.choice(sim.dim, p=probs))
    return format(outcome, f"0{n}b")


# ---------------------------------------------------------------------------
# QASM generator  (hand-rolled — no Qiskit dependency)
# ---------------------------------------------------------------------------

def get_qasm(ir: dict) -> str:
    """
    Produce an OpenQASM 2.0-compatible string for the circuit described by `ir`.
    """
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])

    qmap, cmap = _build_maps(ir)
    n_q = len(qubits)
    n_c = len(cmap)

    lines = [
        "OPENQASM 2.0;",
        'include "qelib1.inc";',
    ]
    if n_q:
        lines.append(f"qreg q[{n_q}];")
    if n_c:
        lines.append(f"creg c[{n_c}];")

    def emit(instr):
        op = instr.get("op", "")
        args = instr.get("args", [])
        params = instr.get("params", [])

        if op in ("barrier", "print", "convert"):
            return

        if op == "measure":
            for q_name, c_name in zip(instr["qubits"], instr["classical"]):
                lines.append(f"measure q[{qmap[q_name]}] -> c[{cmap[c_name]}];")
            return

        if op in ("rx", "ry", "rz", "p") and params:
            theta = params[0]
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args)
            lines.append(f"{op}({theta:.6f}) {t_args};")
            return

        if op in ("cx", "cy", "cz", "ch", "swap", "ccx"):
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args)
            lines.append(f"{op} {t_args};")
            return

        if op in GATES_1Q or op in ("h", "x", "y", "z", "s", "t", "sdg", "tdg"):
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args)
            lines.append(f"{op} {t_args};")
            return

    def emit_instr(instr):
        if instr.get("type") == "if":
            cond = instr["condition"]
            var, val = cond["var"], cond["value"]
            c_idx = cmap.get(var, 0)
            for sub in instr.get("then", []):
                sub_op = sub.get("op", "")
                sub_args = ", ".join(f"q[{qmap[a]}]" for a in sub.get("args", []) if a in qmap)
                lines.append(f"if(c[{c_idx}]=={val}) {sub_op} {sub_args};")
        else:
            emit(instr)

    for instr in instructions:
        emit_instr(instr)

    return "\n".join(lines)


def get_qiskit_code(ir: dict) -> str:
    """
    Produce a runnable Qiskit Python script for the circuit described by `ir`.
    """
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])

    qmap, cmap = _build_maps(ir)
    n_q = len(qubits)
    n_c = len(cmap)

    lines = [
        "from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile",
        "from qiskit_aer import Aer",
        "",
        "# Initialize registers",
    ]
    if n_q:
        lines.append(f"q = QuantumRegister({n_q}, 'q')")
    if n_c:
        lines.append(f"c = ClassicalRegister({n_c}, 'c')")
    
    # Instantiate QuantumCircuit
    if n_q and n_c:
        lines.append("circuit = QuantumCircuit(q, c)")
    elif n_q:
        lines.append("circuit = QuantumCircuit(q)")
    else:
        lines.append("circuit = QuantumCircuit()")
    
    lines.append("")
    lines.append("# Apply gates")

    def emit(instr, condition=None):
        op = instr.get("op", "")
        args = instr.get("args", [])
        params = instr.get("params", [])

        if op in ("barrier", "print", "convert"):
            if op == "barrier":
                t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
                stmt = f"circuit.barrier({t_args})"
                if condition:
                    stmt += f".c_if(c, {condition['value']})"
                lines.append(stmt)
            return

        if op == "measure":
            for q_name, c_name in zip(instr["qubits"], instr["classical"]):
                stmt = f"circuit.measure(q[{qmap[q_name]}], c[{cmap[c_name]}])"
                if condition:
                    stmt += f".c_if(c, {condition['value']})"
                lines.append(stmt)
            return

        op_name = op
        if op == "id":
            op_name = "i"

        if op_name in ("rx", "ry", "rz", "p") and params:
            val = params[0]
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
            stmt = f"circuit.{op_name}({val:.6f}, {t_args})"
            if condition:
                stmt += f".c_if(c, {condition['value']})"
            lines.append(stmt)
            return

        if op_name == "u" and params:
            theta = params[0] if len(params) > 0 else 0.0
            phi   = params[1] if len(params) > 1 else 0.0
            lam   = params[2] if len(params) > 2 else 0.0
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
            stmt = f"circuit.u({theta:.6f}, {phi:.6f}, {lam:.6f}, {t_args})"
            if condition:
                stmt += f".c_if(c, {condition['value']})"
            lines.append(stmt)
            return

        if op_name in ("cx", "cy", "cz", "ch", "swap", "ccx"):
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
            stmt = f"circuit.{op_name}({t_args})"
            if condition:
                stmt += f".c_if(c, {condition['value']})"
            lines.append(stmt)
            return

        if op_name in ("h", "x", "y", "z", "s", "t", "sdg", "tdg", "i"):
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
            stmt = f"circuit.{op_name}({t_args})"
            if condition:
                stmt += f".c_if(c, {condition['value']})"
            lines.append(stmt)
            return

        if op_name == "reset":
            t_args = ", ".join(f"q[{qmap[a]}]" for a in args if a in qmap)
            stmt = f"circuit.reset({t_args})"
            if condition:
                stmt += f".c_if(c, {condition['value']})"
            lines.append(stmt)
            return

    def emit_instr(instr):
        if instr.get("type") == "if":
            cond = instr["condition"]
            for sub in instr.get("then", []):
                emit(sub, condition=cond)
        else:
            emit(instr)

    for instr in instructions:
        emit_instr(instr)

    lines.extend([
        "",
        "# Run the simulation",
        "simulator = Aer.get_backend('aer_simulator')",
        "compiled_circuit = transpile(circuit, simulator)",
        "job = simulator.run(compiled_circuit, shots=1024)",
        "result = job.result()",
        "counts = result.get_counts(circuit)",
        "print(\"Counts:\", counts)",
    ])

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# simulate()  — public entry point, returns PNG bytes
# ---------------------------------------------------------------------------

# Simple built-in depolarizing noise: randomly apply X/Y/Z after each gate
_NOISE_RATES: Dict[str, float] = {
    "ideal":       0.0,
    "fake_manila": 0.005,   # ~0.5 % per gate
    "fake_nairobi": 0.010,  # ~1.0 % per gate
}
_PAULI_NOISE = [GATES_1Q["x"], GATES_1Q["y"], GATES_1Q["z"]]


def _apply_depolarizing(sim: StatevectorSimulator, target: int, rate: float):
    """Probabilistically apply a random Pauli to `target` qubit."""
    if rate > 0 and random.random() < rate:
        pauli = random.choice(_PAULI_NOISE)
        sim._apply_1q(pauli, target)


def simulate(ir: dict, title: str = "Quantum Simulation",
             backend_name: str = "ideal", shots: int = 1024, theme: str = "dark") -> Optional[bytes]:
    """
    Run a multi-shot simulation of the circuit described by `ir`.

    Parameters
    ----------
    ir           : compiled IR dict
    title        : plot title
    backend_name : 'ideal', 'fake_manila', or 'fake_nairobi'
                   (noise models are approximated via simple depolarizing noise)
    shots        : number of repetitions
    theme        : 'dark' or 'light'

    Returns
    -------
    PNG bytes of the measurement histogram, or None if the circuit is empty.
    """
    qubits = ir.get("qubits", [])
    n = len(qubits)
    if n == 0:
        print("[INFO] No qubits declared — nothing to simulate.")
        return None

    instructions = ir.get("instructions", [])

    # Handle pure convert circuits (no classical measurement needed)
    if instructions and instructions[0].get("op") == "convert":
        val = instructions[0]["value"]
        binary_str = bin(val)[2:]
        print(f"[CONVERT] Decimal {val} → Binary {binary_str}")
        return None

    qmap, cmap = _build_maps(ir)
    noise_rate = _NOISE_RATES.get(backend_name, 0.0)
    print(f"[SIM] backend={backend_name}  shots={shots}  noise_rate={noise_rate}")

    results: List[str] = []
    for _ in range(shots):
        sim = StatevectorSimulator(n)
        classical_state: Dict[str, int] = {}

        for instr in instructions:
            op = instr.get("op", "")

            if op == "measure":
                bits = sim.measure_once(list(qmap.values()))
                for q_name, c_name in zip(instr["qubits"], instr["classical"]):
                    classical_state[c_name] = bits.get(qmap[q_name], 0)

            elif instr.get("type") == "if":
                cond = instr["condition"]
                var, expected = cond["var"], cond["value"]
                block = instr.get("then", []) if classical_state.get(var, 0) == expected \
                        else instr.get("else", [])
                for sub in block:
                    sub_args = [qmap[a] for a in sub.get("args", []) if a in qmap]
                    if sub_args:
                        sim.apply_gate(sub.get("op", ""), sub_args)
                        if noise_rate:
                            for t in sub_args:
                                _apply_depolarizing(sim, t, noise_rate)

            elif op in ("print", "barrier"):
                pass

            elif op == "convert":
                val = instr.get("value", 0)
                for i, bit in enumerate(reversed(bin(val)[2:])):
                    if i < n and bit == "1":
                        sim.apply_gate("x", [i])

            elif op:
                args = instr.get("args", [])
                params = instr.get("params", [])
                targets = [qmap[a] for a in args if a in qmap]
                if targets:
                    sim.apply_gate(op, targets, params)
                    if noise_rate:
                        for t in targets:
                            _apply_depolarizing(sim, t, noise_rate)

        # Collect result
        if cmap:
            bits_list = ["0"] * len(cmap)
            for c_name, c_idx in cmap.items():
                bits_list[c_idx] = str(classical_state.get(c_name, 0))
            results.append("".join(reversed(bits_list)))
        else:
            probs = sim.probabilities()
            outcome = int(np.random.choice(sim.dim, p=probs))
            results.append(format(outcome, f"0{n}b"))

    # Tally counts
    counts = dict(Counter(results))
    print(f"[SIM] counts = {counts}")

    # Build histogram PNG
    labels = sorted(counts.keys())
    values = [counts[k] for k in labels]

    is_dark = (theme == "dark")
    style = "dark_background" if is_dark else "default"

    with plt.style.context(style):
        fig, ax = plt.subplots(figsize=(max(6, len(labels) * 0.8 + 2), 4))
        bar_color = "#3b82f6" if is_dark else "#5B8CFF"
        bar_edge = "#60a5fa" if is_dark else "#2D4FA3"
        grid_color = (1.0, 1.0, 1.0, 0.1) if is_dark else (0.0, 0.0, 0.0, 0.1)

        bars = ax.bar(range(len(labels)), values,
                      color=bar_color, edgecolor=bar_edge, linewidth=0.8)

        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels([f"|{l}⟩" for l in labels], fontsize=10, rotation=45, ha="right")
        ax.set_ylabel("Counts", fontsize=11)
        ax.set_xlabel("Basis State", fontsize=11)
        ax.set_title(f"{title}  [{backend_name}  |  {shots} shots]", fontsize=12, fontweight="bold")
        ax.spines[["top", "right"]].set_visible(False)
        ax.yaxis.grid(True, linestyle="--", alpha=0.5, color=grid_color)
        ax.set_axisbelow(True)

        # Annotate bars with counts
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                    str(val), ha="center", va="bottom", fontsize=9,
                    color="#f8fafc" if is_dark else "#111122")

        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=100)
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()


# ---------------------------------------------------------------------------
# get_debug_step()  — public entry point for the debugger
# ---------------------------------------------------------------------------

def get_debug_step(ir: dict, step_index: int, theme: str = "dark") -> dict:
    """
    Compute the statevector after applying instructions[0 .. step_index]
    and generate a partial circuit visualisation.

    Returns
    -------
    {
        "statevector":  [[re, im], ...],   # 2^n entries
        "num_qubits":   int,
        "circuit_img":  bytes | None,      # PNG
        "current_gate": str,
    }
    """
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])
    n = len(qubits)

    partial_instructions = instructions[:step_index + 1]
    partial_ir = {"qubits": qubits, "instructions": partial_instructions,
                  "type": "Program"}

    qmap, cmap = _build_maps(partial_ir)
    sim = StatevectorSimulator(n) if n > 0 else None

    if sim:
        classical_state: Dict[str, int] = {}
        _execute_ir(partial_ir, sim, qmap, cmap, classical_state)

    # Circuit image via our own visualiser (no Qiskit)
    try:
        from backend.visualize import visualize_circuit
        circuit_img = visualize_circuit(partial_ir,
                                        title=f"Debug Step {step_index + 1}",
                                        theme=theme)
    except Exception as exc:
        print(f"[DEBUG VISUALIZE ERROR] {exc}")
        circuit_img = None

    current_gate = "Initial State"
    if step_index >= 0 and step_index < len(instructions):
        instr = instructions[step_index]
        current_gate = instr.get("op") or instr.get("type") or "?"

    return {
        "statevector": sim.statevector_list() if sim else [[1.0, 0.0]],
        "num_qubits": n,
        "circuit_img": circuit_img,
        "current_gate": current_gate,
    }


# ---------------------------------------------------------------------------
# CLI entry point (unchanged interface)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    _parser = argparse.ArgumentParser(description="Simulate IR from JSON")
    _parser.add_argument("ir_file", help="Path to IR JSON file")
    _parser.add_argument("--backend", default="ideal",
                         choices=["ideal", "fake_manila", "fake_nairobi"],
                         help="Noise backend")
    _parser.add_argument("--shots", type=int, default=1024)
    _args = _parser.parse_args()

    try:
        with open(_args.ir_file) as f:
            _ir = json.load(f)
        _img = simulate(_ir, title=_args.ir_file,
                        backend_name=_args.backend, shots=_args.shots)
        if _img:
            out = _args.ir_file.replace(".json", "_histogram.png")
            with open(out, "wb") as f:
                f.write(_img)
            print(f"[OK] Histogram saved to {out}")
    except FileNotFoundError:
        print(f"[FILE ERROR] IR file '{_args.ir_file}' not found.")
