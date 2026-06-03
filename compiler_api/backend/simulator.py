# compiler_api/backend/simulator.py
# ----------------------------------
# Thin re-export shim — the canonical implementation now lives in
# backend/simulator.py (pure NumPy, zero Qiskit dependency).
#
# Run the Flask app from the repo root:
#   python -m compiler_api.app
# or set PYTHONPATH to the repo root so that `import backend` resolves.

import sys, os

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.simulator import (  # noqa: F401
    StatevectorSimulator,
    simulate,
    get_qasm,
    get_debug_step,
    get_qiskit_code,
)
