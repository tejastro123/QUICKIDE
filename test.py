from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit_aer import Aer

# Initialize registers
q = QuantumRegister(2, 'q')
c = ClassicalRegister(2, 'c')
circuit = QuantumCircuit(q, c)

# Apply gates
circuit.h(q[0])
circuit.h(q[1])
circuit.cz(q[0], q[1])
circuit.h(q[0])
circuit.h(q[1])
circuit.x(q[0])
circuit.x(q[1])
circuit.cz(q[0], q[1])
circuit.x(q[0])
circuit.x(q[1])
circuit.h(q[0])
circuit.h(q[1])
circuit.measure(q[0], c[0])
circuit.measure(q[1], c[1])

# Run the simulation
simulator = Aer.get_backend('aer_simulator')
compiled_circuit = transpile(circuit, simulator)
job = simulator.run(compiled_circuit, shots=1024)
result = job.result()
counts = result.get_counts(circuit)
print("Counts:", counts)

from qiskit.visualization import plot_histogram
plot_histogram(counts)