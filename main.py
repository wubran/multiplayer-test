from time import time
from flask import Flask, render_template, request
from flask_socketio import SocketIO, send, emit

import json
import random
import time
import math

with open("secrets.json") as f:
    secrets = json.load(f)

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets["secret"]
socketio = SocketIO(app, cors_allowed_origins="*")

playerIdIter = [0,]
players = []

@app.route('/')
def index():
    return render_template("index.html")

@socketio.on('join')
def on_join(name):
    players.append([playerIdIter[0], name, request.sid, 100])
    playerIdIter[0] = (playerIdIter[0] + 1)%64
    print(f"Player Joined: {name}")
    emit("player_update", players, broadcast=True)

@socketio.on("ping")
def pong():
    emit("pong", math.floor(time.time()*1000))

@socketio.on('disconnect')
def disconnect():
    for i in range(len(players)):
        if players[i][2] == request.sid:
            print(f"Player Left: {players[i][1]}")
            players.pop(i)
            break
    emit("player_update", players, broadcast=True)

@socketio.on("movement")
def mov(data):
    emit("new_movement", data, broadcast = True)

@socketio.on("heading")
def heading(d):
    # print(d)
    emit("heading_update", d, broadcast = True)

@socketio.on("fire_bullet")
def bullet(d):
    emit("bullet_fired", d, broadcast = True)

@socketio.on("got_hit")
def gothit(id):
    emit("hit_report", id, broadcast = True)
    for i,player in enumerate(players):
        if player[0] == id[0]:
            players[i][3] = id[0]


if __name__ == '__main__':
    print("Starting...")
    socketio.run(app, port=80, host="0.0.0.0")