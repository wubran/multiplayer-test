canvascolor = "rgba(19, 23, 26, 1)";
var canvas = document.getElementById('screen');
var ctx = canvas.getContext('2d');

players = []

var click = false
var mouseX = 0;
var mouseY = 0;
var mousemode = 0;
var pause = false;

var frameTime = 16;

canvasResize();


// canvas.addEventListener('mousedown', onClick);
// canvas.addEventListener("mouseup", onRelease);
// canvas.addEventListener("wheel", scroll)
// canvas.addEventListener('mouseleave', onMouseLeave);
// canvas.addEventListener('mousemove', onMouseMove);
// const keyDict = {
//     w: [0,-1],
//     a: [-1,0],
//     s: [0,1],
//     d: [1,0]
// };
const keyList = ["w","a","s","d"]
document.addEventListener('keydown', (event) => {
    const keyName = event.key;
    if(keyList.includes(keyName)){
        players[0].keysPressed[keyList.indexOf(keyName)] = true;
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
            pause = !pause;
            return;
    }
}, false);

document.addEventListener('keyup', (event) => {
    const keyName = event.key;
    if(keyList.includes(keyName)){
        players[0].keysPressed[keyList.indexOf(keyName)] = false;
    }
}, false);

function onClick(event){
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
    update(){
        this.x += this.speedfac * this.vx * frameTime/16;
        this.y += this.speedfac * this.vy * frameTime/16;
    }
    draw(){
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        // ctx.fillStyle = "black"//this.color.slice(0,-2)+"0.3)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.font = 16 + "px Arial";
        ctx.fillText(this.name, this.x-10, this.y+32);

    }
}

players.push(new Player("bruh"));
players.push(new Player("gruh", 200, 200));


function fillscreen(){
    ctx.fillStyle = canvascolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = canvas.width / 30 + "px Arial";
    ctx.fillStyle = "rgba(255, 245, 80, 1)";
    strplayers = players.length.toString();
    ctx.fillText(players.length, canvas.width - canvas.width*strplayers.length/54 - canvas.width/40, canvas.width / 28);
}

oldTime = 0;
function loop(timestamp){
    frameTime = timestamp - oldTime;
    // console.log(frameTime);
    oldTime = timestamp;

    fillscreen();
    for(player of players){
        player.draw();
    }
    for(player of players){
        player.calc();
    }
    for(player of players){
        player.update();
    }
    
    requestAnimationFrame(loop);
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