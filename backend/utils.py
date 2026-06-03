import os
import json

# NOTE: tkinter (filedialog, messagebox) was removed — GUI toolkit crashes on headless servers.
# The file-handling helpers (open_file, save_file, load_json_file, save_json_file)
# that depend on tkinter have been removed. Use the pure utilities below instead.


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
