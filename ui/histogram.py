import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import io

class HistogramViewer(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent)
        self.label = ttk.Label(self)
        self.label.pack(fill=tk.BOTH, expand=True)

    def display_histogram(self, image_data):
        image = Image.open(io.BytesIO(image_data))
        photo = ImageTk.PhotoImage(image)
        self.label.configure(image=photo)
        self.label.image = photo  # prevent garbage collection
