# compiler_api/backend/visualize.py
# -----------------------------------
# Thin re-export shim — the canonical implementation now lives in
# backend/visualize.py (pure matplotlib, zero Qiskit dependency).
#
# Run the Flask app from the repo root:
#   python -m compiler_api.app
# or set PYTHONPATH to the repo root.

import sys, os

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.visualize import visualize_circuit  # noqa: F401
