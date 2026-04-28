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

/* INTRO */
setTimeout(() => {
  introScreen.style.transition = "0.7s ease";
  introScreen.style.opacity = "0";

  setTimeout(() => {
    introScreen.style.display = "none";
    appScreen.classList.remove("hidden");
  }, 700);

}, 3200);

/* HALF CIRCLE NEEDLE
left = -90
right = 90
*/
function setNeedle(speed){

  const max = 1000;
  const clamped = Math.min(speed, max);

  const angle = -90 + (clamped / max) * 180;

  needle.style.transform = `rotate(${angle}deg)`;
}

/* Smooth Counter */
function setDisplay(val){
  speedValue.innerText = Math.round(val);
  setNeedle(val);
}

/* Bounce realistic */
async function animateSequence(points, delay=140){

  for(const p of points){
    setDisplay(p);
    await new Promise(r => setTimeout(r, delay));
  }
}

/* Real Ping */
async function testPing(){

  const t1 = performance.now();

  await fetch("https://www.cloudflare.com/cdn-cgi/trace?x=" + Date.now(), {
    cache:"no-store"
  });

  return Math.round(performance.now() - t1);
}

/* Real Download */
async function testDownload(){

  const url =
  "https://speed.cloudflare.com/__down?bytes=25000000&t=" + Date.now();

  const start = performance.now();

  const res = await fetch(url);
  const reader = res.body.getReader();

  let received = 0;
  let lastShown = 0;

  while(true){

    const {done, value} = await reader.read();
    if(done) break;

    received += value.length;

    const sec = (performance.now() - start) / 1000;
    const mbps = (received * 8) / sec / 1000000;

    /* smoother movement */
    let mixed = (lastShown * 0.55) + (mbps * 0.45);
    lastShown = mixed;

    setDisplay(mixed);
  }

  const total = (performance.now() - start) / 1000;

  return Math.round((received * 8) / total / 1000000);
}

/* Real Upload */
async function testUpload(){

  const size = 10 * 1024 * 1024;
  const data = new Uint8Array(size);

  const start = performance.now();

  await fetch("https://speed.cloudflare.com/__up", {
    method:"POST",
    body:data
  });

  const total = (performance.now() - start) / 1000;

  return Math.round((size * 8) / total / 1000000);
}

/* Final settle animation */
async function settleTo(target){

  const current = Number(speedValue.innerText);

  let points = [
    current,
    target * 1.08,
    target * 0.96,
    target * 1.02,
    target
  ];

  await animateSequence(points, 160);
}

/* START TEST */
async function startTest(){

  if(running) return;

  running = true;
  startBtn.disabled = true;
  startBtn.innerText = "TESTING...";

  pingText.innerText = "--";
  downloadText.innerText = "--";
  uploadText.innerText = "--";

  setDisplay(0);

  try{

    /* PING */
    testMode.innerText = "PING";
    const ping = await testPing();
    pingText.innerText = ping + " ms";

    /* fake warmup */
    await animateSequence([0,20,55,30,75], 90);

    /* DOWNLOAD */
    testMode.innerText = "DOWNLOAD";
    const down = await testDownload();

    await settleTo(down);

    downloadText.innerText = down + " Mbps";

    /* HOLD DOWNLOAD RESULT */
    await new Promise(r => setTimeout(r, 700));

    /* UPLOAD */
    testMode.innerText = "UPLOAD";

    await animateSequence([
      down,
      down*0.7,
      down*0.45,
      120,
      60
    ],120);

    const up = await testUpload();

    await settleTo(up);

    uploadText.innerText = up + " Mbps";

    /* COMPLETE SHOW MAIN SCORE = DOWNLOAD */
    testMode.innerText = "COMPLETE";

    await new Promise(r => setTimeout(r, 700));

    await settleTo(down);

  }catch(e){

    console.log(e);
    testMode.innerText = "ERROR";

  }

  startBtn.disabled = false;
  startBtn.innerText = "RETEST";
  running = false;
}

startBtn.addEventListener("click", startTest);
