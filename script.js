const introScreen = document.getElementById("introScreen");
const appScreen = document.getElementById("appScreen");

const startBtn = document.getElementById("startBtn");

const speedValue = document.getElementById("speedValue");
const pingText = document.getElementById("ping");
const downloadText = document.getElementById("download");
const uploadText = document.getElementById("upload");
const testMode = document.getElementById("testMode");

const needle = document.getElementById("needle");

let running = false;

/* INTRO AUTO */
setTimeout(() => {
  introScreen.style.opacity = "0";
  introScreen.style.transition = "0.7s ease";

  setTimeout(() => {
    introScreen.style.display = "none";
    appScreen.classList.remove("hidden");
  }, 700);

}, 3200);

/* NEEDLE CONTROL */
function setNeedle(speed){
  let maxSpeed = 1000;
  let angle = -130 + (Math.min(speed, maxSpeed) / maxSpeed) * 260;
  needle.style.transform = `rotate(${angle}deg)`;
}

/* SMOOTH COUNTER */
async function animateTo(target, duration = 1200){
  let start = Number(speedValue.innerText) || 0;
  let startTime = performance.now();

  return new Promise(resolve => {

    function frame(now){
      let progress = Math.min((now - startTime) / duration, 1);
      let current = Math.floor(start + (target - start) * progress);

      speedValue.innerText = current;
      setNeedle(current);

      if(progress < 1){
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

/* REAL PING */
async function testPing(){
  const start = performance.now();

  await fetch("https://www.cloudflare.com/cdn-cgi/trace?x=" + Date.now(), {
    cache: "no-store"
  });

  return Math.round(performance.now() - start);
}

/* REAL DOWNLOAD */
async function testDownload(){

  const url =
    "https://speed.cloudflare.com/__down?bytes=25000000&t=" + Date.now();

  const start = performance.now();

  const res = await fetch(url);
  const reader = res.body.getReader();

  let received = 0;

  while(true){

    const {done, value} = await reader.read();
    if(done) break;

    received += value.length;

    const sec = (performance.now() - start) / 1000;
    const mbps = Math.floor((received * 8) / sec / 1000000);

    speedValue.innerText = mbps;
    setNeedle(mbps);
  }

  const total = (performance.now() - start) / 1000;

  return Math.floor((received * 8) / total / 1000000);
}

/* REAL UPLOAD */
async function testUpload(){

  const size = 10 * 1024 * 1024;
  const data = new Uint8Array(size);

  const start = performance.now();

  await fetch("https://speed.cloudflare.com/__up", {
    method:"POST",
    body:data
  });

  const total = (performance.now() - start) / 1000;

  return Math.floor((size * 8) / total / 1000000);
}

/* START TEST */
async function startTest(){

  if(running) return;
  running = true;

  startBtn.disabled = true;
  startBtn.innerText = "TESTING...";

  speedValue.innerText = "0";
  setNeedle(0);

  pingText.innerText = "--";
  downloadText.innerText = "--";
  uploadText.innerText = "--";

  try{

    /* Ping */
    testMode.innerText = "PING";
    const ping = await testPing();
    pingText.innerText = ping + " ms";

    /* Download */
    testMode.innerText = "DOWNLOAD";
    const down = await testDownload();
    downloadText.innerText = down + " Mbps";

    await animateTo(down, 400);

    /* Upload */
    testMode.innerText = "UPLOAD";
    await animateTo(0, 400);

    const up = await testUpload();
    uploadText.innerText = up + " Mbps";

    await animateTo(up, 800);

    testMode.innerText = "COMPLETE";

  } catch(e){

    testMode.innerText = "ERROR";
    console.log(e);

  }

  startBtn.disabled = false;
  startBtn.innerText = "RETEST";
  running = false;
}

startBtn.addEventListener("click", startTest);
