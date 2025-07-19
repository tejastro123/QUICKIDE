import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText
import json

class ViewerPanel(ttk.Frame):
    def __init__(self, master=None):
        super().__init__(master)

        self.notebook = ttk.Notebook(self)
        self.ast_tab = ScrolledText(self.notebook, wrap=tk.WORD, state='normal')
        self.ir_tab = ScrolledText(self.notebook, wrap=tk.WORD, state='normal')

        self.notebook.add(self.ast_tab, text="AST")
        self.notebook.add(self.ir_tab, text="IR")

        self.notebook.pack(fill=tk.BOTH, expand=True)

    def display_ast(self, ast):
        self._display_json(self.ast_tab, ast)

    def display_ir(self, ir):
        self._display_json(self.ir_tab, ir)

    def clear(self):
        self.ast_tab.config(state='normal')
        self.ast_tab.delete("1.0", tk.END)
        self.ast_tab.config(state='disabled')

        self.ir_tab.config(state='normal')
        self.ir_tab.delete("1.0", tk.END)
        self.ir_tab.config(state='disabled')

    def _display_json(self, widget, data):
        widget.config(state='normal')
        widget.delete("1.0", tk.END)
        formatted = json.dumps(data, indent=2)
        widget.insert(tk.END, formatted)
        widget.config(state='disabled')
