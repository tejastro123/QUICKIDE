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
        return {"op": stmt["gate"], "args": flatten(stmt["qubits"])}
    elif stype == "Barrier":
        return {"op": "barrier", "args": flatten(stmt["qubits"])}
    elif stype == "Measure":
        return {"op": "measure", "qubits": flatten(stmt["qubits"]), "classical": flatten(stmt["classical"])}
    elif stype == "Print":
        return {"op": "print", "args": flatten(stmt["args"])}
    elif stype == "Convert":
        return {"op": "convert", "value": stmt["value"]}
    elif stype == "If":
        then_block = stmt["then"]
        else_block = stmt.get("else", [])
        then_stmts = then_block if isinstance(then_block, list) else [then_block]
        else_stmts = else_block if isinstance(else_block, list) else ([else_block] if else_block else [])
        return {
            "type": "if",
            "condition": stmt["condition"],
            "then": [compile_stmt(s) for s in then_stmts],
            "else": [compile_stmt(s) for s in else_stmts]
        }
    else:
        raise ValueError(f"Unknown statement type: {stype}")

def ast_to_ir(ast):
    if ast.get("type") != "Program":
        ast = {"type": "Program", "body": [ast]}

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
    parser = argparse.ArgumentParser(description="Compile AST to IR")
    parser.add_argument("ast_file", help="Path to AST JSON file")
    parser.add_argument("output_file", help="Output IR JSON file")
    args = parser.parse_args()
    compile_ast_file(args.ast_file, args.output_file)
