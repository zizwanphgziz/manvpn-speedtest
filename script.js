/* =========================
   MANVPN SPEEDTEST
   Real speed testing via Cloudflare
========================= */

/* --- DOM --- */
const introEl      = document.getElementById('intro');
const introVideo   = document.getElementById('introVideo');
const skipBtn      = document.getElementById('skipBtn');
const appEl        = document.getElementById('app');

const statusText   = document.getElementById('statusText');
const progressFill = document.getElementById('progressFill');

const gaugeArc     = document.getElementById('gaugeArc');
const gaugeNeedle  = document.getElementById('gaugeNeedle');
const speedNum     = document.getElementById('speedNum');

const dlResult     = document.getElementById('dlResult');
const ulResult     = document.getElementById('ulResult');
const pingResult   = document.getElementById('pingResult');
const jitterResult = document.getElementById('jitterResult');

const serverInfo   = document.getElementById('serverInfo');
const ipInfo       = document.getElementById('ipInfo');

const startBtn     = document.getElementById('startBtn');

/* --- CONSTANTS --- */
const CF_DOWN = 'https://speed.cloudflare.com/__down';
const CF_UP   = 'https://speed.cloudflare.com/__up';
const CF_META = 'https://speed.cloudflare.com/meta';

const ARC_LENGTH   = 576;
const MAX_SPEED    = 1000;
const GAUGE_CX     = 150;
const GAUGE_CY     = 150;
const NEEDLE_LEN   = 100;
var SCALE_VALUES   = [0, 5, 10, 50, 100, 250, 500, 750, 1000];

let running = false;
let currentSpeed = 0;
let targetSpeed  = 0;
let animFrameId  = null;

/* =========================
   INTRO
========================= */
function endIntro(){
    introEl.classList.add('fade-out');
    appEl.classList.remove('hidden');
    setTimeout(function(){ introEl.style.display = 'none'; }, 700);
    fetchMeta();
}

introVideo.addEventListener('ended', endIntro);
introVideo.addEventListener('error', endIntro);
skipBtn.addEventListener('click', function(){
    introVideo.pause();
    endIntro();
});

/* Fallback: if video doesn't fire ended */
setTimeout(function(){
    if(introEl.style.display !== 'none') endIntro();
}, 7000);

/* Try unmuted autoplay, fall back to muted */
introVideo.play().catch(function(){
    introVideo.muted = true;
    introVideo.play().catch(endIntro);
});

/* =========================
   GAUGE HELPERS
========================= */
function speedToFraction(speed){
    speed = Math.max(0, Math.min(speed, MAX_SPEED));
    for(var i = 1; i < SCALE_VALUES.length; i++){
        if(speed <= SCALE_VALUES[i]){
            var seg = (speed - SCALE_VALUES[i-1]) / (SCALE_VALUES[i] - SCALE_VALUES[i-1]);
            return ((i-1) + seg) / (SCALE_VALUES.length - 1);
        }
    }
    return 1;
}

function updateGaugeVisual(speed){
    var fraction = speedToFraction(speed);
    gaugeArc.style.strokeDashoffset = ARC_LENGTH * (1 - fraction);

    var angleDeg = 120 + fraction * 300;
    var rad = angleDeg * Math.PI / 180;
    var x2 = GAUGE_CX + NEEDLE_LEN * Math.cos(rad);
    var y2 = GAUGE_CY + NEEDLE_LEN * Math.sin(rad);
    gaugeNeedle.setAttribute('x2', x2.toFixed(1));
    gaugeNeedle.setAttribute('y2', y2.toFixed(1));

    speedNum.textContent = speed < 10 ? speed.toFixed(2) : speed.toFixed(1);
}

function animateGauge(){
    var diff = targetSpeed - currentSpeed;
    currentSpeed += diff * 0.12;
    if(Math.abs(diff) < 0.05) currentSpeed = targetSpeed;
    updateGaugeVisual(currentSpeed);
    animFrameId = requestAnimationFrame(animateGauge);
}

function startGaugeAnimation(){
    if(!animFrameId) animFrameId = requestAnimationFrame(animateGauge);
}

function stopGaugeAnimation(){
    if(animFrameId){ cancelAnimationFrame(animFrameId); animFrameId = null; }
}

function setGaugeTarget(speed){
    targetSpeed = speed;
}

function sleep(ms){
    return new Promise(function(r){ setTimeout(r, ms); });
}

/* =========================
   CONNECTION META
========================= */
function fetchMeta(){
    fetch(CF_META).then(function(r){ return r.json(); }).then(function(d){

        ipInfo.textContent  = d.clientIp || '--';

        var coloStr = '';
        if(d.colo){
            coloStr = typeof d.colo === 'string' ? d.colo
                    : (d.colo.iata || d.colo.name || d.colo.city || '');
        }
        var location = d.city || '';
        if(d.country) location += (location ? ', ' : '') + d.country;
        serverInfo.textContent = 'Cloudflare' +
            (coloStr ? ' - ' + coloStr : '') +
            (location ? ' (' + location + ')' : '');
    }).catch(function(){

        serverInfo.textContent = '--';
        ipInfo.textContent     = '--';
    });
}

/* =========================
   PING TEST
========================= */
function measurePing(){
    var count = 20;
    var times = [];

    return new Promise(function(resolve){
        function done(){
            if(!times.length){ resolve({ ping:0, jitter:0 }); return; }
            times.sort(function(a,b){ return a-b; });
            var trim = times.slice(
                Math.floor(times.length * 0.1),
                Math.ceil(times.length * 0.9)
            );
            if(!trim.length) trim = times;
            var ping = Math.min.apply(null, trim);
            var avg  = trim.reduce(function(s,t){ return s+t; },0) / trim.length;
            var jit  = Math.sqrt(
                trim.reduce(function(s,t){ return s + Math.pow(t-avg,2); },0) / trim.length
            );
            resolve({ ping: Math.round(ping), jitter: Math.round(jit) });
        }

        var idx = 0;
        function next(){
            if(idx >= count){ done(); return; }
            var t0 = performance.now();
            fetch(CF_DOWN + '?bytes=0', { mode:'cors', cache:'no-store' })
                .then(function(){ times.push(performance.now() - t0); })
                .catch(function(){})
                .then(function(){ idx++; next(); });
        }
        next();
    });
}

/* =========================
   DOWNLOAD TEST
========================= */
function measureDownload(duration, onProgress){
    duration = duration || 10000;
    return new Promise(function(resolve){
        var startTime = performance.now();
        var totalBytes = 0;
        var chunkSize = 1000000;
        var speeds = [];

        function next(){
            if(performance.now() - startTime >= duration){
                var elapsed = performance.now() - startTime;
                resolve((totalBytes * 8) / (elapsed / 1000) / 1000000);
                return;
            }
            var t0 = performance.now();
            fetch(CF_DOWN + '?bytes=' + chunkSize, { mode:'cors', cache:'no-store' })
                .then(function(r){ return r.arrayBuffer(); })
                .then(function(buf){
                    totalBytes += buf.byteLength;
                    var elapsed = performance.now() - startTime;
                    var speed = (totalBytes * 8) / (elapsed / 1000) / 1000000;
                    speeds.push(speed);
                    if(onProgress) onProgress(speed, elapsed / duration);

                    var chunkTime = performance.now() - t0;
                    if(chunkTime < 500) chunkSize = Math.min(chunkSize * 2, 25000000);
                    else if(chunkTime > 3000) chunkSize = Math.max(Math.floor(chunkSize/2), 100000);
                    next();
                })
                .catch(function(){
                    setTimeout(next, 200);
                });
        }
        next();
    });
}

/* =========================
   UPLOAD TEST
========================= */
function measureUpload(duration, onProgress){
    duration = duration || 10000;
    return new Promise(function(resolve){
        var startTime = performance.now();
        var totalBytes = 0;
        var chunkSize = 500000;

        function next(){
            if(performance.now() - startTime >= duration){
                var elapsed = performance.now() - startTime;
                resolve((totalBytes * 8) / (elapsed / 1000) / 1000000);
                return;
            }
            var data = new Uint8Array(chunkSize);
            var t0 = performance.now();
            fetch(CF_UP, { method:'POST', mode:'cors', body: data })
                .then(function(){
                    totalBytes += chunkSize;
                    var elapsed = performance.now() - startTime;
                    var speed = (totalBytes * 8) / (elapsed / 1000) / 1000000;
                    if(onProgress) onProgress(speed, elapsed / duration);

                    var chunkTime = performance.now() - t0;
                    if(chunkTime < 500) chunkSize = Math.min(chunkSize * 2, 10000000);
                    else if(chunkTime > 3000) chunkSize = Math.max(Math.floor(chunkSize/2), 50000);
                    next();
                })
                .catch(function(){
                    setTimeout(next, 200);
                });
        }
        next();
    });
}

/* =========================
   RUN FULL TEST
========================= */
function runTest(){
    if(running) return;
    running = true;
    startBtn.disabled = true;
    startBtn.textContent = 'TESTING...';

    /* Reset */
    dlResult.textContent     = '--';
    ulResult.textContent     = '--';
    pingResult.textContent   = '--';
    jitterResult.textContent = '--';
    progressFill.style.width = '0%';

    setGaugeTarget(0);
    startGaugeAnimation();

    /* Phase 1: Ping */
    statusText.textContent = 'PING';
    progressFill.style.width = '5%';

    measurePing().then(function(pingData){
        pingResult.textContent   = pingData.ping;
        jitterResult.textContent = pingData.jitter;
        progressFill.style.width = '15%';

        /* Phase 2: Download */
        statusText.textContent = 'DOWNLOAD';
        return measureDownload(10000, function(speed, progress){
            setGaugeTarget(speed);
            dlResult.textContent = speed.toFixed(1);
            progressFill.style.width = (15 + progress * 40) + '%';
        });

    }).then(function(finalDown){
        dlResult.textContent = finalDown.toFixed(2);
        progressFill.style.width = '55%';

        /* Phase 3: Upload */
        statusText.textContent = 'UPLOAD';
        setGaugeTarget(0);
        return measureUpload(10000, function(speed, progress){
            setGaugeTarget(speed);
            ulResult.textContent = speed.toFixed(1);
            progressFill.style.width = (55 + progress * 40) + '%';
        });

    }).then(function(finalUp){
        ulResult.textContent = finalUp.toFixed(2);
        progressFill.style.width = '100%';

        /* Done */
        statusText.textContent = 'COMPLETE';
        var finalDl = parseFloat(dlResult.textContent) || 0;
        setGaugeTarget(finalDl);

        startBtn.textContent = 'RETEST';
        startBtn.disabled = false;
        running = false;

        setTimeout(function(){ stopGaugeAnimation(); }, 1000);
    });
}

/* =========================
   INIT
========================= */
startBtn.addEventListener('click', runTest);
updateGaugeVisual(0);
