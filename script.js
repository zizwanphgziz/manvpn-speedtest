const speedDisplay = document.getElementById("speed");
const pingText = document.getElementById("ping");
const downloadText = document.getElementById("download");
const uploadText = document.getElementById("upload");

async function testPing() {
  const start = performance.now();
  await fetch("https://www.cloudflare.com/cdn-cgi/trace?x=" + Date.now(), {
    cache: "no-store"
  });
  const end = performance.now();
  return Math.round(end - start);
}

async function testDownload() {
  const url =
    "https://speed.cloudflare.com/__down?bytes=25000000&t=" + Date.now();

  const start = performance.now();
  const res = await fetch(url);
  const reader = res.body.getReader();

  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.length;

    const duration = (performance.now() - start) / 1000;
    const mbps = ((received * 8) / duration / 1000000).toFixed(0);

    speedDisplay.innerText = mbps;
  }

  const totalTime = (performance.now() - start) / 1000;
  return ((received * 8) / totalTime / 1000000).toFixed(0);
}

async function testUpload() {
  const size = 10 * 1024 * 1024;
  const data = new Uint8Array(size);

  const start = performance.now();

  await fetch("https://speed.cloudflare.com/__up", {
    method: "POST",
    body: data
  });

  const totalTime = (performance.now() - start) / 1000;

  return ((size * 8) / totalTime / 1000000).toFixed(0);
}

async function startTest() {
  speedDisplay.innerText = "0";

  pingText.innerText = "Testing...";
  downloadText.innerText = "...";
  uploadText.innerText = "...";

  const ping = await testPing();
  pingText.innerText = ping + " ms";

  const down = await testDownload();
  downloadText.innerText = down + " Mbps";

  const up = await testUpload();
  uploadText.innerText = up + " Mbps";

  speedDisplay.innerText = up;
}

document.getElementById("startBtn").onclick = startTest;
