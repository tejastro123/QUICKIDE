
# ⚡ QUICKIDE — Quantum Circuit IDE using QuCPL  
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)  
![License](https://img.shields.io/badge/License-MIT-green)  
![Platform](https://img.shields.io/badge/Platform-Cross--Platform-lightgrey)  
![Status](https://img.shields.io/badge/Status-Active--Development-orange)

> 🧠 **Write. Simulate. Visualize. Export.** — All-in-one lightweight GUI IDE for quantum programs written in **QuCPL**.


## 🧭 Overview

**QUICKIDE** is a lightweight, Python-based Integrated Development Environment designed for visual quantum programming using the custom **Quantum Circuit Programming Language (QuCPL)**. It combines code editing, real-time parsing, circuit visualization, simulation, and export capabilities — all inside a user-friendly GUI built with Tkinter. Whether you're a student, researcher, or quantum enthusiast, QUICKIDE streamlines quantum program development from source code to simulation output.


## 🚀 Features

- ✍️ Code editor with QuCPL syntax support
- 🔍 AST and IR generation from QuCPL source
- 🧩 Visual circuit builder and viewer
- 🧪 Quantum simulation with statevector outputs
- 🔁 Measurement, entanglement, and multi-qubit operation support
- 📊 Bloch sphere visualization (1 and multi-qubit)
- 📸 In-GUI graph and circuit rendering
- 💾 Export capabilities: AST, IR, images, simulation logs
- 📂 Project structure with samples and tutorial files
- 📌 Error handling, log terminal, and detailed help sections
- 🧠 Built-in tutorial programs for Bell, GHZ, teleportation, etc.


## ⚙️ Tech Stack

- **Language**: Python 3.10+
- **GUI**: Tkinter, ttk
- **Visualization**: Matplotlib
- **Custom Compiler**: QuCPL parser, AST → IR translator, simulator
- **Backend**: JSON-based IR processing, logic engine
- **Frontend Modules**: `editor.py`, `viewer.py`, `terminal.py`, `visualize.py`, `bloch.py`


## 🛠️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/tejastro123/QUICKIDE.git
cd QUICKIDE

# 2. (Optional) Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application
python main.py
````

## 📚 Usage Guide

1. **Write a QuCPL program** in the code editor tab.
2. Click **"Generate AST & IR"** to compile and visualize the program's structure.
3. Use the **"Visualize"** button to see the quantum circuit diagram.
4. Run **"Simulate"** to compute the output and statevector.
5. View **Bloch Spheres**, **histograms**, or **statevector graphs** under respective tabs.
6. Use **Export** buttons to save images and logs.

✔️ *Preloaded tutorial programs like Bell State and Quantum Teleportation can be loaded from the tutorial dropdown.*


## 📁 File Structure

```
QUICKIDE/
│
├── backend/              # Core logic: parser, compiler, simulator
│   ├── parser.py
│   ├── compiler.py
│   ├── simulation.py
│   ├── visualize.py
│   └── utils.py
│
├── ui/                   # UI components (modular tabs)
│   ├── editor.py
│   ├── viewer.py
│   ├── terminal.py
│   ├── bloch.py
│   └── help_tab.py
│
├── samples/              # Sample QuCPL programs
├── docs/                 # Documentation and images
├── main.py               # Main launcher script
├── requirements.txt
└── README.md
```


## 🔬 Sample Programs

Inside `/samples/` and accessible via the tutorial menu:

* ✅ Bell State Generator
* ✅ GHZ State
* ✅ Quantum Teleportation
* ✅ Superposition Demo
* ✅ Entanglement Visualizer


## 🤝 Contributing

Contributions are welcome!

* Fork this repository
* Create a new branch (`git checkout -b feature/your-feature`)
* Commit your changes (`git commit -m 'Add awesome feature'`)
* Push to the branch (`git push origin feature/your-feature`)
* Open a Pull Request

Feel free to open [issues](https://github.com/tejastro123/QUICKIDE/issues) for bugs, suggestions, or enhancements.


## 📄 License

This project is licensed under the **MIT License**. See `LICENSE` for details.


## 🙏 Credits & Acknowledgements

* Project by **Tejas Mellimpudi**
* Quantum compiler engine: Custom QuCPL language & IR
* Special thanks to mentors and contributors from BITS Pilani
* Built using Python, Tkinter, Matplotlib, and love for quantum computing 💡


## 🧠 Future Roadmap

* [ ] 🧩 OpenQASM import/export support
* [ ] 🧠 Language server-like features (autocomplete, tooltips, error underlining)
* [ ] 🧪 Formal verification tools and assertion checking
* [ ] 🐞 Built-in quantum debugger
* [ ] 🌐 Cross-platform packaging with PyInstaller + auto-updater
* [ ] 🧾 Documentation site via MkDocs
* [ ] 🔐 Authentication and project save/load system

---

> *Crafted with precision and curiosity to bring quantum programming to your fingertips.*

---
