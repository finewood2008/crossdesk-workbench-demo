const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, desktopCapturer } = require("electron");

const outDir = path.join(__dirname, "..", "artifacts");
const videoPath = path.join(outDir, "crossdesk-demo.webm");

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  await fs.promises.mkdir(outDir, { recursive: true });
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, "..", "index.html"));
  await delay(600);

  const sources = await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: { width: 1440, height: 900 }
  });
  const source = sources.find((item) => item.name.includes("CrossDesk")) || sources[0];
  if (!source) {
    throw new Error("No capturable window source found");
  }

  await win.webContents.executeJavaScript(`
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: ${JSON.stringify(source.id)},
            minWidth: 1440,
            maxWidth: 1440,
            minHeight: 900,
            maxHeight: 900,
            maxFrameRate: 30
          }
        }
      });
      window.__demoChunks = [];
      window.__demoRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
      window.__demoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) window.__demoChunks.push(event.data);
      };
      window.__demoRecorder.start(250);
    })();
  `);

  async function clickText(text) {
    await win.webContents.executeJavaScript(`
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent.trim() === ${JSON.stringify(text)})
        ?.click();
    `);
    await delay(700);
  }

  await clickText("会话中心");
  await delay(900);
  await win.webContents.executeJavaScript(`
    document.querySelector("[data-thread-id='demo-ebay-002']")?.click();
  `);
  await delay(900);
  await win.webContents.executeJavaScript(`
    document.querySelector("[data-ai-apply='draft']")?.click();
  `);
  await delay(900);
  await win.webContents.executeJavaScript(`
    document.getElementById("replyText").value = "您好 Marco，我们可以协助您处理退货。请确认商品未使用、配件齐全并保留原包装。";
    document.getElementById("replyText").dispatchEvent(new Event("input", { bubbles: true }));
  `);
  await delay(900);
  await clickText("发送并记录");
  await delay(900);
  await win.webContents.executeJavaScript(`
    document.querySelector("[data-inbox-action='toggle-list']")?.click();
  `);
  await delay(900);
  await win.webContents.executeJavaScript(`
    document.querySelector("[data-inbox-action='toggle-ai']")?.click();
  `);
  await delay(900);

  const base64 = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      window.__demoRecorder.onstop = async () => {
        const blob = new Blob(window.__demoChunks, { type: "video/webm" });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        resolve(btoa(binary));
      };
      window.__demoRecorder.stop();
    });
  `);

  await fs.promises.writeFile(videoPath, Buffer.from(base64, "base64"));
  console.log(`Demo video saved: ${videoPath}`);
  await delay(300);
  win.close();
}

app.whenReady()
  .then(runDemo)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
