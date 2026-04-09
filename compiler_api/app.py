
import io
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Import your existing backend logic
from backend.parser import parse_qucpl
from backend.visualize import visualize_circuit
from backend.compiler import ast_to_ir
from backend.simulator import simulate, get_qasm, get_debug_step
from backend.cloud_provider import submit_to_ibm, get_job_status_ibm, get_job_results_ibm
# Assuming your visualize/simulate functions can return image data

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
        return jsonify({"qasm": qasm})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/debug/step', methods=['POST'])
def handle_debug_step():
    try:
        ir = request.json['ir']
        step_index = request.json.get('index', -1)
        
        debug_data = get_debug_step(ir, step_index)
        
        # We need to return the statevector AND the image
        # Since we can only send_file once, we'll return the image as base64 
        # or just return JSON and let the client fetch the image separately.
        # Let's use base64 for simplicity in this debugger context.
        import base64
        img_base64 = base64.b64encode(debug_data["circuit_img"]).decode('utf-8')
        
        return jsonify({
            "statevector": debug_data["statevector"],
            "num_qubits": debug_data["num_qubits"],
            "current_gate": debug_data["current_gate"],
            "circuit_img": f"data:image/png;base64,{img_base64}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/visualize', methods=['POST'])
def handle_visualize():
    try:
        ir = request.json['ir']
        img_data = visualize_circuit(ir, title="Quantum Circuit")
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
        histogram_img = simulate(ir, title="Simulation", backend_name=backend)
        
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
    app.run(port=5001) # Run on a different port than the Node server