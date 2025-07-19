import tkinter as tk
from tkinter import ttk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit
import json

class CircuitVisualizer(ttk.Frame):
    def __init__(self, master=None):
        super().__init__(master)
        self.canvas = None
        self.figure = None
        self._setup_ui()

    def _setup_ui(self):
        self.label = ttk.Label(self, text="Quantum Circuit Visualization")
        self.label.pack(pady=4)

    def display_circuit(self, ir_data, title="Quantum Circuit"):
        try:
            self._clear_canvas()
            qubits = ir_data["qubits"]
            instructions = ir_data["instructions"]
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
                elif instr.get("type") == "if":
                    cond = instr["condition"]
                    var = cond["var"]
                    val = cond["value"]
                    c_idx = cmap[var]
                    for inner in instr.get("then", []):
                        if inner.get("op") in {"x", "z"}:
                            q_idx = qmap[inner["args"][0]]
                            with qc.if_test((c_idx, val)):
                                if inner["op"] == "x": qc.x(q_idx)
                                elif inner["op"] == "z": qc.z(q_idx)

            for instr in instructions:
                apply_instruction(instr)

            self.figure = qc.draw("mpl")
            canvas = FigureCanvasTkAgg(self.figure, master=self)
            canvas.draw()
            widget = canvas.get_tk_widget()
            widget.pack(fill=tk.BOTH, expand=True)
            self.canvas = canvas

        except Exception as e:
            print("[Visualizer Error]", e)

    def _clear_canvas(self):
        if self.canvas:
            self.canvas.get_tk_widget().destroy()
            self.canvas = None
        self.figure = None