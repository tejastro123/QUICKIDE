
import io
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Import your existing backend logic
from backend.parser import parse_qucpl
from backend.visualize import visualize_circuit
from backend.compiler import ast_to_ir
from backend.simulator import simulate
# Assuming your visualize/simulate functions can return image data

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

@app.route('/parse', methods=['POST'])
def handle_parse():
    try:
        code = request.json['code']
        ast = parse_qucpl(code)
        # You'll need to make sure your AST is JSON-serializable
        return jsonify({"ast": ast})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/compile', methods=['POST'])
def handle_compile():
    try:
        ast = request.json['ast']
        ir = ast_to_ir(ast)
        # Ensure IR is also JSON-serializable
        return jsonify({"ir": ir})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/visualize', methods=['POST'])
def handle_visualize():
    try:
        ir = request.json['ir']
        # Modify visualize_circuit to return image data (e.g., a PIL Image)
        # instead of displaying it.
        img_data = visualize_circuit(ir, title="Quantum Circuit") # This function needs to return image bytes
        
        # Send image data back
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
        # Modify simulate to return the histogram image data
        histogram_img = simulate(ir, title="Simulation") # This function needs to return image bytes
        
        return send_file(
            io.BytesIO(histogram_img),
            mimetype='image/png'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001) # Run on a different port than the Node server