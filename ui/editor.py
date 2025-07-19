import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText
import keyword

class SyntaxHighlightingText(ScrolledText):
    def __init__(self, master=None, **kwargs):
        super().__init__(master, **kwargs)
        self.config(undo=True, wrap=tk.NONE)
        self.bind("<KeyRelease>", self._on_key_release)
        self._configure_tags()

    def _configure_tags(self):
        self.tag_configure("keyword", foreground="blue")
        self.tag_configure("comment", foreground="gray")
        self.tag_configure("string", foreground="green")

    def _on_key_release(self, event=None):
        self._highlight_syntax()

    def _highlight_syntax(self):
        self.tag_remove("keyword", "1.0", tk.END)
        self.tag_remove("comment", "1.0", tk.END)
        self.tag_remove("string", "1.0", tk.END)

        lines = self.get("1.0", tk.END).split("\n")
        for i, line in enumerate(lines):
            idx = f"{i + 1}.0"
            words = line.split()
            j = 0
            while j < len(words):
                word = words[j]
                start_idx = f"{i + 1}.{line.find(word)}"
                end_idx = f"{i + 1}.{line.find(word) + len(word)}"

                if word in keyword.kwlist or word in {"measure", "barrier", "convert", "print", "if", "else", "h", "x", "y", "z", "cx", "cy", "cz", "ccx", "swap"}:
                    self.tag_add("keyword", start_idx, end_idx)
                j += 1

            if "//" in line:
                start_idx = f"{i + 1}.{line.find('//')}"
                self.tag_add("comment", start_idx, f"{i + 1}.end")

            if '"' in line:
                parts = line.split('"')
                if len(parts) > 2:
                    start_idx = f"{i + 1}.{line.find('"')}"
                    end_idx = f"{i + 1}.{line.find('"', line.find('"') + 1) + 1}"
                    self.tag_add("string", start_idx, end_idx)

class CodeEditor(ttk.Frame):
    def __init__(self, master=None):
        super().__init__(master)
        self.text_widget = SyntaxHighlightingText(self)
        self.text_widget.pack(fill=tk.BOTH, expand=True)

    def get_code(self):
        return self.text_widget.get("1.0", tk.END).strip()

    def set_code(self, code):
        self.text_widget.delete("1.0", tk.END)
        self.text_widget.insert(tk.END, code)

    def clear(self):
        self.text_widget.delete("1.0", tk.END)

    def get_widget(self):
        return self.text_widget
