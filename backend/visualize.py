import json
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit

def visualize_circuit(ir, title="Quantum Circuit"):
    qubits = ir["qubits"]
    instructions = ir["instructions"]
    classical_bits = set()

    for instr in instructions:
        if isinstance(instr, dict):
            if instr.get("op") == "measure":
                classical_bits.update(instr.get("classical", []))
            elif instr.get("type") == "if":
                classical_bits.add(instr["condition"]["var"])

    classical_bits = sorted(classical_bits)
    qmap = {q: i for i, q in enumerate(qubits)}
    cmap = {c: i for i, c in enumerate(classical_bits)}
    qc = QuantumCircuit(len(qubits), len(classical_bits))

    def apply_instruction(instr):
        if "op" in instr:
            op = instr["op"]
            args = instr.get("args", [])
            try:
                if op == "h": qc.h(qmap[args[0]])
                elif op == "x": qc.x(qmap[args[0]])
                elif op == "y": qc.y(qmap[args[0]])
                elif op == "z": qc.z(qmap[args[0]])
                elif op == "cx": qc.cx(qmap[args[0]], qmap[args[1]])
                elif op == "cy": qc.cy(qmap[args[0]], qmap[args[1]])
                elif op == "cz": qc.cz(qmap[args[0]], qmap[args[1]])
                elif op == "ccx": qc.ccx(qmap[args[0]], qmap[args[1]], qmap[args[2]])
                elif op == "swap": qc.swap(qmap[args[0]], qmap[args[1]])
                elif op == "barrier": qc.barrier(*[qmap[q] for q in args])
                elif op == "measure":
                    for q, c in zip(instr["qubits"], instr["classical"]):
                        qc.measure(qmap[q], cmap[c])
                elif op == "print":
                    print("PRINT:", ", ".join(args))
                else:
                    print(f"Unknown op '{op}' in instruction: {instr}")
            except Exception as e:
                print(f"Error processing {op}: {e} in {instr}")

        elif instr.get("type") == "if":
            cond = instr["condition"]
            var = cond["var"]
            val = cond["value"]
            c_idx = cmap[var]
            for inner in instr.get("then", []):
                if inner.get("op") in {"x", "z"}:
                    q_idx = qmap[inner["args"][0]]
                    with qc.if_test((c_idx, val)):
                        if inner["op"] == "x":
                            qc.x(q_idx)
                        elif inner["op"] == "z":
                            qc.z(q_idx)
                else:
                    print(f"Unsupported conditional op '{inner.get('op')}' inside if block.")

    for instr in instructions:
        apply_instruction(instr)

    fig = qc.draw("mpl")
    fig.suptitle(title)
    plt.show()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Visualize Quantum Circuit from IR JSON")
    parser.add_argument("ir_file", help="Path to IR JSON file")
    args = parser.parse_args()

    with open(args.ir_file) as f:
        ir_data = json.load(f)

    visualize_circuit(ir_data, title=args.ir_file)
