"""
backend/bloch.py  —  Bloch sphere 3D visualisation
====================================================
Pure matplotlib/NumPy — no Qiskit dependency.

Public API
----------
bloch_sphere(statevector_list, num_qubits, title) → PNG bytes
    statevector_list: [[re, im], ...] as returned by get_debug_step
    Draws one sphere per qubit (partial trace density matrix method).
"""

from __future__ import annotations

import io
import math
import cmath
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D          # noqa: F401 — side-effect import
from matplotlib.patches import FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d

# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _sphere_mesh(resolution=40):
    """Return (x, y, z) meshgrids for a unit sphere."""
    u = np.linspace(0, 2 * math.pi, resolution)
    v = np.linspace(0, math.pi,     resolution)
    x = np.outer(np.cos(u), np.sin(v))
    y = np.outer(np.sin(u), np.sin(v))
    z = np.outer(np.ones_like(u), np.cos(v))
    return x, y, z


def _bloch_vector_from_density(rho: np.ndarray) -> tuple[float, float, float]:
    """
    Extract (x, y, z) Bloch vector from a 2×2 density matrix ρ.
        x = 2 Re(ρ₀₁)
        y = 2 Im(ρ₁₀)   (note: ρ₁₀ = ρ₀₁*)
        z = ρ₀₀ - ρ₁₁
    """
    bx = 2.0 * float(rho[0, 1].real)
    by = -2.0 * float(rho[0, 1].imag)   # Im(ρ₁₀) = -Im(ρ₀₁)
    bz = float((rho[0, 0] - rho[1, 1]).real)
    return bx, by, bz


def _partial_trace(state: np.ndarray, n: int, keep: int) -> np.ndarray:
    """
    Compute the 2×2 reduced density matrix for qubit `keep` in an n-qubit
    statevector of length 2^n by tracing out all other qubits.

    Qubit 0 is LSB (least significant bit) convention.
    """
    dim = 1 << n
    rho = np.zeros((2, 2), dtype=complex)

    for basis in range(dim):
        bit = (basis >> keep) & 1
        amp = state[basis]

        for bit_out in range(2):
            # basis with `keep` qubit flipped to bit_out
            other_basis = (basis & ~(1 << keep)) | (bit_out << keep)
            rho[bit_out, bit] += amp * state[other_basis].conj()

    return rho


# ---------------------------------------------------------------------------
# Arrow patch for 3D axes (mpl_toolkits doesn't have a nice 3D arrow)
# ---------------------------------------------------------------------------

class _Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0, 0), (0, 0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, zs = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0], ys[0]), (xs[1], ys[1]))
        return min(zs)


# ---------------------------------------------------------------------------
# Single-sphere drawing
# ---------------------------------------------------------------------------

def _draw_sphere(ax, bx: float, by: float, bz: float,
                 qubit_label: str = "q", color: str = "#FF4444", theme: str = "dark"):
    """Draw a Bloch sphere on 3D axes `ax` with state vector (bx, by, bz)."""
    sx, sy, sz = _sphere_mesh()

    is_dark = (theme == "dark")
    bg_color = "#0a0f1e" if is_dark else "#ffffff"
    text_color = "#ccddff" if is_dark else "#0f172a"
    sub_text_color = "#8899bb" if is_dark else "#475569"
    sphere_edge = "#334466" if is_dark else "#cbd5e1"
    sphere_surf = "#1a2a4a" if is_dark else "#f1f5f9"
    axis_color = "#556688" if is_dark else "#94a3b8"

    # Semi-transparent wireframe
    ax.plot_wireframe(sx, sy, sz, color=sphere_edge, alpha=0.08 if is_dark else 0.15, linewidth=0.4)
    ax.plot_surface(sx, sy, sz, color=sphere_surf, alpha=0.12 if is_dark else 0.2)

    # Equatorial circle
    theta = np.linspace(0, 2 * math.pi, 200)
    ax.plot(np.cos(theta), np.sin(theta), 0, color="#2244aa" if is_dark else "#60a5fa", lw=0.7, alpha=0.5)
    ax.plot(np.cos(theta), np.zeros_like(theta), np.sin(theta),
            color="#2244aa" if is_dark else "#60a5fa", lw=0.7, alpha=0.3)
    ax.plot(np.zeros_like(theta), np.cos(theta), np.sin(theta),
            color="#2244aa" if is_dark else "#60a5fa", lw=0.7, alpha=0.3)

    # Axes
    for (x0, y0, z0, x1, y1, z1, lbl) in [
        (0, 0, 0, 1.3, 0, 0, "+X"), (0, 0, 0, 0, 1.3, 0, "+Y"),
        (0, 0, 0, 0, 0, 1.4, "|0⟩"), (0, 0, 0, 0, 0, -1.4, "|1⟩"),
    ]:
        ax.plot([x0, x1], [y0, y1], [z0, z1], color=axis_color, lw=0.8, alpha=0.6)
        ax.text(x1, y1, z1, lbl, fontsize=7, color=sub_text_color,
                ha="center", va="center")

    # Pole markers
    ax.scatter([0], [0], [1],  color="#4ade80", s=20, zorder=5)
    ax.scatter([0], [0], [-1], color="#f87171", s=20, zorder=5)

    # State vector arrow
    norm = math.sqrt(bx**2 + by**2 + bz**2)
    arrow_color = color
    if norm > 1e-6:
        arrow = _Arrow3D(
            [0, bx], [0, by], [0, bz],
            arrowstyle="-|>",
            color=arrow_color, lw=2.0,
            mutation_scale=14,
        )
        ax.add_artist(arrow)
        ax.scatter([bx], [by], [bz], color=arrow_color, s=30, zorder=6)
    else:
        ax.scatter([0], [0], [0], color="#aaaaaa", s=30, zorder=6)

    # Dashed projection to z-axis
    ax.plot([bx, 0], [by, 0], [bz, bz], color=arrow_color, lw=0.8,
            linestyle="--", alpha=0.5)
    ax.plot([0, 0], [0, 0], [0, bz], color=arrow_color, lw=0.8,
            linestyle="--", alpha=0.5)

    # Bloch coordinates annotation
    ax.set_title(
        f"{qubit_label}\n"
        f"x={bx:.3f}  y={by:.3f}  z={bz:.3f}",
        fontsize=8, color=text_color, pad=2,
    )
    ax.set_xlim(-1.4, 1.4)
    ax.set_ylim(-1.4, 1.4)
    ax.set_zlim(-1.4, 1.4)
    ax.set_axis_off()
    ax.set_facecolor(bg_color)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

COLORS = ["#FF5555", "#55BBFF", "#AAFFAA", "#FFAA44",
          "#CC88FF", "#FF88CC", "#88FFCC", "#FFFF66"]


def bloch_sphere(statevector_list: list, num_qubits: int,
                 title: str = "Bloch Sphere", theme: str = "dark") -> bytes | None:
    """
    Render Bloch sphere(s) from a statevector.

    Parameters
    ----------
    statevector_list : list of [re, im] pairs (length 2^num_qubits)
    num_qubits       : number of qubits
    title            : figure title
    theme            : 'dark' or 'light'

    Returns
    -------
    PNG bytes or None if circuit is empty.
    """
    if num_qubits == 0 or not statevector_list:
        return None

    # Rebuild complex numpy statevector
    state = np.array([complex(r, i) for r, i in statevector_list], dtype=complex)

    n = num_qubits
    n_spheres = min(n, 6)   # cap at 6 — beyond that they'd be tiny

    ncols = min(n_spheres, 3)
    nrows = math.ceil(n_spheres / ncols)

    fig_w = max(4.5, ncols * 3.8)
    fig_h = max(4.0, nrows * 3.8 + 0.8)

    is_dark = (theme == "dark")
    bg_color = "#0a0f1e" if is_dark else "#f8fafc"
    title_color = "#ccddeeff" if is_dark else "#0f172a"
    sub_title_color = "#8899bb" if is_dark else "#475569"

    style = "dark_background" if is_dark else "default"
    with plt.style.context(style):
        fig = plt.figure(figsize=(fig_w, fig_h), facecolor=bg_color)
        fig.suptitle(title, fontsize=11, fontweight="bold",
                     color=title_color, y=0.98)

        for qi in range(n_spheres):
            ax = fig.add_subplot(nrows, ncols, qi + 1, projection="3d")
            ax.set_facecolor(bg_color)

            if n == 1:
                # Pure state: read Bloch vector directly
                alpha, beta = state[0], state[1]
                bx = 2.0 * float((alpha.conj() * beta).real)
                by = 2.0 * float((alpha.conj() * beta).imag)
                bz = float(abs(alpha)**2 - abs(beta)**2)
            else:
                rho = _partial_trace(state, n, qi)
                bx, by, bz = _bloch_vector_from_density(rho)

            qubit_names = [f"q{i}" for i in range(n)]
            _draw_sphere(ax, bx, by, bz,
                         qubit_label=qubit_names[qi],
                         color=COLORS[qi % len(COLORS)],
                         theme=theme)

        if n > 6:
            fig.text(0.5, 0.01,
                     f"Showing first 6 of {n} qubits",
                     ha="center", fontsize=8, color=sub_title_color)

        fig.tight_layout(rect=[0, 0.02, 1, 0.96])
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=110, facecolor=fig.get_facecolor(),
                    bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()
