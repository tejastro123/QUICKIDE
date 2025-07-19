import os
import json
from tkinter import filedialog, messagebox

# ------------------------
# File Handling Utilities
# ------------------------
def open_file(filetypes=(("All Files", "*.*"),)):
    path = filedialog.askopenfilename(filetypes=filetypes)
    if path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read(), path
    return None, None

def save_file(content, defaultextension=".txt", filetypes=(("All Files", "*.*"),)):
    path = filedialog.asksaveasfilename(defaultextension=defaultextension, filetypes=filetypes)
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path
    return None

def load_json_file():
    content, path = open_file(filetypes=[("JSON Files", "*.json")])
    if content:
        try:
            return json.loads(content), path
        except json.JSONDecodeError:
            messagebox.showerror("Invalid JSON", "Failed to parse the selected JSON file.")
    return None, None

def save_json_file(data, defaultextension=".json"):
    json_content = json.dumps(data, indent=2)
    return save_file(json_content, defaultextension=defaultextension, filetypes=[("JSON Files", "*.json")])


# ------------------------
# String and Format Utils
# ------------------------
def format_json(data):
    return json.dumps(data, indent=2)

def is_binary_string(s):
    return all(c in "01" for c in s)

def decimal_to_binary_string(n):
    return bin(n)[2:] if isinstance(n, int) and n >= 0 else ""

def binary_to_qubit_list(binary_str):
    return ["q" + str(i) for i, b in enumerate(reversed(binary_str)) if b == '1']


# ------------------------
# Path / Misc Utilities
# ------------------------

def get_filename(path):
    return os.path.basename(path) if path else ""

def ensure_extension(path, ext):
    return path if path.endswith(ext) else f"{path}{ext}"
