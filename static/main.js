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
            players[player[0]] = new Player(player[1]);
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
    reverse_vmap = {3:-1, 0:0, 1:1};
    data = BigInt(n)
    op_id = parseInt(data >> 42n);
    data -= BigInt(op_id) << 42n;
    usr_id = parseInt(data >> 36n);
    data -= BigInt(usr_id) << 36n;
    timestamp = parseInt(data >> 22n);
    data -= BigInt(timestamp) << 22n;
    posx = parseInt(data >> 13n);
    data -= BigInt(posx) << 13n;
    posy = parseInt(data >> 4n);
    data -= BigInt(posy) << 4n;
    vx = reverse_vmap[parseInt(data >> 2n)];
    data -= (data >> 2n) << 2n;
    vy = parseInt(reverse_vmap[data]);
    if(usr_id!=id){
        // console.log(op_id, usr_id, timestamp, posx, posy, vx, vy);
        let target = players[usr_id];
        target.x = posx;
        target.y = posy;
        target.vx = vx;
        target.vy = vy;
    }
});

var click = false
var mouseX = 0;
var mouseY = 0;
var mousemode = 0;
var pause = false;

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
    const keyName = event.key;
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
    const keyName = event.key;
    if(keyList.includes(keyName)){
        players[id].keysPressed[keyList.indexOf(keyName)] = false;
        players[id].calc()
        sendMovePacket();
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
    ping = `U:${up}ms D:${down}ms T:${total}ms`;
    if(total/2 < timeOffsetPrecision) {
        timeOffsetPrecision = total/2;
        timeOffset = receivedTime - (lastPingSent + total/2);
    }
});

function sendMovePacket() {
    vmap = {0:0, 1:1};
    vmap[-1] = 3
    op_id = BigInt(1) << BigInt(42); // movement
    usr_id = BigInt(id) << BigInt(36);
    timesimple = BigInt(Math.floor(timeNow()/10)%10000) << BigInt(22);
    posx = BigInt(Math.floor(players[id].x)) << BigInt(13);
    posy = BigInt(Math.floor(players[id].y)) << BigInt(4);
    vx = BigInt(vmap[players[id].vx]) << BigInt(2);
    vy = BigInt(vmap[players[id].vy]);
    let binNum = op_id + usr_id + timesimple + posx + posy + vx + vy;
    socket.emit("movement", parseInt(binNum));
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
    mouseX = event.pageX-(window.innerWidth-500)/2;
    mouseY = event.pageY-(window.innerHeight-500)/2;
}

function onMouseLeave(event){
    click = false;
}
let keyDirections = [[0,-1],[-1,0],[0,1],[1,0]]; //wasd
class Player{
    constructor(name, x = canvas.width/2, y = canvas.height/2){
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.vx = 0;
        this.keysPressed = [false,false,false,false]; //wasd
        this.name = name;
        let seed = 2*Math.PI*Math.random();
        this.color = "rgba("+(75*Math.sin(seed)+180)+","+(75*Math.sin(seed + 2*Math.PI/3)+180)+","+(75*Math.sin(seed + 4*Math.PI/3)+180)+",1)";
        this.speedfac = 5;
        this.nx = 0;
        this.ny = 0;
        this.updateDir();
        
        this.hit = false;
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
        // if(Math.abs(this.vx) > 5){
        //     this.vx = Math.sign(Math.vx) * 5;
        // }
        // if(Math.abs(this.vy) > 5){
        //     this.vx = Math.sign(Math.vy) * 5;
        // }
    }
    update(i){
        this.x = (((this.x+(this.speedfac * this.vx * frameTime/16.666))%500)+500)%500;
        this.y = (((this.y+(this.speedfac * this.vy * frameTime/16.666))%500)+500)%500;
        // if(!(typeof players[id] === 'undefined')){
            players[id].updateDir();
        // }
        this.getShot(i);
    }
    updateDir(){
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let mag = Math.sqrt(dx*dx + dy*dy);
        this.nx = dx/mag;
        this.ny = dy/mag;
        // console.log(this.nx, this.ny);
    }
    getShot(i){
        for(let bullet of bullets){
            if(bullet.id == i){
                continue;
            }
            if(Math.sqrt((this.x-bullet.x)*(this.x-bullet.x) + (this.y-bullet.y)*(this.y-bullet.y)) < 20 + bullet.r){
                this.hit = true;
                return;
            }
        }
    }
    draw(){
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI);
        ctx.stroke();
        if(this.hit){
            ctx.fillStyle = "white";
            ctx.fill()
        }

        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.font = 16 + "px Arial";
        ctx.fillText(this.name, this.x-10, this.y+32);

        ctx.beginPath();
        ctx.moveTo(this.x,this.y);
        ctx.lineTo(this.x + 20*this.nx, this.y + 20*this.ny);
        ctx.stroke();
    }
}
function shoot(){
    bullets.push(new Bullet(players[id].x, players[id].y, players[id].nx, players[id].ny, players[id].color));
    waitShoot = 20;
}
let bullets = [];
class Bullet{
    constructor(startX,startY,nx,ny,color){
        this.x = startX;
        this.y = startY;
        this.vx = nx;
        this.vy = ny;
        this.color = color;
        this.life = 60;
        this.r = this.life/16+1;
        this.id = id;
    }
    update(i){
        this.x = (((this.x+(this.vx * frameTime/2))%500)+500)%500;
        this.y = (((this.y+(this.vy * frameTime/2))%500)+500)%500;
        this.vx*=0.97;
        this.vy*=0.97;    
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
    ctx.font = canvas.width / 30 + "px Arial";
    ctx.fillStyle = "rgba(255, 245, 80, 1)";
    p = ping.toString();
    ctx.fillText(p, canvas.width - canvas.width*p.length/54 - canvas.width/40, canvas.width / 28);
}

oldTime = 0;
frameIter = 0
function loop(timestamp){
    frameTime = timestamp - oldTime;
    // console.log(frameTime);
    oldTime = timestamp;

    fillscreen();
    for(player in players){
        players[player].draw();
    }
    for(player in players){
        players[player].update(player);
    }
    for(bullet in bullets){
        bullets[bullet].draw();
    }
    for(let bullet = 0; bullet < bullets.length; bullet++){
        if(bullets[bullet].update(bullet)){
            bullet--;
        }
    }
    if(frameIter == 0) {
        sendPing();
    }
    frameIter = (frameIter + 1) % 120
    requestAnimationFrame(loop);
    if(waitShoot > 0){
        waitShoot--;
    }else{
        if(click){
            shoot();
        }
    }
}

requestAnimationFrame(loop)


window.onresize = canvasResize;
function canvasResize() {
    canvas.width  = 500//window.innerWidth;
    canvas.height = 500//window.innerHeight;
    ctx.fillStyle = '#13171A';
    //ctx.fillStyle = canvascolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}