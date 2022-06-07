canvascolor = "rgba(19, 23, 26, 1)";
var canvas = document.getElementById('screen');
var ctx = canvas.getContext('2d');

players = {}

var playername = prompt("Enter your name:");
var id;
var waitShoot = 0;

var socket = io();

var timeOffset = 0;
var timeOffsetPrecision = 99999;


socket.on('connect', function() {
    socket.emit('join', playername);
});

socket.on('player_update', function(playerlist) {
    // players = {};
    
    let existingIds = [];
    for(let player of playerlist) {
        existingIds.push(player[0]);
        if(!players.hasOwnProperty(player[0])) {
            players[player[0]] = new Player(player[0], player[1]);
            players[player[0]].health = player[3];
        }
        if(player[1]==playername) {
            id = player[0];
        }
    }
    for(let p in players) {
        if(!existingIds.includes(parseInt(p))) {
            delete players[parseInt(p)];
        }
    }
    sendMovePacket();
});

socket.on("new_movement", function(n) {
    if(n[0]!=id){
        let target = players[n[0]];
        target.x = n[1];
        target.y = n[2];
        target.vx = n[3];
        target.vy = n[4];
    }
});

socket.on("heading_update", (d) => {
    if(d[0] != id && players.hasOwnProperty(d[0])) {
        players[d[0]].targetNx = d[1];
        players[d[0]].targetNy = d[2];
    }
});

socket.on("bullet_fired", (d) => {
    if(d[0] != id && players.hasOwnProperty(d[0])) {
        bullets.push(new Bullet(d[1], d[2], d[3], d[4], d[5], d[0]));
    }
})

socket.on("hit_report", (d) => {
    players[d[0]].hitTimer = 30;
    if(d[0] != id) {
        players[d[0]].health = d[1]
    }
});

var click = false
var mouseX = 0;
var mouseY = 0;
var mousemode = 0;
var pause = false;
const playerRadius = 14;

var frameTime = 16;
var ping = "U:0ms D:0ms T:0ms";
var lastPingSent;

canvasResize();

document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mousedown', onClick);
document.addEventListener("mouseup", onRelease);
document.addEventListener('mouseleave', onMouseLeave);

const keyList = ["w","a","s","d"]
document.addEventListener('keydown', (event) => {
    let keyName = event.key;
    if(keyName.length == 1){
        keyName = keyName.toLowerCase();
    }
    if(keyList.includes(keyName) && !players[id].keysPressed[keyList.indexOf(keyName)]){
        players[id].keysPressed[keyList.indexOf(keyName)] = true;
        players[id].calc()
        sendMovePacket();
    }
    switch(keyName){
        case 'Control':
            return;
        case 'm':
            mousemode+=1;
            if(mousemode>2){
                mousemode=0;
            }
            return;
        case 'Escape':

            return;
        case ' ':
            onClick();
            return;
    }
}, false);

document.addEventListener('keyup', (event) => {
    let keyName = event.key;
    if(keyName.length == 1){
        keyName = keyName.toLowerCase();
    }
    if(keyList.includes(keyName)){
        players[id].keysPressed[keyList.indexOf(keyName)] = false;
        players[id].calc()
        sendMovePacket();
        return;
    }
    if(keyName == " "){
        onRelease();
    }
}, false);

function timeNow() {
    return Math.round(Date.now() + timeOffset);
}

function b(dec) {
    return (dec >>> 0).toString(2);
}

function sendPing() {
    lastPingSent = Date.now();
    socket.emit("ping");
}
socket.on("pong", (receivedTime) => {
    let now = Date.now();
    let up = receivedTime - (lastPingSent+timeOffset);
    let down = (now+timeOffset) - receivedTime;
    let total = now - lastPingSent;
    ping = `U:${Math.round(up)}ms D:${Math.round(down)}ms T:${total}ms`;
    if(total/2 < timeOffsetPrecision) {
        timeOffsetPrecision = total/2;
        timeOffset = receivedTime - (lastPingSent + total/2);
    }
});

function sendMovePacket() {
    let d = [id, players[id].x, players[id].y, players[id].vx, players[id].vy];
    socket.emit("movement", d);
}

window.onbeforeunload = closingCode;
function closingCode(){
   socket.emit("dc", id);
   return null;
}

function onClick(event){
    if(waitShoot == 0){
        shoot();
    }
    click = true;
}

function onRelease(event){
    click = false;
}

function onMouseMove(event){
    mouseX = event.pageX;
    mouseY = event.pageY;
}

function onMouseLeave(event){
    click = false;
}
let keyDirections = [[0,-1],[-1,0],[0,1],[1,0]]; //wasd
class Player{
    constructor(id, name, x = canvas.width/2, y = canvas.height/2){
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.vx = 0;
        this.keysPressed = [false,false,false,false]; //wasd
        this.name = name;
        this.id = id;
        let seed = 2*Math.PI*Math.random();
        this.color = "rgba("+(75*Math.sin(seed)+180)+","+(75*Math.sin(seed + 2*Math.PI/3)+180)+","+(75*Math.sin(seed + 4*Math.PI/3)+180);
        this.speedfac = 5;
        this.nx = 0;
        this.ny = 0;
        this.targetNx = 0;
        this.targetNy = 0;
        this.updateDir();
        
        this.hitTimer = 120;
        this.health = 100;
    }
    calc(){
        this.vx = 0;
        this.vy = 0;
        for(let i = 0; i<4; i++){
            if(this.keysPressed[i]){
                this.vx += keyDirections[i][0];
                this.vy += keyDirections[i][1];
            }
        }
    }
    update(i){
        this.x = (this.x+(this.speedfac * this.vx * frameTime/16.666));
        this.y = (this.y+(this.speedfac * this.vy * frameTime/16.666));
        if(this.id == id){
            this.getShot(i);
        }
    }
    updateDir(){
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let mag = Math.sqrt(dx*dx + dy*dy);
        this.nx = dx/mag;
        this.ny = dy/mag;
        // console.log(this.nx, this.ny);
    }
    alignToTarget() {
        this.nx += (this.targetNx - this.nx)/1.75;
        this.ny += (this.targetNy - this.ny)/1.75;

        let mult = 1/Math.sqrt(this.nx*this.nx+this.ny*this.ny);
        this.nx *= mult;
        this.ny *= mult;
    }
    getShot(i){
        for(let bullet of bullets){
            if(bullet.id == i){
                continue;
            }
            if(Math.sqrt((this.x-bullet.x)*(this.x-bullet.x) + (this.y-bullet.y)*(this.y-bullet.y)) < playerRadius + bullet.r){
                bullet.life = 0;
                this.health -= bullet.life/18 + 2;
                if(this.health <= 0){
                    socket.emit("dead", id);
                    setTimeout(() => {
                        window.alert("You Died!");
                        document.location.reload();
                    }, 1000);
                }
                this.health = Math.floor(this.health);
                socket.emit("got_hit", [id, this.health, bullet.id, timeNow()]);
                return;
            }
        }
    }
    draw(){
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color + ",1)";
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, playerRadius, 0, 2 * Math.PI);
        ctx.stroke();
        if(this.hitTimer > 0){
            this.hitTimer -= 4*frameTime/16.666;
            ctx.fillStyle = "rgba(255,255,255,"+ (this.hitTimer/100) +")";
            ctx.fill()
        }

        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.font = 16 + "px Arial";
        ctx.fillText(this.name, this.x-10, this.y+32);

        ctx.beginPath();
        ctx.moveTo(this.x,this.y);
        ctx.lineTo(this.x + playerRadius*this.nx, this.y + playerRadius*this.ny);
        ctx.stroke();

        ctx.lineWidth = 6;
        // ctx.strokeStyle = "rgba("+ (255 - 2*this.life) +","+ (55 + 2*this.life) +",0,1)";
        ctx.strokeStyle = this.color + ",0.4)"
        ctx.beginPath();
        let angle = Math.atan(this.ny/this.nx)-Math.PI;
        if(this.nx < 0){
            angle += Math.PI;
        }
        ctx.arc(this.x, this.y, playerRadius+3, angle-(Math.PI*this.health/100), angle+(Math.PI*this.health/100));
        ctx.stroke();
    }
}
function shoot(){
    bullets.push(new Bullet(players[id].x, players[id].y, players[id].nx, players[id].ny, timeNow(), id));
    socket.emit("fire_bullet", [id, players[id].x, players[id].y, players[id].nx, players[id].ny, timeNow()]);
    waitShoot = 5;
}
let bullets = [];
class Bullet{
    constructor(startX,startY,nx,ny,start, owning_player_id){

        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.startTime = start;
        this.vx = nx;
        this.vy = ny;
        this.color = players[owning_player_id].color;
        this.life = 60;
        this.r = this.life/16+1;
        this.id = owning_player_id;

    }
    update(i){
        this.x = (this.startX+(  (this.vx)*(timeNow()-this.startTime))/4);
        this.y = (this.startY+(  (this.vy)*(timeNow()-this.startTime))/4);
        this.life-=frameTime/16.666;
        this.r = this.life/16+1;
        if(this.life <= 0){
            bullets.splice(i,i+1);
            return true;
        }
        return false;
    }
    draw(){
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        ctx.stroke();
    }
}



function fillscreen(){
    ctx.fillStyle = canvascolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = canvas.height / 30 + "px Arial";
    ctx.fillStyle = "rgba(255, 245, 80, 1)";
    p = ping.toString();
    ctx.fillText(p, canvas.width - canvas.width*p.length/108, canvas.height / 28);
}


oldTime = 0;
frameIter = 1;

function loop(timestamp){
    frameTime = timestamp - oldTime;
    oldTime = timestamp;

    fillscreen();
    for(player in players){
        players[player].draw();
    }
    for(player in players){
        players[player].update(player);
        if(player != id) {
            players[player].alignToTarget();
        }
    }
    if(!(typeof players[id] === 'undefined')){
        players[id].updateDir();
    }
    for(bullet in bullets){
        bullets[bullet].draw();
    }
    for(let bullet = 0; bullet < bullets.length; bullet++){
        if(bullets[bullet].update(bullet)){
            bullet--;
        }
    }
    
    frameIter = (frameIter + 1)
    requestAnimationFrame(loop);
    if(waitShoot > 0){
        waitShoot-=frameTime/16.667;
    }else{
        if(click){
            shoot();
        }
    }

}

requestAnimationFrame(loop)

let intervals = 0;
// let lastNx = 1;
// let lastNy = 0;
setInterval(() => {
    if(intervals % 20 == 0) {
        sendPing();
    }
    if(intervals % 2 == 0 && id > -1) {
        socket.emit("heading", [id, players[id].nx, players[id].ny]);
    }
    intervals++;
}, 50);

window.onresize = canvasResize;
function canvasResize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = '#13171A';
    //ctx.fillStyle = canvascolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}