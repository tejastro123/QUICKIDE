import json
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
from qiskit.visualization import plot_histogram, plot_bloch_multivector
from qiskit.quantum_info import Statevector
import matplotlib.pyplot as plt
import io


def simulate_convert(value: int):
    print("\n--- Convert Command ---")
    binary_str = bin(value)[2:]
    num_bits = len(binary_str)
    print(f"Decimal {value} → Binary {binary_str}")

    qc = QuantumCircuit(num_bits, num_bits)
    for i, bit in enumerate(reversed(binary_str)):
        if bit == '1':
            qc.x(i)
            print(f"Initializing q[{i}] to |1⟩")
        else:
            print(f"Initializing q[{i}] to |0⟩")

    sv = Statevector.from_instruction(qc)
    print("\n[STATEVECTOR]")
    print(sv)

    try:
        plot_bloch_multivector(sv)
        plt.title("Bloch Spheres of Converted State")
        plt.show()
    except Exception as e:
        print(f"[BLOCH ERROR] {e}")


def build_qiskit_circuit(ir):
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])

    if instructions and instructions[0].get("op") == "convert":
        simulate_convert(instructions[0]["value"])
        return None, []

    classical_bits = set()
    for instr in instructions:
        if instr.get("op") == "measure":
            classical_bits.update(instr.get("classical", []))
        elif instr.get("type") == "if":
            classical_bits.add(instr["condition"]["var"])

    classical_bits = sorted(classical_bits)
    qmap = {q: i for i, q in enumerate(qubits)}
    cmap = {c: i for i, c in enumerate(classical_bits)}

    qc = QuantumCircuit(len(qubits), len(classical_bits))
    gate_counts = {}

    def apply_instruction(instr):
        if "op" in instr:
            op = instr["op"]
            args = instr.get("args", [])
            try:
                if op in {"h", "x", "y", "z"}:
                    getattr(qc, op)(qmap[args[0]])
                elif op in {"cx", "cy", "cz", "swap"}:
                    getattr(qc, op)(qmap[args[0]], qmap[args[1]])
                elif op == "ccx":
                    qc.ccx(qmap[args[0]], qmap[args[1]], qmap[args[2]])
                elif op == "barrier":
                    qc.barrier(*[qmap[q] for q in args])
                elif op == "measure":
                    for q, c in zip(instr["qubits"], instr["classical"]):
                        qc.measure(qmap[q], cmap[c])
                elif op == "print":
                    print(f"[PRINT] {', '.join(args)}")
                elif op == "convert":
                    simulate_convert(instr["value"])
                gate_counts[op] = gate_counts.get(op, 0) + 1
            except Exception as e:
                print(f"[ERROR] Failed to apply {instr}: {e}")
        elif instr.get("type") == "if":
            cond = instr["condition"]
            var = cond["var"]
            val = cond["value"]
            c_idx = cmap[var]
            for sub in instr.get("then", []):
                op = sub.get("op")
                args = sub.get("args", [])
                try:
                    if op == "x":
                        with qc.if_test((c_idx, val)):
                            qc.x(qmap[args[0]])
                    elif op == "z":
                        with qc.if_test((c_idx, val)):
                            qc.z(qmap[args[0]])
                    gate_counts[op] = gate_counts.get(op, 0) + 1
                except Exception as e:
                    print(f"[ERROR in conditional]: {e}")

    for instr in instructions:
        apply_instruction(instr)

    print("\n[GATE COUNTS]")
    for g, count in gate_counts.items():
        print(f"{g}: {count}")

    return qc, classical_bits

def get_qasm(ir):
    """Returns the OpenQASM 3.0 representation of the circuit."""
    qc, _ = build_qiskit_circuit(ir)
    if qc:
        return qc.qasm()
    return "// No circuit generated"

def simulate(ir, title="Quantum Simulation", backend_name="ideal"):
    """
    Simulates the circuit. 
    backend_name can be 'ideal', 'fake_manila', or 'fake_nairobi'.
    """
    result = build_qiskit_circuit(ir)
    if result is None or result[0] is None:
        print("[INFO] No circuit to simulate (likely 'convert' instruction handled).")
        return

    qc, classical_bits = result
    
    # Setup simulator
    sim = Aer.get_backend('aer_simulator')
    noise_model = None
    basis_gates = None
    
    # Apply noise model if requested
    if backend_name != "ideal":
        try:
            from qiskit_aer.noise import NoiseModel
            if backend_name == "fake_manila":
                from qiskit_ibm_runtime.fake_provider import FakeManila
                device_backend = FakeManila()
            elif backend_name == "fake_nairobi":
                from qiskit_ibm_runtime.fake_provider import FakeNairobi
                device_backend = FakeNairobi()
                
            noise_model = NoiseModel.from_backend(device_backend)
            basis_gates = noise_model.basis_gates
            print(f"[INFO] Using noise model for {backend_name}")
        except ImportError:
            print("[WARNING] qiskit-ibm-runtime not found. Falling back to ideal simulation.")
        except Exception as e:
            print(f"[ERROR] Failed to load noise model: {e}")

    try:
        # Transpile for the specific simulator/noise model
        transpiled_qc = transpile(qc, sim, basis_gates=basis_gates)
        
        # Run simulation
        job = sim.run(transpiled_qc, shots=1024, noise_model=noise_model)
        result = job.result()
        counts = result.get_counts()

        print(f"\n--- {title} Simulation Results ({backend_name}) ---")
        print("Counts:", counts)
        print("Backend:", sim.name)
        print("Total time taken:", result.time_taken, "seconds")
        if noise_model:
            print("Noise Model Applied: Yes")

        fig = plot_histogram(counts)
        fig.suptitle(f"{title} ({backend_name})")
        
        # Save plot to PNG in memory
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue() 
        
    except Exception as e:
        print(f"[SIMULATION ERROR] {e}")


def get_debug_step(ir, step_index):
    """
    Returns the statevector and circuit visualization for a partial IR 
    (from instruction 0 to step_index).
    """
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])
    
    # Slice instructions up to step_index (inclusive)
    # Note: if step_index is -1, it means the initial state before any gates
    partial_instructions = instructions[:step_index + 1]
    partial_ir = {
        "qubits": qubits,
        "instructions": partial_instructions
    }
    
    qc, _ = build_qiskit_circuit(partial_ir)
    if qc is None:
        # Fallback to empty circuit
        qc = QuantumCircuit(len(qubits))

    # Calculate Statevector (Exact mathematical state)
    sv = Statevector.from_instruction(qc)
    
    # Generate partial circuit visualization
    # We use the same visualize_circuit function but for the partial QC
    try:
        from backend.visualize import visualize_circuit
        circuit_img = visualize_circuit(partial_ir, title=f"Debug Step {step_index + 1}")
    except Exception as e:
        print(f"[DEBUG VISUALIZE ERROR] {e}")
        circuit_img = None

    return {
        "statevector": sv.data.tolist(), # Convert to list of complex numbers (serializable)
        "num_qubits": len(qubits),
        "circuit_img": circuit_img,
        "current_gate": instructions[step_index]["op"] if step_index >= 0 else "Initial State"
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Simulate IR from JSON")
    parser.add_argument("ir_file", help="Path to IR JSON file")
    args = parser.parse_args()

    try:
        with open(args.ir_file) as f:
            ir = json.load(f)
        simulate(ir, title=args.ir_file)
    except FileNotFoundError:
        print(f"[FILE ERROR] IR file '{args.ir_file}' not found.")
