"""
backend/algorithms/library.py  —  Quantum Algorithm Library
============================================================
Canonical QuCPL implementations of fundamental quantum algorithms.
Each entry in ALGORITHMS is a dict with:
    id          : unique slug
    name        : display name
    category    : one of ['Foundations', 'Search', 'Cryptography',
                           'Arithmetic', 'Error Correction', 'Variational']
    qubits      : total qubit count
    description : Markdown-formatted explanation
    code        : QuCPL source string
    tags        : list of keyword strings for search
"""

from __future__ import annotations

ALGORITHMS: list[dict] = [

    # -----------------------------------------------------------------------
    # Foundations
    # -----------------------------------------------------------------------
    {
        "id": "bell_state",
        "name": "Bell State (Φ+)",
        "category": "Foundations",
        "qubits": 2,
        "description": (
            "Creates the maximally-entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2.\n\n"
            "**Circuit**: H on q0, then CNOT with q0 as control, q1 as target.\n"
            "**Expected measurement**: |00⟩ and |11⟩ with equal probability (~50% each)."
        ),
        "tags": ["entanglement", "bell", "foundations", "2-qubit"],
        "code": """\
# Bell State  |Φ+⟩ = (|00⟩ + |11⟩) / √2
qubit q0, q1;
qop h q0;
qop cx q0, q1;
measure q0, q1 -> c0, c1;
""",
    },

    {
        "id": "ghz_state",
        "name": "GHZ State (3-qubit)",
        "category": "Foundations",
        "qubits": 3,
        "description": (
            "Creates the Greenberger–Horne–Zeilinger state |GHZ⟩ = (|000⟩ + |111⟩)/√2.\n\n"
            "Used in multi-party entanglement and quantum secret sharing.\n"
            "**Expected measurement**: |000⟩ and |111⟩ each with ~50% probability."
        ),
        "tags": ["entanglement", "ghz", "3-qubit", "foundations"],
        "code": """\
# GHZ State  |GHZ⟩ = (|000⟩ + |111⟩) / √2
qubit q0, q1, q2;
qop h q0;
qop cx q0, q1;
qop cx q0, q2;
measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    {
        "id": "superposition",
        "name": "Equal Superposition (3-qubit)",
        "category": "Foundations",
        "qubits": 3,
        "description": (
            "Places all 3 qubits in the uniform superposition over all 8 basis states.\n\n"
            "Each H gate doubles the number of superposed states.\n"
            "**Expected measurement**: all 8 basis states with equal probability (~12.5%)."
        ),
        "tags": ["superposition", "hadamard", "foundations"],
        "code": """\
# Uniform superposition over all 8 basis states
qubit q0, q1, q2;
qop h q0;
qop h q1;
qop h q2;
measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    {
        "id": "quantum_teleportation",
        "name": "Quantum Teleportation",
        "category": "Foundations",
        "qubits": 3,
        "description": (
            "Teleports an unknown single-qubit state |ψ⟩ from Alice to Bob "
            "using one Bell pair and two classical bits.\n\n"
            "**Protocol**: Prepare |ψ⟩ on q0, share Bell pair (q1,q2), "
            "perform Bell measurement on q0-q1, apply corrections on q2."
        ),
        "tags": ["teleportation", "bell", "foundations", "3-qubit"],
        "code": """\
# Quantum Teleportation
# q0 = state to teleport (initialized to |+⟩ for demo)
# q1,q2 = entangled Bell pair shared between Alice and Bob
qubit q0, q1, q2;

# Prepare state to teleport: |+⟩ = H|0⟩
qop h q0;

# Create Bell pair between q1 and q2
qop h q1;
qop cx q1, q2;

# Alice's Bell measurement
qop cx q0, q1;
qop h q0;
measure q0 -> c0;
measure q1 -> c1;

# Bob applies corrections (classically controlled)
if (c1 == 1) {
  qop x q2;
}
if (c0 == 1) {
  qop z q2;
}
measure q2 -> c2;
""",
    },

    # -----------------------------------------------------------------------
    # Search
    # -----------------------------------------------------------------------
    {
        "id": "grover_2qubit",
        "name": "Grover's Search (2-qubit, target |11⟩)",
        "category": "Search",
        "qubits": 2,
        "description": (
            "Grover's algorithm finds the marked state |11⟩ in an unsorted "
            "2-qubit database with probability ~100% after 1 iteration.\n\n"
            "**Circuit**: Hadamard to create superposition, "
            "Phase oracle (CZ marks |11⟩), Diffusion operator (HXH).\n"
            "**Expected**: |11⟩ with ~100% probability."
        ),
        "tags": ["grover", "search", "oracle", "2-qubit"],
        "code": """\
# Grover's Search — target: |11⟩
qubit q0, q1;

# Step 1: Uniform superposition
qop h q0;
qop h q1;

# Step 2: Oracle — phase-flip |11⟩ via CZ
qop cz q0, q1;

# Step 3: Diffusion operator
qop h q0;
qop h q1;
qop x q0;
qop x q1;
qop cz q0, q1;
qop x q0;
qop x q1;
qop h q0;
qop h q1;

measure q0, q1 -> c0, c1;
""",
    },

    # -----------------------------------------------------------------------
    # Cryptography / Complexity
    # -----------------------------------------------------------------------
    {
        "id": "deutsch_jozsa",
        "name": "Deutsch–Jozsa (constant oracle demo)",
        "category": "Cryptography",
        "qubits": 3,
        "description": (
            "Determines whether a boolean function f:{0,1}² → {0,1} is "
            "**constant** or **balanced** in a single query.\n\n"
            "This demo uses a constant oracle (f=0). "
            "**Expected**: measure |00⟩ (constant) vs any |xy⟩ ≠ |00⟩ (balanced)."
        ),
        "tags": ["deutsch-jozsa", "oracle", "complexity"],
        "code": """\
# Deutsch-Jozsa — constant oracle (f=0)
# q0,q1 = input; q2 = ancilla initialized to |−⟩
qubit q0, q1, q2;

# Prepare ancilla in |−⟩ = X|0⟩ then H
qop x q2;
qop h q2;

# Hadamard on input qubits
qop h q0;
qop h q1;

# Oracle for constant f=0: identity (do nothing)

# Hadamard again on inputs
qop h q0;
qop h q1;

# Measure inputs — |00⟩ means constant, else balanced
measure q0, q1 -> c0, c1;
""",
    },

    {
        "id": "bernstein_vazirani",
        "name": "Bernstein–Vazirani (s=101)",
        "category": "Cryptography",
        "qubits": 4,
        "description": (
            "Finds a hidden bit-string s in a single query. "
            "Classical algorithms need n queries.\n\n"
            "This demo recovers s=101 (binary). "
            "**Expected**: measure |101⟩ with 100% probability."
        ),
        "tags": ["bernstein-vazirani", "oracle", "hidden-string"],
        "code": """\
# Bernstein-Vazirani — hidden string s = 101
# q0,q1,q2 = input bits; q3 = ancilla
qubit q0, q1, q2, q3;

# Prepare ancilla in |−⟩
qop x q3;
qop h q3;

# Hadamard on input qubits
qop h q0;
qop h q1;
qop h q2;

# Oracle: f(x) = s·x = x0·1 XOR x1·0 XOR x2·1
# Implement as CNOT for each bit where s_i = 1
qop cx q0, q3;
qop cx q2, q3;

# Hadamard again on inputs
qop h q0;
qop h q1;
qop h q2;

# Measure — should reveal s = 101
measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    # -----------------------------------------------------------------------
    # Arithmetic / Transforms
    # -----------------------------------------------------------------------
    {
        "id": "qft_3",
        "name": "Quantum Fourier Transform (3-qubit)",
        "category": "Arithmetic",
        "qubits": 3,
        "description": (
            "The 3-qubit QFT maps |x⟩ to the Fourier basis. "
            "It is a key subroutine in Shor's algorithm and QPE.\n\n"
            "Phase gates Rz(π/2) and Rz(π/4) are used for controlled rotations "
            "(approximated here with named equivalents)."
        ),
        "tags": ["qft", "fourier", "arithmetic", "phase"],
        "code": """\
# Quantum Fourier Transform — 3 qubits
qubit q0, q1, q2;

# QFT on |000⟩ (demo: input is ground state)
qop h q0;
qop(rz, 1.570796) q0, q1;   # controlled-S (Rz(π/2))
qop(rz, 0.785398) q0, q2;   # controlled-T (Rz(π/4))
qop h q1;
qop(rz, 1.570796) q1, q2;
qop h q2;

# Swap to reverse qubit order
qop swap q0, q2;

measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    # -----------------------------------------------------------------------
    # Error Correction
    # -----------------------------------------------------------------------
    {
        "id": "bit_flip_code",
        "name": "3-Qubit Bit-Flip Code",
        "category": "Error Correction",
        "qubits": 3,
        "description": (
            "Encodes a single logical qubit |ψ⟩ into 3 physical qubits "
            "to protect against a single bit-flip (X) error.\n\n"
            "**Encoding**: |0⟩ → |000⟩, |1⟩ → |111⟩ via two CNOT gates.\n"
            "**Syndrome measurement**: majority vote on all three qubits."
        ),
        "tags": ["error-correction", "bit-flip", "3-qubit"],
        "code": """\
# 3-Qubit Bit-Flip Error Correction Code
# Logical qubit: q0. Ancillae: q1, q2.
qubit q0, q1, q2;

# Encoding: spread logical qubit across all 3 physical qubits
# (start with q0 = |+⟩ for demonstration)
qop h q0;
qop cx q0, q1;
qop cx q0, q2;

# Simulate a bit-flip error on q1
qop x q1;

# Syndrome extraction (simplified majority vote via CNOT)
qop cx q0, q1;
qop cx q0, q2;
qop ccx q1, q2, q0;

# Decode: reverse CNOTs
qop cx q0, q1;
qop cx q0, q2;

measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    {
        "id": "phase_flip_code",
        "name": "3-Qubit Phase-Flip Code",
        "category": "Error Correction",
        "qubits": 3,
        "description": (
            "Protects against a single phase-flip (Z) error.\n\n"
            "**Idea**: Z errors become X errors in the Hadamard basis. "
            "Apply H before encoding, then H after decoding, "
            "and use the bit-flip code in the conjugate basis."
        ),
        "tags": ["error-correction", "phase-flip", "3-qubit"],
        "code": """\
# 3-Qubit Phase-Flip Error Correction Code
qubit q0, q1, q2;

# Encoding in Z-basis → H converts Z to X errors
qop h q0;
qop cx q0, q1;
qop cx q0, q2;
qop h q0;
qop h q1;
qop h q2;

# Simulate a phase-flip (Z) error on q1
qop z q1;

# Decode
qop h q0;
qop h q1;
qop h q2;
qop cx q0, q1;
qop cx q0, q2;
qop ccx q1, q2, q0;
qop cx q0, q1;
qop cx q0, q2;

measure q0, q1, q2 -> c0, c1, c2;
""",
    },

    # -----------------------------------------------------------------------
    # Variational / NISQ
    # -----------------------------------------------------------------------
    {
        "id": "vqe_1q",
        "name": "VQE Demo (1-qubit energy minimization)",
        "category": "Variational",
        "qubits": 1,
        "description": (
            "A minimal Variational Quantum Eigensolver (VQE) ansatz for a "
            "1-qubit Hamiltonian H = Z.\n\n"
            "The optimal parameter θ=0 gives ground state |0⟩ (eigenvalue -1 of −Z).\n"
            "This demo uses θ=π/4 to show a non-trivial measurement distribution."
        ),
        "tags": ["vqe", "variational", "nisq", "rotation"],
        "code": """\
# VQE 1-qubit demo — ansatz Ry(θ)|0⟩, H = Z
# Optimal θ=0 → |0⟩. Demo uses θ=π/4.
qubit q0;
qop ry(0.785398) q0;
measure q0 -> c0;
""",
    },

    {
        "id": "phase_estimation",
        "name": "Quantum Phase Estimation (2-qubit)",
        "category": "Arithmetic",
        "qubits": 3,
        "description": (
            "Estimates the phase φ of a unitary U such that U|ψ⟩ = e^{2πiφ}|ψ⟩.\n\n"
            "This 2-ancilla demo estimates φ=1/4 of the T gate.\n"
            "**Expected**: ancilla qubits measure |01⟩ → φ = 0.01₂ = 0.25."
        ),
        "tags": ["phase-estimation", "qpe", "arithmetic"],
        "code": """\
# Quantum Phase Estimation — T gate (phase = 1/4)
# q0,q1 = ancilla (counting) qubits; q2 = eigenstate |1⟩
qubit q0, q1, q2;

# Prepare eigenstate |1⟩ of T gate
qop x q2;

# Hadamard on counting qubits
qop h q0;
qop h q1;

# Controlled-T and Controlled-T² (= S)
qop t q2;      # C-T (controlled on q1, simplified)
qop s q2;      # C-T² = C-S (controlled on q0, simplified)

# Inverse QFT (2-qubit)
qop h q1;
qop s q0;      # Rz(-π/2) approximation
qop h q0;
qop swap q0, q1;

measure q0, q1 -> c0, c1;
""",
    },

    {
        "id": "shor_15",
        "name": "Shor's Algorithm (15 = 3×5, demo)",
        "category": "Arithmetic",
        "qubits": 4,
        "description": (
            "A simplified circuit demonstrating the quantum period-finding "
            "subroutine at the heart of Shor's algorithm for factoring 15.\n\n"
            "**Period finding**: find r such that 2^r ≡ 1 (mod 15) → r=4.\n"
            "This circuit is a conceptual demonstration, not a complete hardware run."
        ),
        "tags": ["shor", "factoring", "arithmetic", "period-finding"],
        "code": """\
# Shor's Algorithm — period finding for N=15, a=2
# Simplified 4-qubit demonstration
qubit q0, q1, q2, q3;

# Counting register in superposition
qop h q0;
qop h q1;

# Modular exponentiation oracle (simplified gate sequence for a=2, N=15)
qop cx q0, q2;
qop cx q1, q3;

# Inverse QFT on counting register
qop h q1;
qop rz(1.570796) q0;
qop cx q1, q0;
qop rz(-1.570796) q0;
qop cx q1, q0;
qop h q0;
qop swap q0, q1;

measure q0, q1 -> c0, c1;
""",
    },
]


def get_library() -> list[dict]:
    """Return the full algorithm library."""
    return ALGORITHMS


def search_library(query: str = "", category: str = "") -> list[dict]:
    """Filter by search query and/or category."""
    q = query.lower()
    results = ALGORITHMS
    if q:
        results = [
            a for a in results
            if q in a["name"].lower()
            or q in a["description"].lower()
            or any(q in tag for tag in a["tags"])
        ]
    if category:
        results = [a for a in results if a["category"].lower() == category.lower()]
    return results


def get_algorithm(algo_id: str) -> dict | None:
    """Lookup a single algorithm by its id slug."""
    for a in ALGORITHMS:
        if a["id"] == algo_id:
            return a
    return None


CATEGORIES = sorted({a["category"] for a in ALGORITHMS})
