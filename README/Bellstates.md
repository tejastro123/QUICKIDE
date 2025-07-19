# Bell States: Understanding Quantum Entanglement

A Bell State refers to a specific type of entangled quantum state involving two qubits. Named after physicist John Bell, these states are fundamental to quantum information theory and are often used to demonstrate the non-classical correlations that can exist between quantum particles. There are four distinct Bell States, each representing a different form of two-qubit entanglement.

---

## What Are Bell States?

There are four Bell states, each of which is a **maximally entangled** quantum state of two qubits:

| Bell State | Dirac Notation                            | Description                      |
|------------|------------------------------------------|-----------------------------------|
| Φ⁺         | ( \|00⟩ + \|11⟩ ) / √2                    | Both qubits are the same          |
| Φ⁻         | ( \|00⟩ − \|11⟩ ) / √2                    | Same as Φ⁺ but with phase flip    |
| Ψ⁺         | ( \|01⟩ + \|10⟩ ) / √2                    | Qubits are opposite               |
| Ψ⁻         | ( \|01⟩ − \|10⟩ ) / √2                    | Opposite with phase flip          |

Bell states are central to quantum protocols such as:

- **Quantum Teleportation**
- **Superdense Coding**
- **Bell Inequality Tests**

---

## How to Generate Bell States Using Qiskit

To create a Bell state (phi-plus), we follow a two-step quantum circuit:

1. Apply a **Hadamard gate (H)** on qubit 0 to create superposition.
2. Apply a **CNOT gate** with qubit 0 as control and qubit 1 as target to entangle them.

To create a Bell state (phi-minus),

1. Apply a **Hadamard gate (H)** on qubit 0 to create superposition.
2. Apply a **CNOT gate** with qubit 0 as control and qubit 1 as target to entangle them.
3. Apply a **Z gate** to create a phase shift on qubit 1.

To create a Bell state (psi-plus),

1. Pauli-X (X) gate on qubit 1 to change its state to ∣1⟩, resulting in ∣01⟩.
2. Apply a **Hadamard gate (H)** on qubit 0 to create superposition.
3. Apply a **CNOT gate** with qubit 0 as control and qubit 1 as target to entangle them.

### Setup and Import

```python
vimport numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector
from IPython.display import display 
import matplotlib.pyplot as plt
