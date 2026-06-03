"""
backend/compiler.py  —  AST → IR
==================================
Extended in Phase 2 to:
  - Forward params list from QuantumOp nodes into IR instructions
  - Compile Reset nodes
"""

import json


def flatten(lst):
    if isinstance(lst, list):
        result = []
        for item in lst:
            if isinstance(item, list):
                result.extend(flatten(item))
            else:
                result.append(item)
        return result
    return [lst]


def compile_stmt(stmt):
    stype = stmt["type"]

    if stype == "QubitDecl":
        return ("qubits", flatten(stmt["qubits"]))

    elif stype == "QuantumOp":
        op = {
            "op":   stmt["gate"],
            "args": flatten(stmt["qubits"]),
        }
        if stmt.get("params"):
            op["params"] = stmt["params"]
        return op

    elif stype == "Barrier":
        return {"op": "barrier", "args": flatten(stmt["qubits"])}

    elif stype == "Measure":
        return {
            "op":        "measure",
            "qubits":    flatten(stmt["qubits"]),
            "classical": flatten(stmt["classical"]),
        }

    elif stype == "Print":
        return {"op": "print", "args": flatten(stmt["args"])}

    elif stype == "Convert":
        return {"op": "convert", "value": stmt["value"]}

    elif stype == "Reset":
        return {"op": "reset", "args": flatten(stmt["qubits"])}

    elif stype == "If":
        then_block = stmt["then"]
        else_block = stmt.get("else") or []
        then_stmts = then_block if isinstance(then_block, list) else [then_block]
        else_stmts = else_block if isinstance(else_block, list) else ([else_block] if else_block else [])
        
        cond = stmt["condition"]
        if isinstance(cond, dict) and "type" in cond:
            cond = {k: v for k, v in cond.items() if k != "type"}

        return {
            "type":      "if",
            "condition": cond,
            "then":      [compile_stmt(s) for s in then_stmts],
            "else":      [compile_stmt(s) for s in else_stmts],
        }

    else:
        raise ValueError(f"Unknown statement type: {stype}")


def validate_ast(ast: dict):
    declared = set()

    def walk(node):
        if not isinstance(node, dict):
            return
        ntype = node.get("type")
        if ntype == "Program":
            for stmt in node.get("body", []):
                walk(stmt)
        elif ntype == "QubitDecl":
            for q in flatten(node.get("qubits", [])):
                if q in declared:
                    raise ValueError(f"Qubit '{q}' already declared")
                declared.add(q)
        elif ntype in ("QuantumOp", "Barrier", "Measure", "Reset"):
            for q in flatten(node.get("qubits", [])):
                if q not in declared:
                    raise ValueError(f"Qubit '{q}' is not declared")
        elif ntype == "If":
            then_block = node.get("then", [])
            else_block = node.get("else") or []
            then_stmts = then_block if isinstance(then_block, list) else [then_block]
            else_stmts = else_block if isinstance(else_block, list) else ([else_block] if else_block else [])
            for s in then_stmts:
                walk(s)
            for s in else_stmts:
                walk(s)

    walk(ast)


def ast_to_ir(ast: dict) -> dict:
    if ast.get("type") != "Program":
        ast = {"type": "Program", "body": [ast]}

    validate_ast(ast)

    ir = {"type": "Program", "qubits": [], "instructions": []}

    for stmt in ast["body"]:
        compiled = compile_stmt(stmt)
        if isinstance(compiled, tuple) and compiled[0] == "qubits":
            ir["qubits"].extend(compiled[1])
        else:
            ir["instructions"].append(compiled)

    return ir


def compile_ast_file(ast_path, ir_path):
    with open(ast_path) as f:
        ast = json.load(f)
    ir = ast_to_ir(ast)
    with open(ir_path, "w") as f:
        json.dump(ir, f, indent=2)
    print(f"IR saved to {ir_path}")


if __name__ == "__main__":
    import argparse
    _ap = argparse.ArgumentParser(description="Compile AST to IR")
    _ap.add_argument("ast_file")
    _ap.add_argument("output_file")
    _args = _ap.parse_args()
    compile_ast_file(_args.ast_file, _args.output_file)
