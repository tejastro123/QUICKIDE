"""
backend/parser.py  —  QuCPL source → AST
=========================================
Handles the extended grammar (Phase 2):
  - Parameterized gates:  qop rx(0.5) q0;
  - Phase gates:          qop s q0;  qop t q0;  qop sdg q0;  qop tdg q0;
  - General unitary:      qop u(θ,φ,λ) q0;
  - Reset:                reset q0;
  - Comments:             # this is a comment
"""

import os
import json
from lark import Lark, Transformer, v_args

# ---------------------------------------------------------------------------
# Grammar loading — search for grammar.lark relative to this file,
# then relative to the repo root so the parser works wherever it's invoked.
# ---------------------------------------------------------------------------

def _load_grammar():
    candidates = [
        os.path.join(os.path.dirname(__file__), '..', 'grammar.lark'),   # repo root
        os.path.join(os.path.dirname(__file__), 'grammar.lark'),          # backend/
        'grammar.lark',                                                     # CWD
    ]
    for path in candidates:
        path = os.path.normpath(path)
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                return f.read()
    raise FileNotFoundError("grammar.lark not found in any expected location")


_grammar = _load_grammar()
_parser = Lark(_grammar, parser='lalr', start='start')


# ---------------------------------------------------------------------------
# AST builder transformer
# ---------------------------------------------------------------------------

@v_args(inline=True)
class ASTBuilder(Transformer):

    def start(self, *stmts):
        return {"type": "Program", "body": list(stmts)}

    # --- Declarations ---

    def qubit_decl(self, *ids):
        return {"type": "QubitDecl", "qubits": list(ids)}

    # --- Non-parameterized gate ---

    def qop_stmt(self, gate, args):
        return {"type": "QuantumOp", "gate": str(gate), "qubits": args, "params": []}

    # --- Parameterized gate (new in Phase 2) ---

    def pqop_stmt(self, gate, params, args):
        return {
            "type": "QuantumOp",
            "gate": str(gate),
            "qubits": args,
            "params": params,
        }

    # --- Other statements ---

    def barrier_stmt(self, args):
        return {"type": "Barrier", "qubits": args}

    def measure_stmt(self, *args):
        mid = len(args) // 2
        return {
            "type": "Measure",
            "qubits": list(args[:mid]),
            "classical": list(args[mid:]),
        }

    def print_stmt(self, *args):
        return {"type": "Print", "args": list(args)}

    def if_stmt(self, cond, *blocks):
        if_block  = blocks[0]
        else_block = blocks[1] if len(blocks) > 1 else None
        return {
            "type": "If",
            "condition": cond,
            "then": if_block,
            "else": else_block,
        }

    def convert_stmt(self, val):
        return {"type": "Convert", "value": int(val)}

    def reset_stmt(self, args):
        return {"type": "Reset", "qubits": args}

    # --- Helpers ---

    def condition(self, var, val):
        return {"type": "Condition", "var": str(var), "value": int(val)}

    def id_list(self, *args):
        return list(args)

    def param_list(self, *args):
        return [float(a) for a in args]

    def GATE_NAME(self, token):
        return str(token)

    def PGATE_NAME(self, token):
        return str(token)

    def CNAME(self, token):
        return str(token)

    def INT(self, token):
        return int(token)

    def NUMBER(self, token):
        return float(token)

    def stmt(self, stmt):
        return stmt


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_qucpl(source_code: str) -> dict:
    """Parse QuCPL source and return an AST dict."""
    tree = _parser.parse(source_code)
    return ASTBuilder().transform(tree)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse, sys

    _ap = argparse.ArgumentParser(description="Parse QuCPL source to AST JSON")
    _ap.add_argument("source_file", nargs="?", help="QuCPL source file (stdin if omitted)")
    _ap.add_argument("-o", "--output", default="parsed_ast.json")
    _args = _ap.parse_args()

    if _args.source_file:
        with open(_args.source_file, encoding="utf-8") as f:
            _code = f.read()
    else:
        print("Enter QuCPL code (blank line to finish):")
        _lines = []
        while True:
            _l = input()
            if not _l.strip():
                break
            _lines.append(_l)
        _code = "\n".join(_lines)

    try:
        _ast = parse_qucpl(_code)
        with open(_args.output, "w") as f:
            json.dump(_ast, f, indent=2)
        print(f"AST saved to {_args.output}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
