from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit import transpile
from backend.simulator import build_qiskit_circuit

def submit_to_ibm(ir, token, backend_name="ibm_osaka"):
    """
    Submits a circuit to IBM Quantum real hardware or fake cloud backends.
    """
    try:
        # 1. Initialize Service
        service = QiskitRuntimeService(channel='ibm_quantum', token=token)
        
        # 2. Get Backend
        backend = service.backend(backend_name)
        
        # 3. Build Circuit from IR
        qc, _ = build_qiskit_circuit(ir)
        if qc is None:
            return {"error": "Failed to build circuit from IR"}
            
        # 4. Transpile for target hardware
        transpiled_qc = transpile(qc, backend=backend)
        
        # 5. Run using Sampler V2
        sampler = SamplerV2(mode=backend)
        job = sampler.run([transpiled_qc])
        
        return {
            "job_id": job.job_id(),
            "backend": backend_name,
            "status": job.status()
        }
    except Exception as e:
        return {"error": str(e)}

def get_job_status_ibm(job_id, token):
    """
    Polls the status of an IBM Quantum job.
    """
    try:
        service = QiskitRuntimeService(channel='ibm_quantum', token=token)
        job = service.job(job_id)
        return {
            "job_id": job_id,
            "status": job.status().name, # QUEUED, RUNNING, COMPLETED, ERROR
            "metrics": job.metrics() if job.status().name == "COMPLETED" else None
        }
    except Exception as e:
        return {"error": str(e)}

def get_job_results_ibm(job_id, token):
    """
    Retrieves the final results for a completed IBM Quantum job.
    """
    try:
        service = QiskitRuntimeService(channel='ibm_quantum', token=token)
        job = service.job(job_id)
        if job.status().name != "COMPLETED":
            return {"error": f"Job is not completed. Current status: {job.status().name}"}
            
        result = job.result()
        # SamplerV2 returns PubResult objects
        # We assume one pub (one circuit) was submitted
        pub_result = result[0]
        counts = pub_result.data.meas.get_counts()
        
        return {
            "job_id": job_id,
            "counts": counts,
            "status": "COMPLETED"
        }
    except Exception as e:
        return {"error": str(e)}
