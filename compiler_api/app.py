import sys
import os
import io
import base64
import json
import time
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from concurrent.futures import ThreadPoolExecutor, TimeoutError

# Prepend the repository root to sys.path so that imports of 'backend' resolve
# to the canonical root backend package rather than the local 'compiler_api/backend' shim folder.
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Import your existing backend logic
from backend.parser import parse_qucpl
from backend.visualize import visualize_circuit
from backend.compiler import ast_to_ir
from backend.simulator import simulate, get_qasm, get_debug_step, get_qiskit_code
from backend.cloud_provider import submit_to_ibm, get_job_status_ibm, get_job_results_ibm

# Phase 2 Imports
from backend.bloch import bloch_sphere
from backend.reverse_transpiler import qasm_to_qucpl, qiskit_to_qucpl
from backend.optimizer import optimize_ir
from backend.algorithms.library import get_library, search_library

app = Flask(__name__)
# Restrict request body size to 1MB to prevent memory exhaustion attacks
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Custom JSON Formatter for Python logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "message": record.getMessage(),
            "name": record.name,
            "filename": record.filename,
            "lineno": record.lineno
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Configure JSON logging on stdout
log_handler = logging.StreamHandler(sys.stdout)
log_handler.setFormatter(JsonFormatter())
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers = [log_handler]

# Disable default werkzeug logger to avoid duplicate logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)

@app.before_request
def start_timer():
    request.start_time = time.time()

@app.after_request
def log_request(response):
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        log_data = {
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "level": "INFO",
            "message": f"{request.method} {request.path} {response.status_code} - {duration*1000:.2f}ms",
            "context": {
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "durationMs": duration * 1000,
                "ip": request.remote_addr,
                "requestId": request.headers.get('X-Request-ID', '')
            }
        }
        print(json.dumps(log_data))
    return response

import hashlib
from compiler_api.storage.local import LocalStorageProvider

storage = LocalStorageProvider()

def _compute_cache_key(prefix: str, *args, **kwargs) -> str:
    # Serialize arguments to a stable json string and hash
    serialized = json.dumps((args, kwargs), sort_keys=True)
    h = hashlib.sha256(serialized.encode('utf-8')).hexdigest()[:16]
    return f"{prefix}_{h}.png"

MAX_QUBITS = 20
MAX_GATES = 1000
MAX_EXECUTION_SECONDS = 30.0

# Pre-allocated thread pool executor for processing circuit execution tasks
executor = ThreadPoolExecutor(max_workers=4)

def validate_ir_limits(ir):
    if not isinstance(ir, dict):
        return
    qubits = ir.get("qubits", [])
    if len(qubits) > MAX_QUBITS:
        raise ValueError(f"Circuit exceeds maximum qubit limit of {MAX_QUBITS} (has {len(qubits)}).")
    
    instructions = ir.get("instructions", [])
    if len(instructions) > MAX_GATES:
        raise ValueError(f"Circuit exceeds maximum gate/instruction limit of {MAX_GATES} (has {len(instructions)}).")

def run_task_with_timeout(func, *args, **kwargs):
    """Submits func to executor and enforces a hard time limit."""
    future = executor.submit(func, *args, **kwargs)
    try:
        return future.result(timeout=MAX_EXECUTION_SECONDS)
    except TimeoutError:
        raise RuntimeError(f"Request execution timed out (limit {MAX_EXECUTION_SECONDS}s exceeded)")

@app.route('/health', methods=['GET'])
def handle_health():
    return jsonify({"status": "ok", "version": "1.0"})

@app.route('/parse', methods=['POST'])
def handle_parse():
    try:
        code = request.json['code']
        ast = run_task_with_timeout(parse_qucpl, code)
        return jsonify({"ast": ast})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/compile', methods=['POST'])
def handle_compile():
    try:
        ast = request.json['ast']
        ir = run_task_with_timeout(ast_to_ir, ast)
        validate_ir_limits(ir)
        return jsonify({"ir": ir})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/transpile', methods=['POST'])
def handle_transpile():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        
        def transpile_task(circuit_ir):
            return get_qasm(circuit_ir), get_qiskit_code(circuit_ir)
            
        qasm, qiskit_code = run_task_with_timeout(transpile_task, ir)
        return jsonify({"qasm": qasm, "qiskit": qiskit_code})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/transpile/reverse', methods=['POST'])
def handle_reverse_transpile():
    try:
        code_input = request.json.get('qiskit') or request.json.get('qasm')
        if not code_input:
            return jsonify({"error": "No input code provided"}), 400
            
        def reverse_task(inp):
            if "QuantumCircuit" in inp or "from qiskit" in inp or "circuit." in inp:
                return qiskit_to_qucpl(inp)
            else:
                return qasm_to_qucpl(inp)
                
        qucpl_code, warnings = run_task_with_timeout(reverse_task, code_input)
        return jsonify({"code": qucpl_code, "warnings": warnings})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/optimize', methods=['POST'])
def handle_optimize():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        result = run_task_with_timeout(optimize_ir, ir)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/algorithms', methods=['GET'])
def handle_algorithms():
    try:
        query = request.args.get('q', '')
        category = request.args.get('category', '')
        library = search_library(query, category)
        return jsonify(library)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/bloch', methods=['POST'])
def handle_bloch():
    try:
        statevector = request.json['statevector']
        num_qubits = request.json['num_qubits']
        if num_qubits > MAX_QUBITS:
            return jsonify({"error": f"Statevector has {num_qubits} qubits. Max supported is {MAX_QUBITS}."}), 400
        title = request.json.get('title', 'Bloch Sphere')
        theme = request.json.get('theme', 'dark')
        
        # Caching logic
        cache_key = _compute_cache_key("bloch", statevector, num_qubits, title, theme)
        if storage.exists(cache_key):
            img_data = storage.get(cache_key)
        else:
            img_data = run_task_with_timeout(bloch_sphere, statevector, num_qubits, title=title, theme=theme)
            if img_data is None:
                return jsonify({"error": "Empty statevector or zero qubits"}), 400
            storage.put(cache_key, img_data)
            
        return send_file(
            io.BytesIO(img_data),
            mimetype='image/png'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/debug/step', methods=['POST'])
def handle_debug_step():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        step_index = request.json.get('index', -1)
        theme = request.json.get('theme', 'dark')
        
        debug_data = run_task_with_timeout(get_debug_step, ir, step_index, theme=theme)
        
        circuit_img_bytes = debug_data.get("circuit_img")

        if circuit_img_bytes is not None:
            img_base64 = base64.b64encode(circuit_img_bytes).decode('utf-8')
            circuit_img_data_url = f"data:image/png;base64,{img_base64}"
        else:
            _BLANK_PNG = (
                b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
                b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
                b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01'
                b'\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
            )
            img_base64 = base64.b64encode(_BLANK_PNG).decode('utf-8')
            circuit_img_data_url = f"data:image/png;base64,{img_base64}"

        # Generate Bloch sphere visualization for debug step
        bloch_img_data_url = None
        statevector = debug_data.get("statevector")
        num_qubits = debug_data.get("num_qubits", 0)
        if statevector and num_qubits > 0:
            bloch_bytes = run_task_with_timeout(
                bloch_sphere, statevector, num_qubits, 
                title=f"Bloch Sphere - Step {step_index + 1}", theme=theme
            )
            if bloch_bytes:
                bloch_base64 = base64.b64encode(bloch_bytes).decode('utf-8')
                bloch_img_data_url = f"data:image/png;base64,{bloch_base64}"
        
        return jsonify({
            "statevector": debug_data["statevector"],
            "num_qubits": debug_data["num_qubits"],
            "current_gate": debug_data["current_gate"],
            "circuit_img": circuit_img_data_url,
            "bloch_img": bloch_img_data_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/visualize', methods=['POST'])
def handle_visualize():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        theme = request.json.get('theme', 'dark')
        
        # Caching logic
        cache_key = _compute_cache_key("viz", ir, theme)
        if storage.exists(cache_key):
            img_data = storage.get(cache_key)
        else:
            img_data = run_task_with_timeout(visualize_circuit, ir, title="Quantum Circuit", theme=theme)
            if img_data:
                storage.put(cache_key, img_data)
                
        return send_file(
            io.BytesIO(img_data),
            mimetype='image/png'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/simulate', methods=['POST'])
def handle_simulate():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        backend = request.json.get('backend', 'ideal')
        theme = request.json.get('theme', 'dark')
        
        # Caching logic
        cache_key = _compute_cache_key("sim", ir, backend, theme)
        if storage.exists(cache_key):
            histogram_img = storage.get(cache_key)
        else:
            histogram_img = run_task_with_timeout(simulate, ir, title="Simulation", backend_name=backend, theme=theme)
            if histogram_img:
                storage.put(cache_key, histogram_img)
        
        return send_file(
            io.BytesIO(histogram_img),
            mimetype='image/png'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/cloud/submit', methods=['POST'])
def handle_cloud_submit():
    try:
        ir = request.json['ir']
        validate_ir_limits(ir)
        token = request.json['token']
        backend = request.json.get('backend', 'ibm_osaka')
        
        job_data = run_task_with_timeout(submit_to_ibm, ir, token, backend)
        return jsonify(job_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/cloud/status', methods=['POST'])
def handle_cloud_status():
    try:
        job_id = request.json['jobId']
        token = request.json['token']
        
        status_data = run_task_with_timeout(get_job_status_ibm, job_id, token)
        return jsonify(status_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/cloud/result', methods=['POST'])
def handle_cloud_result():
    try:
        job_id = request.json['jobId']
        token = request.json['token']
        
        result_data = run_task_with_timeout(get_job_results_ibm, job_id, token)
        return jsonify(result_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001)