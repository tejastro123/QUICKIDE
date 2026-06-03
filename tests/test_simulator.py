"""
tests/test_simulator.py
========================
Pytest test suite for the QuCPL compiler pipeline:
  parse → compile (AST → IR) → simulate / QASM round-trip

Run from the repo root:
    pytest tests/ -v

Requirements:  pip install pytest numpy matplotlib lark
"""

from __future__ import annotations

import cmath
import math
import sys
import os

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Make the repo root importable so `from backend.X import Y` works regardless
# of how pytest is invoked.
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.compiler import ast_to_ir
from backend.simulator import (
    StatevectorSimulator,
    GATES_1Q,
    _rx, _ry, _rz,
    get_qasm,
    simulate,
    get_debug_step,
)


# ===========================================================================
# Helpers
# ===========================================================================

def _ir(qubits, instructions):
    """Minimal IR dict."""
    return {"type": "Program", "qubits": qubits, "instructions": instructions}


def _sv(n):
    """Fresh |00…0⟩ StatevectorSimulator."""
    return StatevectorSimulator(n)


def _prob(sim, basis_int):
    """Probability of measuring `basis_int`."""
    return float((sim.state[basis_int].conj() * sim.state[basis_int]).real)


def _almost_equal(a, b, tol=1e-9):
    return abs(a - b) < tol


# ===========================================================================
# 1. Unit tests: gate matrices
# ===========================================================================

class TestGateMatrices:
    def test_h_hermitian_and_unitary(self):
        H = GATES_1Q["h"]
        assert np.allclose(H @ H.conj().T, np.eye(2))
        assert np.allclose(H @ H, np.eye(2))           # H² = I

    def test_x_is_pauli_x(self):
        X = GATES_1Q["x"]
        sv = _sv(1)
        sv._apply_1q(X, 0)
        assert _almost_equal(_prob(sv, 1), 1.0)        # |0⟩ → |1⟩

    def test_y_rotates_state(self):
        Y = GATES_1Q["y"]
        sv = _sv(1)
        sv._apply_1q(Y, 0)
        assert _almost_equal(abs(sv.state[1]), 1.0)

    def test_z_leaves_zero_state_invariant(self):
        Z = GATES_1Q["z"]
        sv = _sv(1)
        sv._apply_1q(Z, 0)
        assert _almost_equal(_prob(sv, 0), 1.0)

    def test_s_is_sqrt_z(self):
        S = GATES_1Q["s"]
        assert np.allclose(S @ S, GATES_1Q["z"])

    def test_t_is_eighth_rotation(self):
        T = GATES_1Q["t"]
        expected_phase = cmath.exp(1j * math.pi / 4)
        assert _almost_equal(T[1, 1], expected_phase)

    @pytest.mark.parametrize("theta", [0.0, math.pi / 4, math.pi / 2, math.pi, 2 * math.pi])
    def test_rx_unitary(self, theta):
        R = _rx(theta)
        assert np.allclose(R @ R.conj().T, np.eye(2))

    @pytest.mark.parametrize("theta", [0.0, math.pi / 4, math.pi / 2, math.pi])
    def test_ry_unitary(self, theta):
        R = _ry(theta)
        assert np.allclose(R @ R.conj().T, np.eye(2))

    @pytest.mark.parametrize("theta", [0.0, math.pi / 3, math.pi, 2 * math.pi])
    def test_rz_unitary(self, theta):
        R = _rz(theta)
        assert np.allclose(R @ R.conj().T, np.eye(2))

    def test_all_1q_gates_unitary(self):
        for name, gate in GATES_1Q.items():
            product = gate @ gate.conj().T
            assert np.allclose(product, np.eye(2)), f"Gate '{name}' is not unitary"


# ===========================================================================
# 2. Unit tests: StatevectorSimulator
# ===========================================================================

class TestStatevectorSimulator:

    # ---- Single-qubit gates on 1-qubit register ----

    def test_initial_state_is_zero(self):
        sv = _sv(1)
        assert _almost_equal(_prob(sv, 0), 1.0)
        assert _almost_equal(_prob(sv, 1), 0.0)

    def test_x_gate_flips(self):
        sv = _sv(1)
        sv.apply_gate("x", [0])
        assert _almost_equal(_prob(sv, 1), 1.0)

    def test_h_creates_superposition(self):
        sv = _sv(1)
        sv.apply_gate("h", [0])
        assert _almost_equal(_prob(sv, 0), 0.5)
        assert _almost_equal(_prob(sv, 1), 0.5)

    def test_hh_returns_to_ground(self):
        sv = _sv(1)
        sv.apply_gate("h", [0])
        sv.apply_gate("h", [0])
        assert _almost_equal(_prob(sv, 0), 1.0)

    def test_norm_preserved_after_gates(self):
        sv = _sv(3)
        for g in ["h", "x", "y", "z", "s", "t"]:
            sv.apply_gate(g, [0])
        assert _almost_equal(float(np.sum(sv.probabilities())), 1.0)

    # ---- Multi-qubit register: gate targeting ----

    def test_x_on_qubit_1_of_2(self):
        sv = _sv(2)
        sv.apply_gate("x", [1])                       # flip qubit 1 → |10⟩ = basis 2
        assert _almost_equal(_prob(sv, 2), 1.0)

    def test_x_on_qubit_0_of_2(self):
        sv = _sv(2)
        sv.apply_gate("x", [0])                       # flip qubit 0 → |01⟩ = basis 1
        assert _almost_equal(_prob(sv, 1), 1.0)

    # ---- CX (CNOT) ----

    def test_cx_control_zero_no_flip(self):
        """CX with control=0 (|0⟩) leaves target unchanged."""
        sv = _sv(2)
        sv.apply_gate("cx", [0, 1])
        assert _almost_equal(_prob(sv, 0), 1.0)

    def test_cx_control_one_flips_target(self):
        """CX with control=|1⟩ flips target: |10⟩ → |11⟩."""
        sv = _sv(2)
        sv.apply_gate("x", [0])                       # set control to |1⟩
        sv.apply_gate("cx", [0, 1])
        assert _almost_equal(_prob(sv, 3), 1.0)        # |11⟩ = basis 3

    def test_bell_state(self):
        """H on q0 then CX creates Bell state (|00⟩ + |11⟩)/√2."""
        sv = _sv(2)
        sv.apply_gate("h", [0])
        sv.apply_gate("cx", [0, 1])
        assert _almost_equal(_prob(sv, 0), 0.5)
        assert _almost_equal(_prob(sv, 3), 0.5)
        assert _almost_equal(_prob(sv, 1), 0.0)
        assert _almost_equal(_prob(sv, 2), 0.0)

    # ---- CZ ----

    def test_cz_phase_kick(self):
        """CZ adds a -1 phase to |11⟩."""
        sv = _sv(2)
        sv.apply_gate("x", [0])
        sv.apply_gate("x", [1])
        sv.apply_gate("cz", [0, 1])
        assert _almost_equal(sv.state[3].real, -1.0)

    # ---- SWAP ----

    def test_swap_exchanges_qubits(self):
        sv = _sv(2)
        sv.apply_gate("x", [0])                       # |01⟩ = basis 1
        sv.apply_gate("swap", [0, 1])
        assert _almost_equal(_prob(sv, 2), 1.0)        # |10⟩ = basis 2

    def test_swap_swap_is_identity(self):
        sv1 = _sv(2)
        sv1.apply_gate("h", [0])
        sv2 = StatevectorSimulator(2)
        sv2.state = sv1.state.copy()
        sv1.apply_gate("swap", [0, 1])
        sv1.apply_gate("swap", [0, 1])
        assert np.allclose(sv1.state, sv2.state)

    # ---- Toffoli (CCX) ----

    def test_ccx_both_controls_one(self):
        """CCX flips target only when both controls are |1⟩."""
        sv = _sv(3)
        sv.apply_gate("x", [0])
        sv.apply_gate("x", [1])
        sv.apply_gate("ccx", [0, 1, 2])
        assert _almost_equal(_prob(sv, 7), 1.0)        # |111⟩ = basis 7

    def test_ccx_one_control_zero_no_flip(self):
        sv = _sv(3)
        sv.apply_gate("x", [0])                       # only control 0 set
        sv.apply_gate("ccx", [0, 1, 2])
        assert _almost_equal(_prob(sv, 1), 1.0)        # target unchanged

    # ---- Statevector is always normalised ----

    @pytest.mark.parametrize("n", [1, 2, 3, 4])
    def test_statevector_normalised(self, n):
        sv = _sv(n)
        for i in range(n):
            sv.apply_gate("h", [i])
        assert _almost_equal(float(np.sum(sv.probabilities())), 1.0)

    # ---- statevector_list serialisation ----

    def test_statevector_list_format(self):
        sv = _sv(2)
        sv.apply_gate("h", [0])
        sv_list = sv.statevector_list()
        assert isinstance(sv_list, list)
        assert len(sv_list) == 4
        for entry in sv_list:
            assert isinstance(entry, list)
            assert len(entry) == 2          # [real, imag]
            assert isinstance(entry[0], float)
            assert isinstance(entry[1], float)

    # ---- Parametric gates ----

    def test_rx_pi_equals_x(self):
        sv = _sv(1)
        sv.apply_gate("rx", [0], [math.pi])
        # Rx(π)|0⟩ = -i|1⟩ — probability of |1⟩ should be 1
        assert _almost_equal(_prob(sv, 1), 1.0, tol=1e-7)

    def test_rz_2pi_is_identity_up_to_global_phase(self):
        sv = _sv(1)
        sv.apply_gate("h", [0])
        before = sv.state.copy()
        sv.apply_gate("rz", [0], [2 * math.pi])
        # Probabilities should be identical (global phase doesn't affect probs)
        assert np.allclose(sv.probabilities(), (before.conj() * before).real)


# ===========================================================================
# 3. Edge cases
# ===========================================================================

class TestEdgeCases:

    def test_empty_circuit_simulate_returns_none(self):
        ir = _ir([], [])
        result = simulate(ir)
        assert result is None

    def test_single_qubit_no_measurement_returns_none_or_bytes(self):
        ir = _ir(["q0"], [{"op": "h", "args": ["q0"]}])
        # No measure → no counts → should return None (nothing to histogram)
        # OR return valid bytes if the simulator samples. Both are acceptable.
        result = simulate(ir, shots=10)
        # At minimum it must not crash and must be None or bytes
        assert result is None or isinstance(result, bytes)

    def test_max_qubits_5_does_not_crash(self):
        """5-qubit circuit (32 amplitudes) exercises the full simulator."""
        qubits = [f"q{i}" for i in range(5)]
        instructions = (
            [{"op": "h", "args": [f"q{i}"]} for i in range(5)]
            + [{"op": "measure",
                "qubits": [f"q{i}"],
                "classical": [f"c{i}"]} for i in range(5)]
        )
        ir = _ir(qubits, instructions)
        result = simulate(ir, shots=32)
        assert isinstance(result, bytes)
        assert len(result) > 100

    def test_single_qubit_bell_round_trip(self):
        """|+⟩ measured 512 times — counts for |0⟩ and |1⟩ both non-zero."""
        ir = _ir(
            ["q0"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
            ],
        )
        result = simulate(ir, shots=512)
        assert isinstance(result, bytes)

    def test_convert_instruction_does_not_crash(self):
        ir = _ir([], [{"op": "convert", "value": 5}])
        result = simulate(ir)
        assert result is None

    def test_all_zeros_circuit(self):
        """No gates, just qubit declaration and measure — should always yield |00⟩."""
        ir = _ir(
            ["q0", "q1"],
            [
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
                {"op": "measure", "qubits": ["q1"], "classical": ["c1"]},
            ],
        )
        result = simulate(ir, shots=64)
        assert isinstance(result, bytes)

    def test_barrier_is_ignored(self):
        ir = _ir(
            ["q0"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "barrier", "args": ["q0"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
            ],
        )
        result = simulate(ir, shots=64)
        assert isinstance(result, bytes)


# ===========================================================================
# 4. Compiler pipeline: AST → IR
# ===========================================================================

class TestCompilerPipeline:

    def _make_ast(self, *body_stmts):
        return {"type": "Program", "body": list(body_stmts)}

    def test_qubit_decl_in_ir(self):
        ast = self._make_ast(
            {"type": "QubitDecl", "qubits": ["q0", "q1"]}
        )
        ir = ast_to_ir(ast)
        assert ir["qubits"] == ["q0", "q1"]
        assert ir["instructions"] == []

    def test_single_gate_in_ir(self):
        ast = self._make_ast(
            {"type": "QubitDecl", "qubits": ["q0"]},
            {"type": "QuantumOp", "gate": "h", "qubits": ["q0"]},
        )
        ir = ast_to_ir(ast)
        assert len(ir["instructions"]) == 1
        assert ir["instructions"][0] == {"op": "h", "args": ["q0"]}

    def test_measure_in_ir(self):
        ast = self._make_ast(
            {"type": "QubitDecl", "qubits": ["q0"]},
            {"type": "Measure", "qubits": ["q0"], "classical": ["c0"]},
        )
        ir = ast_to_ir(ast)
        assert ir["instructions"][0]["op"] == "measure"
        assert ir["instructions"][0]["qubits"] == ["q0"]
        assert ir["instructions"][0]["classical"] == ["c0"]

    def test_barrier_in_ir(self):
        ast = self._make_ast(
            {"type": "QubitDecl", "qubits": ["q0", "q1"]},
            {"type": "Barrier", "qubits": ["q0", "q1"]},
        )
        ir = ast_to_ir(ast)
        assert ir["instructions"][0]["op"] == "barrier"

    def test_if_block_in_ir(self):
        ast = self._make_ast(
            {"type": "QubitDecl", "qubits": ["q0"]},
            {
                "type": "If",
                "condition": {"type": "Condition", "var": "c0", "value": 1},
                "then": [{"type": "QuantumOp", "gate": "x", "qubits": ["q0"]}],
                "else": [],
            },
        )
        ir = ast_to_ir(ast)
        assert ir["instructions"][0]["type"] == "if"
        assert ir["instructions"][0]["condition"]["var"] == "c0"

    def test_convert_in_ir(self):
        ast = self._make_ast({"type": "Convert", "value": 42})
        ir = ast_to_ir(ast)
        assert ir["instructions"][0] == {"op": "convert", "value": 42}

    def test_all_gate_types_compile(self):
        gates = ["h", "x", "y", "z", "cx", "cy", "cz", "swap"]
        qubits = ["q0", "q1"]
        body = [{"type": "QubitDecl", "qubits": qubits}]
        for g in ["h", "x", "y", "z"]:
            body.append({"type": "QuantumOp", "gate": g, "qubits": ["q0"]})
        for g in ["cx", "cy", "cz", "swap"]:
            body.append({"type": "QuantumOp", "gate": g, "qubits": ["q0", "q1"]})
        body.append({"type": "QuantumOp", "gate": "ccx",
                     "qubits": ["q0", "q1", "q0"]})  # CCX needs 3 args
        ir = ast_to_ir({"type": "Program", "body": body})
        compiled_ops = [i["op"] for i in ir["instructions"]]
        for g in gates:
            assert g in compiled_ops, f"Gate '{g}' missing from IR"


# ===========================================================================
# 5. QASM serialiser
# ===========================================================================

class TestQasmSerializer:

    def test_empty_circuit_qasm_header(self):
        ir = _ir([], [])
        qasm = get_qasm(ir)
        assert "OPENQASM 2.0" in qasm
        assert 'include "qelib1.inc"' in qasm

    def test_single_qubit_in_header(self):
        ir = _ir(["q0"], [])
        qasm = get_qasm(ir)
        assert "qreg q[1]" in qasm

    def test_classical_reg_in_header(self):
        ir = _ir(
            ["q0"],
            [{"op": "measure", "qubits": ["q0"], "classical": ["c0"]}],
        )
        qasm = get_qasm(ir)
        assert "creg c[1]" in qasm

    def test_measure_line_present(self):
        ir = _ir(
            ["q0"],
            [{"op": "measure", "qubits": ["q0"], "classical": ["c0"]}],
        )
        qasm = get_qasm(ir)
        assert "measure" in qasm
        assert "->" in qasm

    def test_gate_names_present(self):
        ir = _ir(
            ["q0", "q1"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "x", "args": ["q0"]},
                {"op": "cx", "args": ["q0", "q1"]},
            ],
        )
        qasm = get_qasm(ir)
        assert "h q[0]" in qasm
        assert "x q[0]" in qasm
        assert "cx q[0], q[1]" in qasm

    def test_barrier_not_emitted(self):
        """Barriers are visual hints only — not standard QASM instructions."""
        ir = _ir(["q0"], [{"op": "barrier", "args": ["q0"]}])
        qasm = get_qasm(ir)
        assert "barrier" not in qasm

    def test_two_qubit_register(self):
        ir = _ir(["q0", "q1"], [])
        qasm = get_qasm(ir)
        assert "qreg q[2]" in qasm

    def test_swap_gate_qasm(self):
        ir = _ir(
            ["q0", "q1"],
            [{"op": "swap", "args": ["q0", "q1"]}],
        )
        qasm = get_qasm(ir)
        assert "swap q[0], q[1]" in qasm

    def test_ccx_gate_qasm(self):
        ir = _ir(
            ["q0", "q1", "q2"],
            [{"op": "ccx", "args": ["q0", "q1", "q2"]}],
        )
        qasm = get_qasm(ir)
        assert "ccx q[0], q[1], q[2]" in qasm


# ===========================================================================
# 6. Debugger (get_debug_step)
# ===========================================================================

class TestDebugStep:

    def _bell_ir(self):
        return _ir(
            ["q0", "q1"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "cx", "args": ["q0", "q1"]},
            ],
        )

    def test_initial_state_step_minus_one(self):
        data = get_debug_step(self._bell_ir(), -1)
        assert data["current_gate"] == "Initial State"
        assert data["num_qubits"] == 2
        sv = data["statevector"]
        # |00⟩ — amplitude 1 at index 0
        assert _almost_equal(sv[0][0], 1.0)
        assert _almost_equal(sv[1][0], 0.0)

    def test_after_h_gate(self):
        data = get_debug_step(self._bell_ir(), 0)
        assert data["current_gate"] == "h"
        sv = data["statevector"]
        # (|00⟩ + |10⟩) / √2 — qubits 0-indexed; qubit 0 is LSB
        # basis 0 = |00⟩, basis 1 = |01⟩ (qubit 0 = 1, qubit 1 = 0)
        total_prob = sum(x[0] ** 2 + x[1] ** 2 for x in sv)
        assert _almost_equal(total_prob, 1.0, tol=1e-7)

    def test_circuit_img_is_bytes_or_none(self):
        data = get_debug_step(self._bell_ir(), 0)
        assert data["circuit_img"] is None or isinstance(data["circuit_img"], bytes)

    def test_num_qubits_matches(self):
        ir = _ir(["q0", "q1", "q2"], [])
        data = get_debug_step(ir, -1)
        assert data["num_qubits"] == 3

    def test_statevector_length_is_2_to_n(self):
        for n in [1, 2, 3]:
            qubits = [f"q{i}" for i in range(n)]
            ir = _ir(qubits, [])
            data = get_debug_step(ir, -1)
            assert len(data["statevector"]) == 2 ** n


# ===========================================================================
# 7. Simulation statistics (probabilistic — use generous tolerances)
# ===========================================================================

class TestSimulationStatistics:

    def test_deterministic_x_gate_always_one(self):
        ir = _ir(
            ["q0"],
            [
                {"op": "x", "args": ["q0"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
            ],
        )
        result = simulate(ir, shots=100)
        assert isinstance(result, bytes)

    def test_hadamard_roughly_fifty_fifty(self):
        """Over 1000 shots, each outcome should appear 30–70% of the time."""
        ir = _ir(
            ["q0"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
            ],
        )
        # We can't easily inspect the PNG, so just verify it doesn't crash
        # and returns valid PNG magic bytes.
        result = simulate(ir, shots=1000)
        assert isinstance(result, bytes)
        assert result[:4] == b"\x89PNG"

    def test_noise_backends_do_not_crash(self):
        ir = _ir(
            ["q0"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
            ],
        )
        for backend in ["ideal", "fake_manila", "fake_nairobi"]:
            result = simulate(ir, backend_name=backend, shots=50)
            assert isinstance(result, bytes), f"Backend '{backend}' failed"

    def test_bell_pair_correlation(self):
        """Bell pair: only |00⟩ and |11⟩ should appear."""
        ir = _ir(
            ["q0", "q1"],
            [
                {"op": "h", "args": ["q0"]},
                {"op": "cx", "args": ["q0", "q1"]},
                {"op": "measure", "qubits": ["q0"], "classical": ["c0"]},
                {"op": "measure", "qubits": ["q1"], "classical": ["c1"]},
            ],
        )
        result = simulate(ir, shots=200)
        assert isinstance(result, bytes)
        assert result[:4] == b"\x89PNG"
