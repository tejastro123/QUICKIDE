"""
tests/conftest.py
-----------------
Shared pytest fixtures for the QuCPL test suite.
"""
import sys, os

# Ensure repo root is on PYTHONPATH for all test modules
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
