# Quantum Teleportation Protocol Implementation

## Table of Contents
1. [Fundamental Concepts](#fundamental-concepts)
2. [Protocol Steps](#protocol-steps)
3. [Code Implementation](#code-implementation)
---

## Fundamental Concepts

Quantum teleportation is a fundamental protocol in quantum information science that enables the transfer of an unknown quantum state from one particle to another, without physically moving the particle itself. 
- **Quantum entanglement** (Bell pair between Alice and Bob)
- **Classical communication** (2 bits sent to Bob)
- **Quantum operations** (Hadamard, CNOT, Pauli gates)

Key principles:
- **No-cloning theorem**: The original state is destroyed during teleportation
- **Entanglement as resource**: The Bell pair enables state transfer
- **Classical dependency**: Quantum operations require classical information

---

## Protocol Steps

### 1. Entanglement Distribution
- Alice and Bob share an entangled Bell pair (q1-q2)
- Alice keeps q1, Bob keeps q2
- State: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2

### 2. State Preparation
- Alice prepares the state to teleport on q0: |ψ⟩ = α|0⟩ + β|1⟩

### 3. Bell Measurement
1. Alice entangles q0 with her Bell half (q1)
2. Measures both q0 and q1 in Bell basis
3. Obtains 2 classical bits (c0, c1)

### 4. Classical Communication
- Alice sends c0 and c1 to Bob

### 5. State Recovery
- Bob applies corrective gates to q2 based on c0,c1:
  - c1=1 → Apply Z gate
  - c0=1 → Apply X gate

---

## Code Implementation

```qucpl
// === Qubit Allocation ===
qubit q0, q1, q2;  // q0:state, q1:Alice's Bell half, q2:Bob's Bell half

// === Entanglement Creation ===
qop h q1;          // Create superposition on Alice's Bell half
qop cx q1, q2;     // Entangle q1(control) and q2(target)

// === Teleportation Operations ===
qop cx q0, q1;     // Entangle state with Alice's Bell half
qop h q0;          // Prepare Bell measurement basis

// === Measurement ===
measure q0 -> c0;  // First measurement bit
measure q1 -> c1;  // Second measurement bit

// === Bob's Correction ===
if (c1 == 1) {
    qop z q2;      // Phase correction on BOB'S qubit
}
if (c0 == 1) {
    qop x q2;      // Bit flip correction on BOB'S qubit
}

// === Verification ===
measure q2 -> c2;
print c2;

Just create a .qucpl file and you can use the above code.