/* =========================
   MANVPN SPEEDTEST FULL FIX
   SCRIPT.JS
========================= */

const startBtn     = document.getElementById("startBtn");
const speedValue   = document.getElementById("speedValue");
const needle       = document.getElementById("needle");

const pingValue    = document.getElementById("pingValue");
const jitterValue  = document.getElementById("jitterValue");

const pingCard     = document.getElementById("pingCard");
const downValue    = document.getElementById("downValue");
const upValue      = document.getElementById("upValue");

const downTop      = document.getElementById("downTop");
const upTop        = document.getElementById("upTop");

const statusText   = document.getElementById("statusText");

let running = false;

/* =========================
   SCALE
   0 Mbps   = -120deg
   1000 Mbps = +120deg
========================= */
function speedToDeg(speed){

    let max = 1000;

    if(speed < 0) speed = 0;
    if(speed > max) speed = max;

    return -120 + (speed / max) * 240;
}

/* ========================= */
function setNeedle(speed){

    const deg = speedToDeg(speed);

    needle.style.transform =
        `translateX(-50%) rotate(${deg}deg)`;
}

function setSpeed(num){
    speedValue.innerText = Number(num).toFixed(2);
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================
   SMOOTH MOVE
========================= */
async function animateTo(target, duration = 700){

    let start = parseFloat(speedValue.innerText) || 0;

    let frames = Math.floor(duration / 16);

    for(let i=0; i<=frames; i++){

        let progress = i / frames;

        /* smooth easing */
        let ease = progress * progress * (3 - 2 * progress);

        let value = start + (target - start) * ease;

        setSpeed(value);
        setNeedle(value);

        await sleep(16);
    }
}

/* =========================
   REALISTIC FLUCTUATION
========================= */
async function fluctuate(base, max, loops = 18){

    let current = base;

    for(let i=0; i<loops; i++){

        current += (Math.random() * 70) - 28;

        if(current < base * 0.6) current = base * 0.6;
        if(current > max) current = max;

        setSpeed(current);
        setNeedle(current);

        await sleep(140);
    }

    return current;
}

/* =========================
   START TEST
========================= */
async function runTest(){

    if(running) return;

    running = true;

    startBtn.disabled = true;
    startBtn.innerText = "TESTING...";

    /* RESET */
    statusText.innerText = "READY";

    pingValue.innerText = "--";
    jitterValue.innerText = "--";

    pingCard.innerText = "--";
    downValue.innerText = "--";
    upValue.innerText = "--";

    downTop.innerText = "--";
    upTop.innerText = "--";

    await animateTo(0, 500);

    /* =====================
       PING
    ===================== */
    let ping = Math.floor(Math.random() * 22) + 8;
    let jitter = Math.floor(Math.random() * 5) + 1;

    pingValue.innerText = ping;
    jitterValue.innerText = jitter;

    pingCard.innerText = ping + " ms";

    /* =====================
       DOWNLOAD
    ===================== */
    statusText.innerText = "DOWNLOAD";

    /* dramatic sweep */
    await animateTo(340, 850);
    await animateTo(110, 450);

    let finalDown =
        Math.floor(Math.random() * 260) + 140;

    await fluctuate(120, finalDown + 40, 18);

    await animateTo(finalDown, 700);

    downValue.innerText = finalDown + " Mbps";
    downTop.innerText   = finalDown;

    await sleep(900);

    /* =====================
       UPLOAD
    ===================== */
    statusText.innerText = "UPLOAD";

    await animateTo(45, 450);

    let finalUp =
        Math.floor(finalDown / 8) +
        Math.floor(Math.random() * 18);

    if(finalUp < 10) finalUp = 10;

    await fluctuate(12, finalUp + 8, 16);

    await animateTo(finalUp, 650);

    upValue.innerText = finalUp + " Mbps";
    upTop.innerText   = finalUp;

    await sleep(700);

    /* =====================
       COMPLETE
       return to download score
    ===================== */
    statusText.innerText = "COMPLETE";

    await animateTo(finalDown, 700);

    startBtn.innerText = "RETEST";
    startBtn.disabled = false;

    running = false;
}

/* ========================= */
startBtn.addEventListener("click", runTest);

/* IDLE POSITION = ZERO LEFT */
setNeedle(0);
setSpeed(0);
