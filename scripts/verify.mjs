import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge" });
await mkdir("output", { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:8080");
await page.waitForSelector('[data-renderer="webgl"].ready');
// Sample the real shader at successive times outside takeover. Motion must be
// ongoing, preserve overall brightness, and disappear under reduced motion.
const animation = await page.evaluate(async () => {
  const { PortraitGL } = await import("/portrait-gl.mjs");
  const { config } = await import("/config.mjs");
  const image = new Image();
  image.src = config.portrait;
  await image.decode();
  const canvas = document.createElement("canvas");
  const renderer = new PortraitGL(canvas, image, config);
  renderer.resize(600, 600);
  const gl = renderer.gl;
  const sample = (time, reduced = false) => {
    renderer.render(time, "human", reduced, { x: -2, y: -2 });
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    return pixels;
  };
  const differences = [];
  const brightness = [];
  let previous = sample(0);
  for (const time of [0.25, 0.5, 0.75, 1]) {
    const next = sample(time);
    let changed = 0,
      lit = 0,
      total = 0;
    for (let i = 0; i < next.length; i += 4) {
      if (next[i] > 30 || previous[i] > 30) {
        lit++;
        if (Math.abs(next[i] - previous[i]) > 12) changed++;
      }
      total += next[i] + next[i + 1] + next[i + 2];
    }
    differences.push(changed / Math.max(1, lit));
    brightness.push(total);
    previous = next;
  }
  const stillA = sample(0, true),
    stillB = sample(3, true);
  const still = stillA.every((value, i) => value === stillB[i]);
  renderer.dispose();
  return { differences, brightness, still };
});
assert.ok(
  animation.differences.every((value) => value > 0.1),
  "Characters keep changing between takeover events",
);
assert.ok(
  Math.max(...animation.brightness) / Math.min(...animation.brightness) < 1.2,
  "Overall brightness remains stable",
);
assert.ok(animation.still, "Reduced-motion shader freezes character changes");
console.log(
  "Continuous shader change:",
  animation.differences.map((v) => `${Math.round(v * 100)}%`).join(", "),
);
const before = await page.locator("canvas").screenshot();
await page.mouse.move(1100, 400);
await page.waitForTimeout(350);
assert.deepEqual(
  await page.locator("canvas").screenshot(),
  before,
  "Reduced motion stays still",
);
assert.equal(await page.locator(".tagline,.phrase").count(), 0);
await page.screenshot({ path: "output/desktop.png" });
await page.reload();
await page.waitForSelector('[data-renderer="webgl"].ready');
await page.emulateMedia({ reducedMotion: "no-preference" });
// Keep the source visible while checking the randomly timed red-eye cycles.
// Otherwise the intentional one-way sweep can finish before the next takeover.
await page.waitForFunction(()=>!document.querySelector('[data-scene="reveal"]').disabled);
await page.locator('[data-scene="reveal"]').evaluate(e=>e.click());
await page.waitForTimeout(1200);
const bounds = await page.locator(".email").boundingBox();
async function triggerFlicker(){
  await page.evaluate(async()=>{
    const {config}=await import('/config.mjs');
    // Give readbacks a deterministic window, independent of random idle intervals.
    config.timing.interference=1000;config.timing.takeover=2000;
    document.querySelector('[data-action="preview"]').click();
  });
}
await triggerFlicker();
await page.waitForSelector('[data-phase="interference"]', { timeout: 16000 });
await page.screenshot({ path: "output/interference.png" });
await page.waitForSelector('[data-phase="takeover"]', { timeout: 3000 });
assert.deepEqual(await page.locator(".ai-letter").allTextContents(), [
  "A",
  "I",
]);
assert.ok(
  await page.locator(".ai-letter").evaluateAll((es) =>
    es.every((e) => {
      const root=e.closest('.composition');
      const channels = root.style.getPropertyValue('--ai-ink').match(/[\d.]+/g).map(Number);
      return (
        channels[0] > 150 &&
        channels[0] > channels[1] * 5 &&
        Number(root.style.getPropertyValue('--ai-glow')) > 0 &&
        e.closest('.identity').classList.contains('text-ready')
      );
    }),
  ),
  "GPU text layer receives the red takeover envelope",
);
assert.ok(
  await page.locator("canvas").evaluate(
    (c) =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const gl = c.getContext("webgl");
          const program = gl.getParameter(gl.CURRENT_PROGRAM);
          const shaderLight = gl.getUniform(
            program,
            gl.getUniformLocation(program, "takeover"),
          );
          const textLight = Number(
            document
              .querySelector(".composition")
              .style.getPropertyValue("--ai-light"),
          );
          resolve(Math.abs(shaderLight - textLight) < 0.001);
        }),
      ),
  ),
  "Name and eye use the same flicker envelope",
);
async function redPixels() {
  return page.locator("canvas").evaluate(
    (c) =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const gl = c.getContext("webgl");
          const pixels = new Uint8Array(c.width * c.height * 4);
          gl.readPixels(
            0,
            0,
            c.width,
            c.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          let red = 0,
            lit = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (
              // Selected dark crimson can peak below 55 over dark eye cells.
              pixels[i] > 12 &&
              pixels[i] > pixels[i + 1] * 2 &&
              pixels[i] > pixels[i + 2] * 2
            )
              red++;
            if (pixels[i] > 30) lit++;
          }
          resolve({ red, lit, error: gl.getError() });
        }),
      ),
  );
}
// Start a fresh takeover before pixel readback.
await page.mouse.move(0,0);
await triggerFlicker();
await page.waitForSelector('[data-phase="takeover"]', { timeout: 10000 });
let pixels = await redPixels();
assert.ok(pixels.red > 0);
assert.ok(pixels.lit > 1000);
assert.equal(pixels.error, 0);
await page.screenshot({ path: "output/takeover.png" });
assert.deepEqual(await page.locator(".email").boundingBox(), bounds);
assert.equal(
  await page.locator(".email").getAttribute("href"),
  "mailto:danny@dannywilson.ca",
);
await page.waitForSelector('[data-phase="human"]', { timeout: 4000 });
assert.equal((await redPixels()).red, 0, "Eye recovers with the name");
await page.keyboard.press("Tab");
assert.ok(
  await page.locator(".email").evaluate((e) => e === document.activeElement),
);
for (const width of [320, 390, 700, 768, 1024]) {
  await page.setViewportSize({ width, height: 844 });
  await page.waitForTimeout(100);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const name = await page.locator("h1").boundingBox(),
    email = await page.locator(".email").boundingBox(),
    portrait = await page.locator(".portrait").boundingBox();
  assert.ok(email.y >= name.y + name.height);
  if (width <= 700) assert.ok(portrait.y >= email.y + email.height);
  if (width === 390) {
    await page.locator(".email").blur();
    await page.screenshot({ path: "output/mobile.png", fullPage: true });
  }
}
// Context loss must reveal a real fallback and successfully rebuild on restoration.
await page.locator("canvas").evaluate((c) => {
  window.loss = c.getContext("webgl").getExtension("WEBGL_lose_context");
  window.loss.loseContext();
});
await page.waitForSelector('[data-renderer="fallback"]');
assert.ok(await page.locator(".fallback").isVisible());
await page.waitForTimeout(100);
await page.evaluate(() => window.loss.restoreContext());
await page.waitForSelector('[data-renderer="webgl"].ready');
await page.emulateMedia({ reducedMotion: "reduce" });
assert.equal(
  await page.locator(".composition").getAttribute("data-phase"),
  "human",
);
const noGL = await browser.newPage();
await noGL.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    return type === "webgl" ? null : get.call(this, type, ...args);
  };
});
await noGL.goto("http://localhost:8080");
await noGL.waitForSelector('[data-renderer="fallback"]');
assert.ok(await noGL.locator(".fallback").isVisible());
const fallback = await browser.newPage({ javaScriptEnabled: false });
await fallback.goto("http://localhost:8080");
assert.ok(
  await fallback
    .locator(".fallback")
    .evaluate((e) => e.complete && e.naturalWidth > 0),
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "WebGL QA passed: shader render, synchronized eye/name, desktop/mobile, reduced motion, context loss/restoration, unavailable WebGL and no-JS fallback.",
);
