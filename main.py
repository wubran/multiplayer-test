from flask import Flask, render_template
from flask_socketio import SocketIO

import json

with open("secrets.json") as f:
    secrets = json.load(f)

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets["secret"]
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template("index.html")

if __name__ == '__main__':
    socketio.run(app, port=8080, host="0.0.0.0")