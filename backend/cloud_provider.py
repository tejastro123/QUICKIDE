"""
backend/cloud_provider.py
=========================
Submits circuits to IBM Quantum real hardware via Qiskit IBM Runtime.

NOTE: This is the ONLY remaining file that imports Qiskit — specifically
`qiskit-ibm-runtime` for interacting with real hardware.  The local
simulation engine (simulator.py / visualize.py) has been fully decoupled
from Qiskit.

The circuit is transpiled to QASM first (using our own get_qasm()), then
handed to QiskitRuntimeService for hardware execution.
"""

def _build_qiskit_circuit_from_qasm(qasm_str: str):
    """
    Parse our hand-generated QASM into a Qiskit QuantumCircuit for IBM upload.
    Only called when the user explicitly submits to real hardware.
    """
    from qiskit import QuantumCircuit
    return QuantumCircuit.from_qasm_str(qasm_str)


def submit_to_ibm(ir: dict, token: str, backend_name: str = "ibm_osaka") -> dict:
    """
    Submits a circuit to IBM Quantum real hardware.

    Parameters
    ----------
    ir           : compiled IR dict
    token        : IBM Quantum API token
    backend_name : e.g. 'ibm_osaka', 'ibm_kyoto'
    """
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
        from qiskit import transpile
        from backend.simulator import get_qasm

        # 1. Convert IR → QASM → Qiskit QuantumCircuit
        qasm_str = get_qasm(ir)
        qc = _build_qiskit_circuit_from_qasm(qasm_str)

        # 2. Initialize IBM Quantum service
        service = QiskitRuntimeService(channel="ibm_quantum", token=token)

        # 3. Get backend
        backend = service.backend(backend_name)

        # 4. Transpile for target hardware
        transpiled_qc = transpile(qc, backend=backend)

        # 5. Run using Sampler V2
        sampler = SamplerV2(mode=backend)
        job = sampler.run([transpiled_qc])

        return {
            "job_id": job.job_id(),
            "backend": backend_name,
            "status": str(job.status()),
        }
    except Exception as e:
        return {"error": str(e)}


def get_job_status_ibm(job_id: str, token: str) -> dict:
    """Polls the status of an IBM Quantum job."""
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService

        service = QiskitRuntimeService(channel="ibm_quantum", token=token)
        job = service.job(job_id)
        status = job.status()
        return {
            "job_id": job_id,
            "status": status.name,
            "metrics": job.metrics() if status.name == "COMPLETED" else None,
        }
    except Exception as e:
        return {"error": str(e)}


def get_job_results_ibm(job_id: str, token: str) -> dict:
    """Retrieves the final results for a completed IBM Quantum job."""
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService

        service = QiskitRuntimeService(channel="ibm_quantum", token=token)
        job = service.job(job_id)
        if job.status().name != "COMPLETED":
            return {"error": f"Job not completed. Status: {job.status().name}"}

        result = job.result()
        pub_result = result[0]
        counts = pub_result.data.meas.get_counts()
        return {"job_id": job_id, "counts": counts, "status": "COMPLETED"}
    except Exception as e:
        return {"error": str(e)}
