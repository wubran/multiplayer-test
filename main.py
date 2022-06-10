from time import time
from flask import Flask, render_template, request, escape
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

@app.route('/game/<name>/')
def index(name):
    validated, reason = validate_name(name)
    if validated:
        return render_template("index.html", name=name)
    else:
        return render_template("landing.html", msg=reason)

@app.route("/died/")
def died():
    return render_template("landing.html", msg="You died!")

@app.route("/")
def landing():
    return render_template("landing.html", msg="Welcome!")

@socketio.on('join')
def on_join(name):
    players.append([playerIdIter[0], name, request.sid, 100])
    playerIdIter[0] = (playerIdIter[0] + 1)%64
    print(f"Player Joined: {name}")
    welcome_msgdata = {
        "author": "<b>Server</b>",
        "message": "Welcome to whatever this game is! " \
        "<br><br>You can aim with your mouse and click or use the spacebar to shoot" \
        "<br><br>You can move around by using WASD. <br><br>Use Enter to open the chat box",
        "color": "magenta",
        "private": False,
        "target": None
    }
    emit("chat_message_received", welcome_msgdata)
    emit("player_update", players, broadcast=True)

@socketio.on("ping")
def pong():
    emit("pong", math.floor(time.time()*1000))

@socketio.on("chat_message_sent")
def new_msg(msgdata):
    msgdata["message"] = escape(msgdata["message"])
    if not msgdata["private"]:
        emit("chat_message_received", msgdata, broadcast = True)

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
    

@socketio.on("dead")
def dead(id):
    for i in range(len(players)):
        if players[i][0] == id:
            print(f"Player Died: {players[i][1]}")
            emit("chat_message_received", {
                "author": "<b>Game</b>",
                "message": f"{players[i][1]} died.",
                "color": "red",
                "private": False,
                "target": None
            }, broadcast=True)
            players.pop(i)
            break
    
    emit("player_update", players, broadcast=True)

def validate_name(name):
    for player in players:
        if player[1] == name:
            return False,"Someone already has that name."
    return len(name) < 20 and name.isalnum(),"Names must be at most 20 characters and alphanumeric."

if __name__ == '__main__':
    print("Starting...")
    socketio.run(app, port=80, host="0.0.0.0")