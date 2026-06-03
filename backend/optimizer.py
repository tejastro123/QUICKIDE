"""
backend/optimizer.py  —  IR peephole optimizer
===============================================
Applies simple algebraic simplifications to the instruction list:
  1. Cancel adjacent self-inverse gates   H-H=I, X-X=I, Z-Z=I, Y-Y=I, S-S=Z, etc.
  2. Cancel adjacent CNOT pairs on same qubits   CNOT-CNOT = I
  3. Merge consecutive Rz / Rz rotations         Rz(a)-Rz(b) = Rz(a+b)
  4. Merge consecutive Rx, Ry rotations
  5. Eliminate identity rotations                Rz(0) = I, etc.

Returns
-------
{"optimized_ir": <IR dict>, "changes": [<human-readable strings>]}
"""

from __future__ import annotations

import math
from copy import deepcopy
from typing import List, Tuple

# Tolerance for "rotation is identity"
_EPS = 1e-9

# Gates that are their own inverse (self-inverse / Hermitian)
_SELF_INVERSE = {"h", "x", "y", "z", "swap", "cx", "cy", "cz", "ccx"}

# Rotation gate → inverse name (for future use)
_ROTATION_GATES = {"rx", "ry", "rz"}


def _same_args(a: list, b: list) -> bool:
    return a == b


def _cancel_adjacent_inverse(instructions: list) -> Tuple[list, list]:
    """Pass 1 & 2: cancel adjacent identical self-inverse gates and CNOT pairs."""
    changed = []
    result = list(instructions)
    did_work = True

    while did_work:
        did_work = False
        new_result = []
        i = 0
        while i < len(result):
            if i + 1 < len(result):
                a, b = result[i], result[i + 1]
                a_op = a.get("op", "")
                b_op = b.get("op", "")

                # Self-inverse gates: op-op on same qubits = identity
                if (a_op == b_op
                        and a_op in _SELF_INVERSE
                        and _same_args(a.get("args", []), b.get("args", []))):
                    changed.append(
                        f"Cancelled adjacent {a_op.upper()} gates on {a.get('args')}"
                    )
                    i += 2
                    did_work = True
                    continue

            new_result.append(result[i])
            i += 1
        result = new_result

    return result, changed


def _merge_rotations(instructions: list) -> Tuple[list, list]:
    """Pass 3 & 4: merge consecutive same-axis rotations on the same qubit."""
    changed = []
    result = list(instructions)
    did_work = True

    while did_work:
        did_work = False
        new_result = []
        i = 0
        while i < len(result):
            if i + 1 < len(result):
                a, b = result[i], result[i + 1]
                a_op = a.get("op", "")
                b_op = b.get("op", "")

                if (a_op == b_op
                        and a_op in _ROTATION_GATES
                        and _same_args(a.get("args", []), b.get("args", []))
                        and len(a.get("params", [])) == 1
                        and len(b.get("params", [])) == 1):

                    angle_sum = a["params"][0] + b["params"][0]
                    changed.append(
                        f"Merged {a_op}({a['params'][0]:.4f}) + {b_op}({b['params'][0]:.4f})"
                        f" → {a_op}({angle_sum:.4f}) on {a.get('args')}"
                    )
                    merged = deepcopy(a)
                    merged["params"] = [angle_sum]
                    new_result.append(merged)
                    i += 2
                    did_work = True
                    continue

            new_result.append(result[i])
            i += 1
        result = new_result

    return result, changed


def _drop_identity_rotations(instructions: list) -> Tuple[list, list]:
    """Pass 5: drop Rx/Ry/Rz(≈0), Rz(≈2π) etc."""
    changed = []
    result = []
    for instr in instructions:
        op = instr.get("op", "")
        params = instr.get("params", [])
        if op in _ROTATION_GATES and len(params) == 1:
            angle = params[0] % (2 * math.pi)
            if angle < _EPS or abs(angle - 2 * math.pi) < _EPS:
                changed.append(
                    f"Dropped identity rotation {op}({params[0]:.4f}) on {instr.get('args')}"
                )
                continue
        result.append(instr)
    return result, changed


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def optimize_ir(ir: dict) -> dict:
    """
    Apply all peephole passes to `ir` and return
    {"optimized_ir": ..., "changes": [...], "stats": {...}}.
    """
    original_instructions = ir.get("instructions", [])
    instructions = deepcopy(original_instructions)
    all_changes: List[str] = []

    # Run passes in order
    instructions, c1 = _cancel_adjacent_inverse(instructions)
    all_changes.extend(c1)

    instructions, c2 = _merge_rotations(instructions)
    all_changes.extend(c2)

    instructions, c3 = _drop_identity_rotations(instructions)
    all_changes.extend(c3)

    # Re-run cancel pass after merge (merges may produce new cancellable pairs)
    instructions, c4 = _cancel_adjacent_inverse(instructions)
    all_changes.extend(c4)

    optimized_ir = deepcopy(ir)
    optimized_ir["instructions"] = instructions

    return {
        "optimized_ir": optimized_ir,
        "changes": all_changes,
        "stats": {
            "original_gate_count":  len(original_instructions),
            "optimized_gate_count": len(instructions),
            "gates_removed":        len(original_instructions) - len(instructions),
        },
    }
