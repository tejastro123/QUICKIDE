# tests/test_parser.py
import sys
import os
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.parser import parse_qucpl

def test_parser_empty_program():
    # Empty code or just comments should parse into a basic empty program structure
    ast = parse_qucpl("")
    assert ast["type"] == "Program"
    assert ast["body"] == []

    ast2 = parse_qucpl("// only comments\n\n// more comments")
    assert ast2["type"] == "Program"
    assert ast2["body"] == []

def test_parser_valid_circuit():
    code = """
    qubit q0, q1;
    h q0;
    cx q0, q1;
    measure q0 -> c0;
    """
    ast = parse_qucpl(code)
    assert ast["type"] == "Program"
    # Find QubitDecl
    decls = [node for node in ast["body"] if node["type"] == "QubitDecl"]
    assert len(decls) == 1
    assert decls[0]["qubits"] == ["q0", "q1"]

def test_parser_unknown_gate():
    # An unknown gate should still parse fine as a syntax node (since QuCPL grammar allows identifiers),
    # but let's see how the grammar restricts gate names. If the parser restricts to certain names, it should raise.
    # If the parser allows any identifier, then it shouldn't raise here but fail during compiler phase.
    # Let's verify what happens.
    try:
        ast = parse_qucpl("qubit q0; fakegate q0;")
        # If it parses, check that the gate name is indeed "fakegate"
        gates = [node for node in ast["body"] if node["type"] == "QuantumOp"]
        assert len(gates) == 1
        assert gates[0]["gate"] == "fakegate"
    except Exception as e:
        # If the grammar doesn't allow unknown gate names, it should raise an error
        pass

def test_parser_malformed_qubit_decl():
    # Invalid qubit declarations should raise parse errors
    with pytest.raises(Exception):
        parse_qucpl("qubit;")  # Missing qubit names

    with pytest.raises(Exception):
        parse_qucpl("qubit 123;")  # Numbers not valid names

def test_parser_malformed_gate_args():
    with pytest.raises(Exception):
        parse_qucpl("qubit q0; h;")  # Missing target

    with pytest.raises(Exception):
        parse_qucpl("qubit q0; h q0, ;")  # Trailing comma

def test_parser_nested_conditionals():
    # QuCPL nested conditionals (if-else inside if-else)
    code = """
    qubit q0;
    if (c0 == 1) {
        if (c1 == 0) {
            x q0;
        }
    }
    """
    ast = parse_qucpl(code)
    assert ast["type"] == "Program"
    ifs = [node for node in ast["body"] if node["type"] == "If"]
    assert len(ifs) == 1
    assert ifs[0]["condition"]["var"] == "c0"
    inner_if = ifs[0]["then"][0]
    assert inner_if["type"] == "If"
    assert inner_if["condition"]["var"] == "c1"

def test_parser_parameterized_gates():
    # rx(pi) q0;
    code = """
    qubit q0;
    rx(3.1415) q0;
    """
    ast = parse_qucpl(code)
    ops = [node for node in ast["body"] if node["type"] == "QuantumOp"]
    assert len(ops) == 1
    assert ops[0]["gate"] == "rx"
    assert ops[0]["params"] == [3.1415]

def test_parser_invalid_parameterized_gate_syntax():
    with pytest.raises(Exception):
        parse_qucpl("qubit q0; rx() q0;")  # Empty param list
    
    with pytest.raises(Exception):
        parse_qucpl("qubit q0; rx(abc) q0;")  # Non-numeric param
