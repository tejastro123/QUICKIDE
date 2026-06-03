import sys
import os
import io
import base64
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

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
from backend.reverse_transpiler import qasm_to_qucpl
from backend.optimizer import optimize_ir
from backend.algorithms.library import get_library, search_library

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

@app.route('/parse', methods=['POST'])
def handle_parse():
    try:
        code = request.json['code']
        ast = parse_qucpl(code)
        return jsonify({"ast": ast})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/compile', methods=['POST'])
def handle_compile():
    try:
        ast = request.json['ast']
        ir = ast_to_ir(ast)
        return jsonify({"ir": ir})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/transpile', methods=['POST'])
def handle_transpile():
    try:
        ir = request.json['ir']
        qasm = get_qasm(ir)
        qiskit_code = get_qiskit_code(ir)
        return jsonify({"qasm": qasm, "qiskit": qiskit_code})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/transpile/reverse', methods=['POST'])
def handle_reverse_transpile():
    try:
        qasm = request.json['qasm']
        qucpl_code, warnings = qasm_to_qucpl(qasm)
        return jsonify({"code": qucpl_code, "warnings": warnings})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/optimize', methods=['POST'])
def handle_optimize():
    try:
        ir = request.json['ir']
        result = optimize_ir(ir)
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
        title = request.json.get('title', 'Bloch Sphere')
        theme = request.json.get('theme', 'dark')
        img_data = bloch_sphere(statevector, num_qubits, title=title, theme=theme)
        if img_data is None:
            return jsonify({"error": "Empty statevector or zero qubits"}), 400
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
        step_index = request.json.get('index', -1)
        theme = request.json.get('theme', 'dark')
        
        debug_data = get_debug_step(ir, step_index, theme=theme)
        
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
            bloch_bytes = bloch_sphere(statevector, num_qubits, title=f"Bloch Sphere - Step {step_index + 1}", theme=theme)
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
        theme = request.json.get('theme', 'dark')
        img_data = visualize_circuit(ir, title="Quantum Circuit", theme=theme)
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
        backend = request.json.get('backend', 'ideal')
        theme = request.json.get('theme', 'dark')
        histogram_img = simulate(ir, title="Simulation", backend_name=backend, theme=theme)
        
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
        token = request.json['token']
        backend = request.json.get('backend', 'ibm_osaka')
        
        job_data = submit_to_ibm(ir, token, backend)
        return jsonify(job_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/cloud/status', methods=['POST'])
def handle_cloud_status():
    try:
        job_id = request.json['jobId']
        token = request.json['token']
        
        status_data = get_job_status_ibm(job_id, token)
        return jsonify(status_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/cloud/result', methods=['POST'])
def handle_cloud_result():
    try:
        job_id = request.json['jobId']
        token = request.json['token']
        
        result_data = get_job_results_ibm(job_id, token)
        return jsonify(result_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001)