# terminal.py
import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText
import sys

class TerminalOutput(ttk.Frame):
    def __init__(self, master=None):
        super().__init__(master)

        self.output = ScrolledText(self, height=10, wrap=tk.WORD)
        self.output.pack(fill=tk.BOTH, expand=True)

        # Optional: color-coded tags
        self.output.tag_configure("stdout", foreground="black")
        self.output.tag_configure("stderr", foreground="red")

        self._redirect_stdout()
        self._redirect_stderr()

    def _redirect_stdout(self):
        sys.stdout = self.TextRedirector(self.output, "stdout")

    def _redirect_stderr(self):
        sys.stderr = self.TextRedirector(self.output, "stderr")

    def clear(self):
        self.output.delete("1.0", tk.END)

    def log(self, message):
        self.output.insert(tk.END, message + '\n', "stdout")
        self.output.see(tk.END)

    class TextRedirector:
        def __init__(self, widget, tag):
            self.widget = widget
            self.tag = tag

        def write(self, message):
            self.widget.insert(tk.END, message, self.tag)
            self.widget.see(tk.END)

        def flush(self):
            pass
