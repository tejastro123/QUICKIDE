# tests/test_compiler.py
import sys
import os
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.compiler import ast_to_ir

def test_compiler_empty_ast():
    ast = {"type": "Program", "body": []}
    ir = ast_to_ir(ast)
    assert ir["qubits"] == []
    assert ir["instructions"] == []

def test_compiler_qubit_mapping():
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0", "q1"]}
        ]
    }
    ir = ast_to_ir(ast)
    assert ir["qubits"] == ["q0", "q1"]

def test_compiler_gate_mapping():
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0", "q1"]},
            {"type": "QuantumOp", "gate": "h", "qubits": ["q0"]},
            {"type": "QuantumOp", "gate": "cx", "qubits": ["q0", "q1"]}
        ]
    }
    ir = ast_to_ir(ast)
    assert len(ir["instructions"]) == 2
    assert ir["instructions"][0] == {"op": "h", "args": ["q0"]}
    assert ir["instructions"][1] == {"op": "cx", "args": ["q0", "q1"]}

def test_compiler_measure_mapping():
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0"]},
            {"type": "Measure", "qubits": ["q0"], "classical": ["c0"]}
        ]
    }
    ir = ast_to_ir(ast)
    assert len(ir["instructions"]) == 1
    assert ir["instructions"][0] == {
        "op": "measure",
        "qubits": ["q0"],
        "classical": ["c0"]
    }

def test_compiler_if_block():
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0"]},
            {
                "type": "If",
                "condition": {"type": "Condition", "var": "c0", "value": 1},
                "then": [{"type": "QuantumOp", "gate": "x", "qubits": ["q0"]}],
                "else": [{"type": "QuantumOp", "gate": "h", "qubits": ["q0"]}]
            }
        ]
    }
    ir = ast_to_ir(ast)
    assert len(ir["instructions"]) == 1
    instr = ir["instructions"][0]
    assert instr["type"] == "if"
    assert instr["condition"] == {"var": "c0", "value": 1}
    assert len(instr["then"]) == 1
    assert instr["then"][0] == {"op": "x", "args": ["q0"]}
    assert len(instr["else"]) == 1
    assert instr["else"][0] == {"op": "h", "args": ["q0"]}

def test_compiler_qubit_name_conflict():
    # If the user declares the same qubit name twice, it should raise an error
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0"]},
            {"type": "QubitDecl", "qubits": ["q0"]}
        ]
    }
    with pytest.raises(Exception):
        ast_to_ir(ast)

def test_compiler_undeclared_qubit_usage():
    # Using an undeclared qubit in a gate should raise an error
    ast = {
        "type": "Program",
        "body": [
            {"type": "QubitDecl", "qubits": ["q0"]},
            {"type": "QuantumOp", "gate": "h", "qubits": ["q1"]}  # q1 is not declared
        ]
    }
    with pytest.raises(Exception):
        ast_to_ir(ast)
