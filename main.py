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
socketio = SocketIO(app)

playerIdIter = [0,]
players = []

@app.route('/')
def index():
    return render_template("index.html")

@socketio.on('join')
def on_join(name):
    players.append([playerIdIter[0], name, request.sid])
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
    # reverse_vmap = {3:-1, 0:0, 1:1}
    # # print(data, bin(data))
    # op_id = data >> 42
    # data -= op_id << 42
    # usr_id = data >> 36
    # data -= usr_id << 36
    # timestamp = data >> 22
    # data -= timestamp << 22
    # posx = data >> 13
    # data -= posx << 13
    # posy = data >> 4
    # data -= posy << 4
    # vx = reverse_vmap[data >> 2]
    # data -= (data >> 2) << 2
    # vy = reverse_vmap[data]
    # print(op_id, usr_id, timestamp, posx, posy, vx, vy)
    
    


if __name__ == '__main__':
    print("Starting...")
    socketio.run(app, port=80, host="0.0.0.0")