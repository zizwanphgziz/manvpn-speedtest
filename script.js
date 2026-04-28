setTimeout(()=>{
document.getElementById("splash").style.display="none";
document.getElementById("main").classList.remove("hidden");
},4500);

document.getElementById("startBtn").onclick=async function(){

let speed = document.getElementById("speed");
let ping = document.getElementById("ping");
let down = document.getElementById("download");
let up = document.getElementById("upload");

ping.innerText = Math.floor(Math.random()*20)+5;

for(let i=0;i<=650;i+=10){
speed.innerText=i;
await new Promise(r=>setTimeout(r,20));
}
down.innerText=speed.innerText;

for(let i=650;i>=0;i-=15){
speed.innerText=i;
await new Promise(r=>setTimeout(r,15));
}

let uploadVal=Math.floor(Math.random()*400)+200;
up.innerText=uploadVal;
speed.innerText=uploadVal;

};
