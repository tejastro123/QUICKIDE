import tkinter as tk
from tkinter import ttk, filedialog
from tkhtmlview import HTMLLabel 
import markdown
import os

class TutorialViewer(ttk.Frame):
    def __init__(self, master=None):
        super().__init__(master)
        self._setup_ui()

    def _setup_ui(self):
        self.header = ttk.Label(self, text="Tutorial Viewer", font=("Arial", 14, "bold"))
        self.header.pack(pady=5)

        self.html_view = HTMLLabel(self, html="<h3>Select a .md file to view the tutorial.</h3>")
        self.html_view.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        self.load_button = ttk.Button(self, text="Open Tutorial (.md)", command=self.load_tutorial)
        self.load_button.pack(pady=5)

    def load_tutorial(self):
        path = filedialog.askopenfilename(filetypes=[("Markdown files", "*.md")])
        if path and os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                html_content = markdown.markdown(content, extensions=["fenced_code", "tables"])
                self.html_view.set_html(html_content)

    def display_markdown(self, content):
        html_content = markdown.markdown(content, extensions=["fenced_code", "tables"])
        self.html_view.set_html(html_content)

    def clear(self):
        self.html_view.set_html("<p><i>No content loaded.</i></p>")
