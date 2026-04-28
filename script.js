const startBtn = document.getElementById("startBtn");
const speedValue = document.getElementById("speedValue");
const needle = document.getElementById("needle");

const pingValue = document.getElementById("pingValue");
const downValue = document.getElementById("downValue");
const upValue = document.getElementById("upValue");
const statusText = document.getElementById("statusText");

let running = false;

/* ===== SCALE =====
0 Mbps = -120deg
1000 Mbps = +120deg
*/
function speedToDeg(speed) {
    let max = 1000;
    if (speed > max) speed = max;
    return -120 + (speed / max) * 240;
}

function setNeedle(speed) {
    const deg = speedToDeg(speed);
    needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
}

function setSpeed(num) {
    speedValue.innerText = num.toFixed(2);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/* smooth animated move */
async function animateTo(target, duration = 600) {
    let start = parseFloat(speedValue.innerText) || 0;
    let frames = duration / 16;
    for (let i = 0; i <= frames; i++) {
        let progress = i / frames;
        let val = start + (target - start) * progress;
        setSpeed(val);
        setNeedle(val);
        await sleep(16);
    }
}

/* random realistic fluctuation */
async function fluctuate(min, max, loops = 25) {
    let current = min;
    for (let i = 0; i < loops; i++) {
        current += (Math.random() * 80 - 30);
        if (current < min) current = min;
        if (current > max) current = max;
        setSpeed(current);
        setNeedle(current);
        await sleep(140);
    }
    return current;
}

async function runTest() {
    if (running) return;
    running = true;

    startBtn.innerText = "TESTING...";
    startBtn.disabled = true;

    pingValue.innerText = "--";
    downValue.innerText = "--";
    upValue.innerText = "--";

    /* reset */
    statusText.innerText = "READY";
    await animateTo(0, 400);

    /* ===== DOWNLOAD ===== */
    statusText.innerText = "DOWNLOAD";

    // dramatic sweep
    await animateTo(320, 700);
    await animateTo(120, 400);

    let finalDown = Math.floor(Math.random() * 250) + 120;
    await fluctuate(100, finalDown + 40, 18);
    await animateTo(finalDown, 500);

    let ping = Math.floor(Math.random() * 35) + 18;

    pingValue.innerText = ping + " ms";
    downValue.innerText = finalDown + " Mbps";

    await sleep(900);

    /* ===== UPLOAD ===== */
    statusText.innerText = "UPLOAD";

    await animateTo(30, 400);

    let finalUp = Math.floor(finalDown / 8) + Math.floor(Math.random() * 12);
    if (finalUp < 10) finalUp = 10;

    await fluctuate(10, finalUp + 10, 16);
    await animateTo(finalUp, 500);

    upValue.innerText = finalUp + " Mbps";

    await sleep(700);

    /* ===== COMPLETE ===== */
    statusText.innerText = "COMPLETE";

    // return needle to download result
    await animateTo(finalDown, 600);

    startBtn.innerText = "RETEST";
    startBtn.disabled = false;
    running = false;
}

startBtn.addEventListener("click", runTest);

/* idle state */
setNeedle(0);
setSpeed(0);
