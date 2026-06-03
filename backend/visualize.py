"""
backend/visualize.py  —  Custom SVG circuit renderer (zero Qiskit dependency)
==============================================================================

Draws quantum circuits as publication-quality PNG images:
  • Horizontal qubit wires
  • Single-qubit gates as labelled rounded boxes
  • Two-qubit controlled gates with vertical connector line + filled dot
  • SWAP with ✕ symbols connected by a line
  • Measure gates connected to classical wires at the bottom
  • Barrier as a dashed vertical line

Returns PNG bytes (via matplotlib's Agg backend rendered from SVG / direct draw).
Public API:  visualize_circuit(ir, title) → bytes | None
"""

from __future__ import annotations

import io
import math
from typing import Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle


# ---------------------------------------------------------------------------
# Layout constants
# ---------------------------------------------------------------------------

WIRE_SPACING   = 1.0      # vertical distance between qubit wires
GATE_WIDTH     = 0.55     # half-width of a gate box
GATE_HEIGHT    = 0.35     # half-height of a gate box
COL_SPACING    = 1.0      # horizontal distance between gate columns
LEFT_MARGIN    = 0.9      # space for qubit labels
RIGHT_MARGIN   = 0.5      # space after last gate
TOP_MARGIN     = 0.5
BOTTOM_MARGIN  = 0.7      # extra room for classical wires

WIRE_COLOR     = "#404040"
GATE_FILL      = "#DDEEFF"
GATE_EDGE      = "#2255AA"
CTRL_COLOR     = "#1133AA"
SWAP_COLOR     = "#1133AA"
MEAS_COLOR     = "#44AA66"
BARRIER_COLOR  = "#AAAAAA"
CLWIRE_COLOR   = "#666666"
TEXT_COLOR     = "#111122"
TITLE_COLOR    = "#222222"

# Gate display labels
GATE_LABELS: Dict[str, str] = {
    "h":   "H",   "x":   "X",   "y":   "Y",   "z":   "Z",
    "s":   "S",   "t":   "T",   "sdg": "S†",  "tdg": "T†",
    "rx":  "Rx",  "ry":  "Ry",  "rz":  "Rz",  "p":   "P",
    "cx":  "X",   "cy":  "Y",   "cz":  "Z",   "ch":  "H",
    "swap":"✕",   "ccx": "X",   "id":  "I",
    "measure": "M",
}


# ---------------------------------------------------------------------------
# Column-scheduling: assign gates to x-columns resolving wire conflicts
# ---------------------------------------------------------------------------

def _schedule(instructions: List[dict], qmap: Dict[str, int],
              cmap: Dict[str, int]) -> List[Tuple[dict, List[int], int]]:
    """
    Return list of (instr, wire_indices, column) in draw order.
    Gates on overlapping wires are placed in successive columns.
    """
    n_q = len(qmap)
    # Track which column each qubit wire is currently free at
    next_col = [0] * n_q

    scheduled = []
    for instr in instructions:
        op = instr.get("op", "") or instr.get("type", "")

        if op == "barrier":
            # A barrier spans all wires — place in max current col
            col = max(next_col)
            wires = list(range(n_q))
            for w in wires:
                next_col[w] = col + 1
            scheduled.append((instr, wires, col))
            continue

        if op in ("print", "convert"):
            continue

        # Determine wire indices
        if op == "measure":
            wires = [qmap[q] for q in instr.get("qubits", []) if q in qmap]
        elif instr.get("type") == "if":
            # Collect all qubit wires used in the if-body
            wires = []
            for sub in instr.get("then", []) + instr.get("else", []):
                wires += [qmap[a] for a in sub.get("args", []) if a in qmap]
        else:
            wires = [qmap[a] for a in instr.get("args", []) if a in qmap]

        if not wires:
            continue

        # Earliest column where all wires involved are free
        col = max(next_col[w] for w in range(min(wires), max(wires) + 1))
        for w in range(min(wires), max(wires) + 1):
            next_col[w] = col + 1

        scheduled.append((instr, wires, col))

    return scheduled


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

def _gate_box(ax, x: float, y: float, label: str,
              fill: str = GATE_FILL, edge: str = GATE_EDGE,
              fs: float = 9):
    box = FancyBboxPatch(
        (x - GATE_WIDTH, y - GATE_HEIGHT),
        2 * GATE_WIDTH, 2 * GATE_HEIGHT,
        boxstyle="round,pad=0.03",
        linewidth=1.2, edgecolor=edge, facecolor=fill, zorder=3
    )
    ax.add_patch(box)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fs, color=TEXT_COLOR, fontweight="bold", zorder=4)


def _ctrl_dot(ax, x: float, y: float):
    dot = Circle((x, y), radius=0.10, color=CTRL_COLOR, zorder=4)
    ax.add_patch(dot)


def _swap_x(ax, x: float, y: float):
    """Draw the ✕ symbol for SWAP at wire position."""
    d = 0.13
    ax.plot([x - d, x + d], [y - d, y + d], color=SWAP_COLOR, lw=1.8, zorder=4)
    ax.plot([x - d, x + d], [y + d, y - d], color=SWAP_COLOR, lw=1.8, zorder=4)


def _vertical_line(ax, x: float, y0: float, y1: float, color=CTRL_COLOR):
    ax.plot([x, x], [y0, y1], color=color, lw=1.2, zorder=2)


def _measure_symbol(ax, x: float, y: float):
    """Draw a measurement icon (arc + arrow)."""
    box = FancyBboxPatch(
        (x - GATE_WIDTH, y - GATE_HEIGHT),
        2 * GATE_WIDTH, 2 * GATE_HEIGHT,
        boxstyle="round,pad=0.03",
        linewidth=1.2, edgecolor=MEAS_COLOR, facecolor="#E8FFE8", zorder=3
    )
    ax.add_patch(box)
    # arc
    arc = mpatches.Arc(
        (x, y - GATE_HEIGHT * 0.1), GATE_WIDTH * 1.0, GATE_HEIGHT * 1.1,
        angle=0, theta1=0, theta2=180, color=MEAS_COLOR, lw=1.3, zorder=4
    )
    ax.add_patch(arc)
    # arrow
    ax.annotate("", xy=(x + GATE_WIDTH * 0.45, y + GATE_HEIGHT * 0.3),
                xytext=(x, y - GATE_HEIGHT * 0.1),
                arrowprops=dict(arrowstyle="-|>", color=MEAS_COLOR,
                                lw=1.0, mutation_scale=7), zorder=4)


# ---------------------------------------------------------------------------
# Main visualiser
# ---------------------------------------------------------------------------

def visualize_circuit(ir: dict, title: str = "Quantum Circuit", theme: str = "dark") -> Optional[bytes]:
    """
    Render the quantum circuit described by `ir` as a PNG image.

    Parameters
    ----------
    ir    : compiled IR dict with keys 'qubits', 'instructions'
    title : plot title string
    theme : 'dark' or 'light'

    Returns
    -------
    PNG bytes, or None if the circuit is empty.
    """
    qubits = ir.get("qubits", [])
    instructions = ir.get("instructions", [])

    if not qubits:
        return None

    is_dark = (theme == "dark")

    # Theme-aware colors
    wire_color = "#64748b" if is_dark else "#404040"
    text_color = "#f8fafc" if is_dark else "#111122"
    title_color = "#f8fafc" if is_dark else "#222222"
    clwire_color = "#475569" if is_dark else "#666666"

    gate_fill = "#1e293b" if is_dark else "#DDEEFF"
    gate_edge = "#3b82f6" if is_dark else "#2255AA"
    ctrl_color = "#60a5fa" if is_dark else "#1133AA"
    swap_color = "#60a5fa" if is_dark else "#1133AA"
    meas_color = "#10b981" if is_dark else "#44AA66"
    barrier_color = "#475569" if is_dark else "#AAAAAA"

    # Scoped drawing helpers
    def _gate_box(ax, x: float, y: float, label: str, fill: str = None, edge: str = None, fs: float = 9):
        f = fill or gate_fill
        e = edge or gate_edge
        box = FancyBboxPatch(
            (x - GATE_WIDTH, y - GATE_HEIGHT),
            2 * GATE_WIDTH, 2 * GATE_HEIGHT,
            boxstyle="round,pad=0.03",
            linewidth=1.2, edgecolor=e, facecolor=f, zorder=3
        )
        ax.add_patch(box)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fs, color=text_color, fontweight="bold", zorder=4)

    def _ctrl_dot(ax, x: float, y: float):
        dot = Circle((x, y), radius=0.10, color=ctrl_color, zorder=4)
        ax.add_patch(dot)

    def _swap_x(ax, x: float, y: float):
        d = 0.13
        ax.plot([x - d, x + d], [y - d, y + d], color=swap_color, lw=1.8, zorder=4)
        ax.plot([x - d, x + d], [y + d, y - d], color=swap_color, lw=1.8, zorder=4)

    def _vertical_line(ax, x: float, y0: float, y1: float, color=None):
        c = color or ctrl_color
        ax.plot([x, x], [y0, y1], color=c, lw=1.2, zorder=2)

    def _measure_symbol(ax, x: float, y: float):
        m_fill = "#064e3b" if is_dark else "#E8FFE8"
        box = FancyBboxPatch(
            (x - GATE_WIDTH, y - GATE_HEIGHT),
            2 * GATE_WIDTH, 2 * GATE_HEIGHT,
            boxstyle="round,pad=0.03",
            linewidth=1.2, edgecolor=meas_color, facecolor=m_fill, zorder=3
        )
        ax.add_patch(box)
        arc = mpatches.Arc(
            (x, y - GATE_HEIGHT * 0.1), GATE_WIDTH * 1.0, GATE_HEIGHT * 1.1,
            angle=0, theta1=0, theta2=180, color=meas_color, lw=1.3, zorder=4
        )
        ax.add_patch(arc)
        ax.annotate("", xy=(x + GATE_WIDTH * 0.45, y + GATE_HEIGHT * 0.3),
                    xytext=(x, y - GATE_HEIGHT * 0.1),
                    arrowprops=dict(arrowstyle="-|>", color=meas_color,
                                    lw=1.0, mutation_scale=7), zorder=4)

    # Build classical-bit map
    classical_bits: set = set()
    for instr in instructions:
        if instr.get("op") == "measure":
            classical_bits.update(instr.get("classical", []))
        elif instr.get("type") == "if":
            classical_bits.add(instr["condition"]["var"])
    classical_bits_sorted = sorted(classical_bits)

    n_q = len(qubits)
    n_c = len(classical_bits_sorted)
    qmap = {q: i for i, q in enumerate(qubits)}
    cmap = {c: i for i, c in enumerate(classical_bits_sorted)}

    # Schedule gates into columns
    scheduled = _schedule(instructions, qmap, cmap)
    n_cols = max((col for _, _, col in scheduled), default=0) + 1 if scheduled else 1

    # Figure geometry
    fig_w = LEFT_MARGIN + n_cols * COL_SPACING + RIGHT_MARGIN
    clwire_y_start = -(n_q - 1) * WIRE_SPACING - WIRE_SPACING * 0.7
    n_cl_rows = max(n_c, 1) if n_c else 0
    fig_h = (TOP_MARGIN + (n_q - 1) * WIRE_SPACING
             + (BOTTOM_MARGIN if n_c == 0 else BOTTOM_MARGIN + n_cl_rows * 0.45))

    style = "dark_background" if is_dark else "default"
    with plt.style.context(style):
        fig, ax = plt.subplots(figsize=(fig_w, fig_h))
        ax.set_xlim(-LEFT_MARGIN, n_cols * COL_SPACING + RIGHT_MARGIN)
        ax.set_ylim(-fig_h + TOP_MARGIN, TOP_MARGIN)
        ax.axis("off")

        # Helper: qubit y-coordinate (qubit 0 at top)
        def qy(q_idx: int) -> float:
            return -(q_idx * WIRE_SPACING)

        # Helper: x for a given column
        def cx(col: int) -> float:
            return col * COL_SPACING + COL_SPACING / 2

        # --- Draw qubit wires ---
        wire_end_x = n_cols * COL_SPACING + RIGHT_MARGIN * 0.6
        for i, q_name in enumerate(qubits):
            y = qy(i)
            ax.plot([-LEFT_MARGIN * 0.9, wire_end_x], [y, y],
                    color=wire_color, lw=1.0, zorder=1)
            ax.text(-LEFT_MARGIN * 0.9, y, f"q{i}: {q_name}",
                    ha="left", va="center", fontsize=8.5, color=text_color)

        # --- Draw classical wires (double line) ---
        cl_wire_xs = {}
        cl_wire_ys = {}
        if classical_bits_sorted:
            for ci, c_name in enumerate(classical_bits_sorted):
                y = qy(n_q - 1) - WIRE_SPACING * (0.8 + ci * 0.45)
                cl_wire_ys[c_name] = y
                ax.plot([-LEFT_MARGIN * 0.9, wire_end_x], [y, y],
                        color=clwire_color, lw=0.7, linestyle="--", zorder=1)
                ax.plot([-LEFT_MARGIN * 0.9, wire_end_x], [y + 0.04, y + 0.04],
                        color=clwire_color, lw=0.7, linestyle="--", zorder=1)
                ax.text(-LEFT_MARGIN * 0.9, y + 0.02, f"c{ci}:",
                        ha="left", va="center", fontsize=7.5, color=clwire_color)

        # --- Draw gates ---
        for instr, wire_indices, col in scheduled:
            op = instr.get("op", "") or instr.get("type", "")
            x = cx(col)

            # Barrier
            if op == "barrier":
                y_top = qy(0) + GATE_HEIGHT + 0.1
                y_bot = qy(n_q - 1) - GATE_HEIGHT - 0.1
                ax.plot([x, x], [y_bot, y_top], color=barrier_color,
                        lw=1.2, linestyle="--", zorder=2)
                continue

            # Measure
            if op == "measure":
                for q_name, c_name in zip(instr.get("qubits", []),
                                           instr.get("classical", [])):
                    qi = qmap.get(q_name)
                    if qi is None:
                        continue
                    _measure_symbol(ax, x, qy(qi))
                    if c_name in cl_wire_ys:
                        cy_dest = cl_wire_ys[c_name]
                        ax.annotate(
                            "", xy=(x, cy_dest + 0.05),
                            xytext=(x, qy(qi) - GATE_HEIGHT),
                            arrowprops=dict(arrowstyle="-|>", color=meas_color,
                                            lw=0.8, mutation_scale=6), zorder=3
                        )
                continue

            # If block
            if op == "if":
                cond = instr.get("condition", {})
                label = f"if {cond.get('var','')}=={cond.get('value','')}"
                y_top = qy(0)
                y_bot = qy(n_q - 1)
                if_edge = "#eab308" if is_dark else "#CCAA00"
                if_fill = (234/255, 179/255, 8/255, 0.1) if is_dark else "#FFFBE6"
                if_text = "#fef08a" if is_dark else "#886600"
                rect = mpatches.FancyBboxPatch(
                    (x - GATE_WIDTH * 1.1, y_bot - GATE_HEIGHT),
                    2 * GATE_WIDTH * 1.1, (y_top - y_bot) + 2 * GATE_HEIGHT,
                    boxstyle="round,pad=0.02",
                    linewidth=1, edgecolor=if_edge, facecolor=if_fill,
                    alpha=0.7, zorder=2
                )
                ax.add_patch(rect)
                ax.text(x, y_top + GATE_HEIGHT * 0.5, label,
                        ha="center", va="center", fontsize=7, color=if_text)
                for sub in instr.get("then", []):
                    sub_args = sub.get("args", [])
                    if sub_args and sub_args[0] in qmap:
                        sub_fill = (234/255, 179/255, 8/255, 0.2) if is_dark else "#FFF3CC"
                        _gate_box(ax, x, qy(qmap[sub_args[0]]),
                                  GATE_LABELS.get(sub.get("op", "?"), sub.get("op", "?")),
                                  fill=sub_fill, edge=if_edge)
                continue

            # CX / CY / CZ / CH
            if op in ("cx", "cy", "cz", "ch") and len(wire_indices) >= 2:
                ctrl_y = qy(wire_indices[0])
                tgt_y  = qy(wire_indices[1])
                _vertical_line(ax, x, min(ctrl_y, tgt_y), max(ctrl_y, tgt_y))
                _ctrl_dot(ax, x, ctrl_y)
                lbl = GATE_LABELS.get(op, op.upper())
                _gate_box(ax, x, tgt_y, lbl)
                continue

            # CCX
            if op == "ccx" and len(wire_indices) >= 3:
                ctrl0_y = qy(wire_indices[0])
                ctrl1_y = qy(wire_indices[1])
                tgt_y   = qy(wire_indices[2])
                _vertical_line(ax, x, min(ctrl0_y, ctrl1_y, tgt_y),
                                  max(ctrl0_y, ctrl1_y, tgt_y))
                _ctrl_dot(ax, x, ctrl0_y)
                _ctrl_dot(ax, x, ctrl1_y)
                _gate_box(ax, x, tgt_y, "X")
                continue

            # SWAP
            if op == "swap" and len(wire_indices) >= 2:
                y0 = qy(wire_indices[0])
                y1 = qy(wire_indices[1])
                _vertical_line(ax, x, min(y0, y1), max(y0, y1), color=swap_color)
                _swap_x(ax, x, y0)
                _swap_x(ax, x, y1)
                continue

            # Single-qubit gates
            if wire_indices:
                qi = wire_indices[0]
                lbl = GATE_LABELS.get(op, op.upper() if op else "?")
                params = instr.get("params", [])
                if params:
                    lbl = f"{lbl}\n({params[0]:.2f})"
                    _gate_box(ax, x, qy(qi), lbl, fs=7.5)
                else:
                    _gate_box(ax, x, qy(qi), lbl)
                continue

        # --- Title ---
        ax.set_title(title, fontsize=11, fontweight="bold", color=title_color, pad=6)

        fig.tight_layout(pad=0.4)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json, argparse, sys

    _p = argparse.ArgumentParser(description="Visualise IR JSON as circuit PNG")
    _p.add_argument("ir_file")
    _p.add_argument("--title", default="Quantum Circuit")
    _p.add_argument("--out", default="circuit.png")
    _args = _p.parse_args()

    with open(_args.ir_file) as f:
        _ir = json.load(f)

    _png = visualize_circuit(_ir, title=_args.title)
    if _png:
        with open(_args.out, "wb") as f:
            f.write(_png)
        print(f"[OK] Saved to {_args.out}")
    else:
        print("[WARN] Empty circuit — nothing drawn.")
        sys.exit(1)
