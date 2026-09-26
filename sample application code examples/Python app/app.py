import os
import socket

from flask import Flask, jsonify, render_template


app = Flask(__name__)


@app.get("/")
def home():
    return render_template("index.html", hostname=socket.gethostname())


@app.get("/health")
def health():
    return jsonify(status="healthy"), 200


@app.errorhandler(404)
def page_not_found(_error):
    return jsonify(error="page not found"), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
