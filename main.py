import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinter.scrolledtext import ScrolledText
import json

from backend.parser import parse_qucpl
from backend.visualize import visualize_circuit
from backend.compiler import ast_to_ir
from backend.simulator import simulate
from backend.utils import open_file, save_file, format_json

from ui.editor import CodeEditor
from ui.viewer import ViewerPanel
from ui.visualizer import CircuitVisualizer
from ui.terminal import TerminalOutput
from ui.tutorials import TutorialViewer
from ui.histogram import HistogramViewer  # New GUI panel for simulation histogram


class QuickIDE(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("QuickIDE - Quantum DSL GUI")
        self.geometry("1400x900")
        self._init_layout()

    def _init_layout(self):
        self._create_menu()
        self._create_toolbar()
        self._create_panels()

    def _create_menu(self):
        menubar = tk.Menu(self)

        filemenu = tk.Menu(menubar, tearoff=0)
        filemenu.add_command(label="Open .qucpl", command=self.load_code)
        filemenu.add_command(label="Save .qucpl", command=self.save_code)
        filemenu.add_separator()
        filemenu.add_command(label="Exit", command=self.quit)
        menubar.add_cascade(label="File", menu=filemenu)

        runmenu = tk.Menu(menubar, tearoff=0)
        runmenu.add_command(label="Parse AST", command=self.run_ast)
        runmenu.add_command(label="Compile IR", command=self.run_compile)
        runmenu.add_command(label="Visualize", command=self.run_visualize)
        runmenu.add_command(label="Simulate", command=self.run_simulate)
        menubar.add_cascade(label="Run", menu=runmenu)

        viewmenu = tk.Menu(menubar, tearoff=0)
        viewmenu.add_command(label="Clear Console", command=self.clear_console)
        menubar.add_cascade(label="View", menu=viewmenu)

        helpmenu = tk.Menu(menubar, tearoff=0)
        helpmenu.add_command(label="Open Tutorial", command=self.load_tutorial)
        menubar.add_cascade(label="Help", menu=helpmenu)

        self.config(menu=menubar)

    def _create_toolbar(self):
        toolbar = ttk.Frame(self, padding=5)
        ttk.Button(toolbar, text="Parse AST", command=self.run_ast).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Compile IR", command=self.run_compile).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Visualize", command=self.run_visualize).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Simulate", command=self.run_simulate).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Clear Console", command=self.clear_console).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Open Tutorial", command=self.load_tutorial).pack(side=tk.LEFT, padx=4)
        toolbar.pack(side=tk.TOP, fill=tk.X)

    def _create_panels(self):
        # Container frame to hold top (paned layout) and bottom (console)
        container = ttk.Frame(self)
        container.pack(fill=tk.BOTH, expand=True)

        # Create Paned Window for main content
        self.main_panes = ttk.Panedwindow(container, orient=tk.HORIZONTAL)

        # Left Pane: Editor + Circuit Visualizer
        left_pane = ttk.Panedwindow(self.main_panes, orient=tk.VERTICAL)

        editor_frame = ttk.Labelframe(left_pane, text="QuCPL Code Editor")
        self.editor = CodeEditor(editor_frame)
        self.editor.pack(fill=tk.BOTH, expand=True)
        left_pane.add(editor_frame, weight=1)

        visualizer_frame = ttk.Labelframe(left_pane, text="Circuit Visualization")
        self.visualizer = CircuitVisualizer(visualizer_frame)
        self.visualizer.pack(fill=tk.BOTH, expand=True)
        left_pane.add(visualizer_frame, weight=2)

        # Console Frame (at the bottom left of the container)
        console_frame = ttk.Labelframe(left_pane, text="Console Output")
        self.console = TerminalOutput(console_frame)
        self.console.pack(fill=tk.BOTH, expand=True)
        left_pane.add(console_frame, weight=2)

        self.main_panes.add(left_pane, weight=3)

        # Right Pane: Viewer, Histogram, Tutorials
        right_pane = ttk.Panedwindow(self.main_panes, orient=tk.VERTICAL)

        viewer_frame = ttk.Labelframe(right_pane, text="AST / IR Viewer")
        self.viewer = ViewerPanel(viewer_frame)
        self.viewer.pack(fill=tk.BOTH, expand=True)
        right_pane.add(viewer_frame, weight=2)

        histogram_frame = ttk.Labelframe(right_pane, text="Simulation Histogram")
        self.histogram = HistogramViewer(histogram_frame)
        self.histogram.pack(fill=tk.BOTH, expand=True)
        right_pane.add(histogram_frame, weight=3)

        tutorial_frame = ttk.Labelframe(right_pane, text="Tutorials")
        self.tutorial_viewer = TutorialViewer(tutorial_frame)
        self.tutorial_viewer.pack(fill=tk.BOTH, expand=True)
        right_pane.add(tutorial_frame, weight=2)

        self.main_panes.add(right_pane, weight=2)

        # Pack main panes
        self.main_panes.pack(fill=tk.BOTH, expand=True)


    def load_code(self):
        content, path = open_file(filetypes=[("QuCPL Files", "*.qucpl")])
        if content:
            self.editor.set_code(content)
            self.log(f"[INFO] Loaded file: {path}\n")

    def save_code(self):
        code = self.editor.get_code()
        path = save_file(code, defaultextension=".qucpl", filetypes=[("QuCPL Files", "*.qucpl")])
        if path:
            self.log(f"[INFO] Saved file: {path}\n")

    def run_ast(self):
        code = self.editor.get_code()
        if not code:
            messagebox.showwarning("No Input", "Editor is empty. Please enter some QuCPL code.")
            return
        try:
            ast = parse_qucpl(code)
            self.viewer.display_ast(ast)
            self.ast = ast
            self.log("[SUCCESS] AST generated.\n")
        except Exception as e:
            self.log(f"[ERROR] AST Error: {e}\n")

    def run_compile(self):
        try:
            if not hasattr(self, 'ast'):
                self.run_ast()
            ir = ast_to_ir(self.ast)
            self.ir = ir
            self.viewer.display_ir(ir)
            self.log("[SUCCESS] IR compilation done.\n")
        except Exception as e:
            self.log(f"[ERROR] Compilation Error: {e}\n")

    def run_visualize(self):
        try:
            if not hasattr(self, 'ir'):
                self.run_compile()
            self.visualizer.display_circuit(self.ir, title="Quantum Circuit")
            self.log("[SUCCESS] Circuit visualized.\n")
        except Exception as e:
            self.log(f"[ERROR] Visualization Error: {e}\n")

    def run_simulate(self):
        try:
            if not hasattr(self, 'ir'):
                self.run_compile()
            histogram_img = simulate(self.ir, title="Simulation")
            self.histogram.display_histogram(histogram_img)
            self.log("[SUCCESS] Simulation complete.\n")
        except Exception as e:
            self.log(f"[ERROR] Simulation Error: {e}\n")

    def clear_console(self):
        if hasattr(self, 'console'):
            self.console.clear()

    def log(self, message):
        if hasattr(self, 'console'):
            self.console.log(message)

    def load_tutorial(self):
        self.tutorial_viewer.load_tutorial()


if __name__ == "__main__":
    app = QuickIDE()
    app.mainloop()
