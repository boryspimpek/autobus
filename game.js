"use strict";

// Wszystkie prędkości są w pikselach planszy na sekundę, czasy w sekundach.
const CONFIG = Object.freeze({
  width: 1200, height: 660,
  roadTop: 170, roadHeight: 330, lanes: [225, 335, 445],
  ballSpeed: 530, firstCarDelay: 1.1,
  // Wybrany poziom ma stałe tempo; gra nigdy sama go nie zwiększa.
  levels: Object.freeze({
    calm: Object.freeze({ name: "Spokojna jazda", carSpeed: 88, scenerySpeed: 30, spawnInterval: 3.6, maxCars: 2, cones: false }),
    busy: Object.freeze({ name: "Wesoły ruch", carSpeed: 110, scenerySpeed: 37.5, spawnInterval: 2.5, maxCars: 3, cones: false }),
    challenge: Object.freeze({ name: "Małe wyzwanie", carSpeed: 132, scenerySpeed: 45, spawnInterval: 1.8, maxCars: 4, cones: true })
  }),
  coneWidth: 58, coneHeight: 66, coneFirstDelay: 2.2,
  coneInterval: 9, coneCarGap: 240,
  shotInterval: 0.46, laneChangeTime: 0.28,
  // Bazowe rozmiary pojazdów i kolizji. Skalę samych grafik ustaw poniżej.
  busX: 205, busWidth: 176, busHeight: 76,
  carWidth: 118, carHeight: 66, ballRadius: 14,
  hitPadding: 12, spinTime: 0.65, bounceTime: 0.5,
  celebrationTime: 3.2,
  musicVolume: 0.35 // Głośność podkładu: od 0 (cisza) do 1 (maksimum).
});

// Osobna skala grafiki każdego pojazdu (bez zmiany kolizji).
// 1 = obecny rozmiar, 1.2 = o 20% większy, 0.8 = o 20% mniejszy.
// Zmieniaj tylko liczby; po zapisaniu pliku odśwież grę.
const VEHICLE_SCALES = Object.freeze({
  "01_ciezarowka": 2.0,
  "02_traktor": 2.0,
  "03_koparka": 2.0,
  "04_smieciarka": 2.5,
  "05_betoniarka": 2.0,
  "06_straz_pozarna": 2.0,
  "07_autobus": 1.5,
  "08_auto_czerwone": 1,
  "09_auto_niebieskie": 1,
  "10_auto_zielone": 1,
  "11_auto_fioletowe": 1,
  "12_auto_pomaranczowe": 1
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = {};
["overlay", "overlay-title", "overlay-description", "play", "play-label", "score", "pause", "sound", "auto", "fullscreen", "celebration", "status", "start-hint", "difficulty"].forEach(id => { ui[id] = document.getElementById(id); });
const colors = ["#df7d68", "#7c9dd5", "#a58bcc", "#5caa9a", "#ebaf59"];
// Grafiki patrzą w prawo; kierunek i animacje nadajemy podczas rysowania.
function loadVehicleImage(filename) {
  const image = new Image();
  image.vehicleScale = VEHICLE_SCALES[filename] ?? 1;
  image.src = "pojazdy_600px/" + filename + ".png";
  return image;
}
const busImage = loadVehicleImage("07_autobus");
const carImages = [
  "01_ciezarowka", "02_traktor", "03_koparka", "04_smieciarka",
  "05_betoniarka", "06_straz_pozarna", "08_auto_czerwone",
  "09_auto_niebieskie", "10_auto_zielone", "11_auto_fioletowe", "12_auto_pomaranczowe"
].map(loadVehicleImage);
const keys = new Set();
// Każdy palec ma własny wpis: puszczenie strzałki nie przerywa strzelania.
const pointers = new Map();
const touchControls = document.getElementById("touch-controls");
const touchButtons = ["touch-up", "touch-down", "touch-fire"].map(id => document.getElementById(id));
const state = {
  mode: "start", sound: true, auto: false, stars: 0, difficulty: "calm",
  time: 0, scroll: 0, spawnTimer: CONFIG.firstCarDelay, shotTimer: 0,
  lane: 1, busY: CONFIG.lanes[1], fromY: CONFIG.lanes[1], laneElapsed: CONFIG.laneChangeTime,
  bounce: 0, celebration: 0, cars: [], balls: [], particles: [], carNumber: 0, ballNumber: 0,
  cone: null, conePlan: null, coneTimer: CONFIG.coneFirstDelay, coneNumber: 0
};
let audioContext = null;
let audioOutput = null;
let lastFrame = null;

const MUSIC_TRACKS = ["music/Curious Bounce.mp3", "music/Sunny Journey.mp3"];
let musicTrackIndex = 0;
const backgroundMusic = new Audio();
backgroundMusic.preload = "metadata";
backgroundMusic.volume = CONFIG.musicVolume;
backgroundMusic.src = MUSIC_TRACKS[musicTrackIndex];

function reportMusicError(error) {
  if (error && error.name === "AbortError") return; // Pauza podczas ładowania.
  const message = document.getElementById("music-status");
  if (error && error.name === "NotAllowedError") {
    message.textContent = "Przeglądarka zablokowała muzykę. Wyłącz i ponownie włącz przycisk Dźwięk podczas gry.";
  } else {
    message.textContent = "Nie można odtworzyć muzyki: " + MUSIC_TRACKS[musicTrackIndex] + ". Sprawdź, czy folder music został skopiowany razem z grą.";
  }
  message.hidden = false;
  console.warn("Nie udało się odtworzyć muzyki", backgroundMusic.currentSrc, error);
}

function syncMusic() {
  if (state.mode !== "playing" || !state.sound) {
    backgroundMusic.pause();
    return;
  }
  if (backgroundMusic.paused) {
    // Odtwarzanie uruchamia gest gracza; odmowa przeglądarki nie blokuje gry.
    const playback = backgroundMusic.play();
    if (playback) playback.catch(reportMusicError);
  }
}

backgroundMusic.addEventListener("playing", () => { document.getElementById("music-status").hidden = true; });
backgroundMusic.addEventListener("error", () => { reportMusicError(backgroundMusic.error); });
backgroundMusic.addEventListener("ended", () => {
  musicTrackIndex = (musicTrackIndex + 1) % MUSIC_TRACKS.length;
  backgroundMusic.src = MUSIC_TRACKS[musicTrackIndex];
  syncMusic();
});

function unlockAudio() {
  if (!state.sound) return;
  syncMusic();
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audioContext) {
      audioContext = new Audio();
      // Wspólne wzmocnienie; kompresor łagodzi nakładające się efekty.
      audioOutput = audioContext.createGain();
      audioOutput.gain.value = 1.4;
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 12;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;
      audioOutput.connect(compressor);
      compressor.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended" || audioContext.state === "interrupted") audioContext.resume().catch(() => {});
  } catch (_) { /* Dźwięk jest opcjonalny. */ }
}

function tone(frequency, duration, volume, delay = 0, type = "sine", endFrequency = frequency) {
  if (!state.sound || !audioContext || audioContext.state !== "running") return;
  try {
    const now = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    // Dłużej utrzymujemy słyszalny poziom, także na głośnikach tabletu.
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(audioOutput);
    oscillator.start(now); oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch (_) { /* Brak audio nie zatrzymuje gry. */ }
}

function startOrResume() {
  if (state.mode === "playing") return;
  unlockAudio();
  clearInputs(); lastFrame = null;
  state.mode = "playing";
  syncMusic();
  syncTouchButtons();
  ui.overlay.hidden = true; ui.pause.disabled = false;
  ui.pause.querySelector("span").textContent = "Pauza";
  canvas.focus({ preventScroll: true });
}

function pauseGame() {
  clearInputs(); lastFrame = null;
  if (state.mode !== "playing") return;
  state.mode = "paused";
  syncMusic();
  syncTouchButtons();
  ui["overlay-title"].textContent = "Mały przystanek";
  ui["overlay-description"].textContent = "Autobus czeka na Ciebie.";
  ui["play-label"].textContent = "Jedziemy dalej";
  ui["start-hint"].textContent = "Wznów: P, Enter lub spacja";
  ui.pause.querySelector("span").textContent = "Wznów";
  ui.overlay.hidden = false;
}

function changeLane(direction) {
  const lane = Math.max(0, Math.min(2, state.lane + direction));
  if (lane === state.lane) return;
  state.fromY = state.busY; state.lane = lane; state.laneElapsed = 0;
}

function syncTouchButtons() {
  ui.pause.setAttribute("aria-label", state.mode === "paused" ? "Wznów grę" : "Pauza");
  for (const button of touchButtons) {
    button.disabled = state.mode !== "playing";
    button.classList.toggle("is-held", [...pointers.values()].includes(button));
  }
}

function clearInputs() {
  keys.clear();
  const held = [...pointers.entries()];
  pointers.clear();
  for (const [pointerId, button] of held) {
    if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
  }
  syncTouchButtons();
}

function touchAction(button) {
  if (state.mode !== "playing") return;
  unlockAudio();
  if (button.id === "touch-up") changeLane(-1);
  else if (button.id === "touch-down") changeLane(1);
  else if (state.shotTimer <= 0) {
    // Nawet bardzo krótkie dotknięcie pomiędzy klatkami daje strzał.
    shoot(); state.shotTimer = CONFIG.shotInterval;
  }
}

function releasePointer(event) {
  if (!pointers.has(event.pointerId)) return;
  const button = pointers.get(event.pointerId);
  pointers.delete(event.pointerId);
  if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  syncTouchButtons();
}

for (const button of touchButtons) {
  button.addEventListener("pointerdown", event => {
    if (state.mode !== "playing" || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    if (pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, button);
    try { button.setPointerCapture(event.pointerId); } catch (_) { /* Syntetyczne zdarzenia mogą nie mieć aktywnego wskaźnika. */ }
    touchAction(button); syncTouchButtons();
  });
  button.addEventListener("lostpointercapture", releasePointer);
  button.addEventListener("contextmenu", event => event.preventDefault());
  // Obsługa aktywacji przycisku klawiaturą i narzędziami dostępności.
  button.addEventListener("click", event => { if (event.detail === 0) touchAction(button); });
}
document.addEventListener("pointerup", releasePointer);
document.addEventListener("pointercancel", releasePointer);

const touchMedia = window.matchMedia("(any-pointer: coarse)");
function detectTouchControls() {
  const enabled = touchMedia.matches || navigator.maxTouchPoints > 0;
  document.documentElement.classList.toggle("touch-device", enabled);
  touchControls.hidden = !enabled;
  // W poziomie pasek rodzica może być niżej: pauza zostaje przy liczniku.
  const pauseContainer = enabled ? document.getElementById("header-actions") : document.querySelector(".view-controls");
  if (ui.pause.parentElement !== pauseContainer) pauseContainer.appendChild(ui.pause);
  if (!enabled) clearInputs();
  syncTouchButtons();
}
if (touchMedia.addEventListener) touchMedia.addEventListener("change", detectTouchControls);
else if (touchMedia.addListener) touchMedia.addListener(detectTouchControls);
detectTouchControls();

function levelSettings() { return CONFIG.levels[state.difficulty]; }

function setDifficulty(value) {
  if (!Object.prototype.hasOwnProperty.call(CONFIG.levels, value)) return;
  if (value === state.difficulty) return;
  state.difficulty = value;
  // Nowe tempo zaczyna się od pustej drogi, z czasem na przygotowanie.
  state.cars = []; state.balls = []; state.particles = [];
  state.cone = null; state.conePlan = null; state.coneNumber = 0;
  state.coneTimer = CONFIG.coneFirstDelay;
  state.spawnTimer = CONFIG.firstCarDelay; state.carNumber = 0;
  state.bounce = 0; clearInputs();
  ui.difficulty.value = value;
  ui.status.textContent = "Poziom: " + levelSettings().name + ". Gwiazdki zostają z Tobą.";
}

ui.difficulty.addEventListener("change", () => {
  setDifficulty(ui.difficulty.value);
  canvas.focus({ preventScroll: true });
});

document.addEventListener("keydown", event => {
  const code = event.code;
  // Wybór poziomu obsługuje własne strzałki i spację, także podczas pauzy.
  if (event.target.closest && event.target.closest("select")) return;
  if (!["ArrowUp", "ArrowDown", "Space", "Enter", "KeyP"].includes(code)) return;
  // Spacja i Enter na przyciskach rodzica zachowują ich zwykłe działanie.
  if (event.target.closest && event.target.closest("button") && event.target !== ui.play && (code === "Space" || code === "Enter")) return;
  event.preventDefault();
  if (event.repeat || keys.has(code)) return;
  if (state.mode !== "playing") {
    if (code === "Space" || code === "Enter" || (code === "KeyP" && state.mode === "paused")) startOrResume();
    return;
  }
  keys.add(code);
  if (code === "KeyP") pauseGame();
  else if (code === "ArrowUp") changeLane(-1);
  else if (code === "ArrowDown") changeLane(1);
  else if (code === "Space") unlockAudio();
});
document.addEventListener("keyup", event => { keys.delete(event.code); });
window.addEventListener("blur", pauseGame);
window.addEventListener("orientationchange", pauseGame);
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
ui.play.addEventListener("click", startOrResume);
ui.pause.addEventListener("click", () => { state.mode === "playing" ? pauseGame() : startOrResume(); });
ui.sound.addEventListener("click", () => {
  state.sound = !state.sound; ui.sound.setAttribute("aria-pressed", String(state.sound));
  syncMusic();
  unlockAudio(); canvas.focus({ preventScroll: true });
});
ui.auto.addEventListener("click", () => {
  state.auto = !state.auto; ui.auto.setAttribute("aria-pressed", String(state.auto));
  unlockAudio(); canvas.focus({ preventScroll: true });
});
ui.fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.getElementById("game-shell").requestFullscreen) await document.getElementById("game-shell").requestFullscreen();
    else ui.status.textContent = "Pełny ekran nie jest dostępny w tej przeglądarce.";
  } catch (_) { ui.status.textContent = "Pełny ekran jest niedostępny. Możesz grać w oknie."; }
});
document.addEventListener("fullscreenchange", () => {
  ui.fullscreen.querySelector("span").textContent = document.fullscreenElement ? "Wyjdź z pełnego ekranu" : "Pełny ekran";
  resizeCanvas();
});

function shoot() {
  state.balls.push({ x: CONFIG.busX + CONFIG.busWidth / 2 + 8, y: state.busY, color: colors[state.ballNumber++ % colors.length] });
  tone(510, 0.14, 0.5, 0, "sine", 770);
}

function spawnCar() {
  // Pierwsze autko jedzie środkowym pasem, kolejne spokojnie odwiedzają wszystkie pasy.
  const order = [1, 0, 2, 1, 2, 0];
  const preferredLane = order[state.carNumber % order.length];
  const reserved = state.cone || state.conePlan;
  const x = CONFIG.width + 80;
  const lane = [preferredLane, (preferredLane + 1) % 3, (preferredLane + 2) % 3].find(candidate => {
    if (reserved && candidate === reserved.escapeLane) return false;
    if (state.cone && candidate === state.cone.lane && Math.abs(x - state.cone.x) < CONFIG.coneCarGap) return false;
    return !state.cars.some(car => car.mode === "drive" && car.y === CONFIG.lanes[candidate] && Math.abs(x - car.x) < CONFIG.coneCarGap);
  });
  if (lane === undefined) return false;
  state.cars.push({ x, y: CONFIG.lanes[lane], color: colors[state.carNumber % colors.length], image: carImages[Math.floor(Math.random() * carImages.length)], mode: "drive", age: 0 });
  state.carNumber++;
  return true;
}

function honkAndBounce() {
  state.bounce = CONFIG.bounceTime;
  tone(230, 0.22, 1.5, 0, "triangle", 285); tone(290, 0.26, 1.5, 0.15, "triangle", 235);
}

function updateCone(dt) {
  if (!levelSettings().cones) return;
  if (!state.cone) {
    state.coneTimer -= dt;
    if (state.coneTimer > 0) return;
    if (!state.conePlan) {
      const lanes = [1, 0, 2];
      const lane = lanes[state.coneNumber % lanes.length];
      state.conePlan = { lane, escapeLane: lane === 1 ? 0 : 1 };
    }
    const plan = state.conePlan;
    // Rezerwujemy sąsiedni pas i czekamy, aż wcześniejsze autka go opuszczą.
    // Dopóki pachołek jest na drodze, żadne nowe auto nie wjedzie na ten pas.
    if (state.cars.some(car => car.y === CONFIG.lanes[plan.escapeLane])) return;
    if (state.cars.some(car => car.y === CONFIG.lanes[plan.lane] && Math.abs(CONFIG.width + 80 - car.x) < CONFIG.coneCarGap)) return;
    state.cone = { ...plan, x: CONFIG.width + 80, y: CONFIG.lanes[plan.lane], mode: "stand", age: 0 };
    state.conePlan = null; state.coneNumber++;
  }
  const cone = state.cone;
  // Pachołek stoi na drodze: porusza się na ekranie dokładnie jak jej oznaczenia.
  cone.x -= levelSettings().scenerySpeed * dt;
  if (cone.mode === "bump") cone.age += dt;
  else if (Math.abs(cone.x - CONFIG.busX) < (CONFIG.busWidth + CONFIG.coneWidth) / 2 - 10 && Math.abs(cone.y - state.busY) < (CONFIG.busHeight + CONFIG.coneHeight) / 2 - 12) {
    cone.mode = "bump"; cone.age = 0; honkAndBounce();
  }
  if (cone.x < -80 || (cone.mode === "bump" && cone.age >= CONFIG.bounceTime)) {
    state.cone = null; state.coneTimer = CONFIG.coneInterval;
  }
}

function confetti(x, y, amount = 14) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 95;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, age: 0, life: 0.7 + Math.random() * 0.4, color: colors[i % colors.length], rotation: Math.random() * 6 });
  }
}

function hitCar(car) {
  car.mode = "spin"; car.age = 0;
  confetti(car.x, car.y);
  state.stars++;
  ui.score.textContent = state.stars;
  tone(660, 0.2, 1.5); tone(880, 0.25, 1.5, 0.1);
  if (state.stars % 5 === 0) {
    state.celebration = CONFIG.celebrationTime; ui.celebration.hidden = false;
    ui.status.textContent = "Pięknie! Masz już " + state.stars + " gwiazdek!";
    [523, 659, 784, 1047].forEach((note, i) => tone(note, 0.3, 1.5, i * 0.18));
    confetti(550, 120, 20); confetti(760, 120, 20);
  }
}

function update(dt) {
  const level = levelSettings();
  state.time += dt; state.scroll += level.scenerySpeed * dt;
  state.laneElapsed = Math.min(CONFIG.laneChangeTime, state.laneElapsed + dt);
  const t = state.laneElapsed / CONFIG.laneChangeTime;
  const smooth = t * t * (3 - 2 * t);
  state.busY = state.fromY + (CONFIG.lanes[state.lane] - state.fromY) * smooth;
  state.bounce = Math.max(0, state.bounce - dt);
  state.shotTimer = Math.max(0, state.shotTimer - dt);
  if ((keys.has("Space") || state.auto || [...pointers.values()].includes(touchButtons[2])) && state.shotTimer <= 0) {
    shoot(); state.shotTimer = CONFIG.shotInterval;
  }
  updateCone(dt);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.cars.length < level.maxCars) {
    if (spawnCar()) state.spawnTimer = level.spawnInterval;
  }
  for (const ball of state.balls) {
    const oldX = ball.x;
    ball.x += CONFIG.ballSpeed * dt;
    for (const car of state.cars) {
      if (car.mode !== "drive") continue;
      // Przecięcie odcinka ruchu kulki zapobiega przelatywaniu przez cel.
      if (ball.x + CONFIG.ballRadius >= car.x - CONFIG.carWidth / 2 - CONFIG.hitPadding && oldX - CONFIG.ballRadius <= car.x + CONFIG.carWidth / 2 + CONFIG.hitPadding && Math.abs(ball.y - car.y) < CONFIG.carHeight / 2 + CONFIG.ballRadius + CONFIG.hitPadding) {
        hitCar(car); ball.dead = true; break;
      }
    }
  }
  for (const car of state.cars) {
    if (car.mode !== "drive") { car.age += dt; car.x -= level.carSpeed * dt * 0.3; continue; }
    car.x -= level.carSpeed * dt;
    if (Math.abs(car.x - CONFIG.busX) < (CONFIG.busWidth + CONFIG.carWidth) / 2 - 12 && Math.abs(car.y - state.busY) < (CONFIG.busHeight + CONFIG.carHeight) / 2 - 12) {
      car.mode = "bump"; car.age = 0; honkAndBounce();
    }
  }
  state.balls = state.balls.filter(ball => !ball.dead && ball.x < CONFIG.width + 50);
  state.cars = state.cars.filter(car => car.x > -150 && (car.mode === "drive" || car.age < CONFIG.spinTime));
  for (const p of state.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 70 * dt; }
  state.particles = state.particles.filter(p => p.age < p.life && p.x > -30 && p.x < CONFIG.width + 30 && p.y < CONFIG.height + 30);
  state.celebration = Math.max(0, state.celebration - dt);
  ui.celebration.hidden = state.celebration === 0;
}

function rounded(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function ellipse(x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function line(x1, y1, x2, y2, color, width = 2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }

function tree(x, y, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ellipse(5, 10, 30, 23, "#577b4020");
  rounded(-4, 4, 9, 33, 3, "#a48b60");
  ellipse(-10, 0, 24, 25, "#719c66"); ellipse(12, -5, 25, 27, "#78a36b"); ellipse(-2, -19, 23, 23, "#83ac74");
  ellipse(-8, -25, 7, 4, "#a6c28a80"); ctx.restore();
}
function house(x, y, color) {
  rounded(x + 5, y + 9, 100, 76, 9, "#5a75461b");
  rounded(x, y, 96, 70, 7, "#f1e5c8");
  rounded(x - 8, y - 7, 112, 49, 7, color);
  line(x - 3, y + 17, x + 99, y + 17, "#ffffff30", 3);
  rounded(x + 17, y + 47, 18, 15, 3, "#9ebbb8"); rounded(x + 62, y + 42, 19, 28, 3, "#bda786");
  rounded(x + 72, y - 13, 13, 21, 3, "#d3b597");
}

function drawScenery() {
  ctx.fillStyle = "#bad2a2"; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = "#c6dbae"; ctx.fillRect(0, 0, CONFIG.width, 112);
  ctx.fillStyle = "#adc999"; ctx.fillRect(0, 542, CONFIG.width, 118);
  const shift = state.scroll % 1440;
  for (let cycle = -1; cycle <= 1; cycle++) {
    const x = cycle * 1440 - shift;
    house(x + 140, 31, "#c9957a"); house(x + 795, 27, "#93a7ae");
    [[50,70,0.8],[390,75,1.05],[650,51,0.8],[1060,65,1.1],[1330,80,0.7],[70,578,1],[460,604,0.85],[940,580,1.1],[1260,609,0.8]].forEach(([tx,ty,s]) => tree(x+tx,ty,s));
    for (let i = 0; i < 20; i++) {
      const gx = x + i * 73 + 20, gy = i % 2 ? 550 + i % 4 * 19 : 130;
      line(gx, gy, gx + 3, gy - 5, "#96b782"); line(gx + 3, gy - 5, gx + 6, gy, "#96b782");
      if (i % 3 === 0) { ellipse(gx+13, gy-2, 2.5, 2.5, "#e7e7b8"); }
    }
  }
  ctx.fillStyle = "#e6ddc3"; ctx.fillRect(0, 151, 1200, 368);
  ctx.fillStyle = "#faf2db"; ctx.fillRect(0, 158, 1200, 8); ctx.fillRect(0, 504, 1200, 8);
  ctx.fillStyle = "#778682"; ctx.fillRect(0, 170, 1200, 330);
  ctx.fillStyle = "#7c8b86"; ctx.fillRect(0, 282, 1200, 106);
  ctx.setLineDash([32, 28]);
  ctx.lineDashOffset = state.scroll % 60;
  line(0, 280, 1200, 280, "#dfe5ce", 4); line(0, 390, 1200, 390, "#dfe5ce", 4);
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  line(0, 177, 1200, 177, "#b3bca8", 2); line(0, 493, 1200, 493, "#b3bca8", 2);
}

function vehicle(x, y, isBus, color, rotation = 0, scale = 1, alpha = 1, image = isBus ? busImage : null) {
  const w = isBus ? CONFIG.busWidth : CONFIG.carWidth;
  const h = isBus ? CONFIG.busHeight : CONFIG.carHeight;
  const visualScale = scale * (image ? image.vehicleScale : 1);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rotation);
  // Lustro w poziomie zmienia kierunek autek, zachowując górę i dół grafiki.
  ctx.scale(isBus ? visualScale : -visualScale, visualScale);
  if (image && image.complete && image.naturalWidth > 0) {
    const fit = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const imageWidth = image.naturalWidth * fit;
    const imageHeight = image.naturalHeight * fit;
    ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    ctx.restore();
    return;
  }
  // Podczas ładowania lub przy braku pliku zostaje pojazd rysowany w kodzie.
  rounded(-w/2 + 3, -h/2 + 7, w, h, 19, "#354d4330");
  // Koła wystają po obu stronach karoserii: widok z góry.
  for (const wx of [-w/2 + 28, w/2 - 28]) for (const wy of [-h/2 - 4, h/2 - 5]) {
    rounded(wx - 13, wy, 26, 10, 4, "#344945"); rounded(wx - 6, wy + 2, 12, 5, 2, "#64726b");
  }
  rounded(-w/2, -h/2, w, h, isBus ? 17 : 22, color, isBus ? "#d5a537" : "#ffffff33");
  rounded(-w/2 + 9, -h/2 + 5, w - 19, 5, 3, "#ffffff45");
  rounded(w/2 - 10, -h/2 + 10, 7, 14, 3, "#fff3c6"); rounded(w/2 - 10, h/2 - 24, 7, 14, 3, "#fff3c6");
  rounded(-w/2 + 2, -h/2 + 12, 5, 12, 2, "#e2a18a"); rounded(-w/2 + 2, h/2 - 24, 5, 12, 2, "#e2a18a");
  if (isBus) {
    rounded(-w/2 + 17, -h/2 + 15, w - 57, h - 30, 10, "#f9d96b");
    for (let i = 0; i < 4; i++) { rounded(-65 + i*29, -29, 23, 13, 4, "#628f94"); rounded(-65 + i*29, 16, 23, 13, 4, "#628f94"); }
    rounded(49, -27, 19, 54, 6, "#527e83"); rounded(52, -23, 6, 30, 3, "#92c0be");
    rounded(-56, -10, 74, 20, 7, "#ffe690");
    ctx.fillStyle = "#b88b37"; ctx.font = "bold 11px Trebuchet MS, sans-serif"; ctx.textAlign = "center"; ctx.fillText("AUTOBUS", -19, 4);
    rounded(55, -h/2 - 8, 12, 9, 3, "#e8bd48"); rounded(55, h/2 - 1, 12, 9, 3, "#e8bd48");
  } else {
    rounded(-25, -26, 57, 52, 12, "#ffffff27");
    rounded(20, -23, 17, 46, 5, "#527f89"); rounded(-34, -21, 13, 42, 5, "#527f89");
    rounded(-15, -21, 28, 42, 7, color); line(-11, -18, 7, -18, "#ffffff50", 2);
    rounded(24, -19, 5, 23, 2, "#a1c9ca");
    rounded(19, -h/2 - 4, 11, 6, 2, color); rounded(19, h/2 - 2, 11, 6, 2, color);
  }
  ctx.restore();
}

function drawCone(cone) {
  const t = cone.mode === "bump" ? cone.age / CONFIG.bounceTime : 0;
  ctx.save(); ctx.translate(cone.x, cone.y);
  ctx.rotate(Math.sin(t * Math.PI) * 0.65); ctx.globalAlpha = 1 - t;
  rounded(-27, -27, 58, 60, 13, "#354d4330");
  rounded(-29, -33, 58, 66, 12, "#dd773f", "#f6bb79");
  rounded(-23, -27, 46, 54, 9, "#f4a456");
  ellipse(0, 20, 21, 5, "#ce6e37");
  // Lekko widoczny bok i białe pasy pomagają rozpoznać pachołek z góry.
  ctx.beginPath(); ctx.moveTo(-19, 19); ctx.lineTo(-5, -22);
  ctx.quadraticCurveTo(0, -30, 5, -22); ctx.lineTo(19, 19);
  ctx.quadraticCurveTo(0, 27, -19, 19); ctx.closePath();
  ctx.fillStyle = "#eb883d"; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "#fff4d8"; ctx.fillRect(-23, -12, 46, 9); ctx.fillRect(-23, 7, 46, 9);
  ctx.restore();
  line(-15, 15, -3, -21, "#ffffff4d", 2);
  ctx.restore();
}

function draw() {
  ctx.setTransform(canvas.width / CONFIG.width, 0, 0, canvas.height / CONFIG.height, 0, 0);
  drawScenery();
  if (state.cone) drawCone(state.cone);
  for (const ball of state.balls) {
    ellipse(ball.x - 3, ball.y + 5, CONFIG.ballRadius, CONFIG.ballRadius, "#304e391c");
    ellipse(ball.x, ball.y, CONFIG.ballRadius, CONFIG.ballRadius, ball.color);
    ellipse(ball.x - 4, ball.y - 5, 4, 3, "#fff7dcaa");
  }
  for (const car of state.cars) {
    const t = car.age / CONFIG.spinTime;
    // Kierunek jazdy nadaje lustro w vehicle(); obrót służy tylko animacjom.
    vehicle(car.x + (car.mode === "bump" ? Math.sin(t * Math.PI) * 44 : 0), car.y, false, car.color,
      car.mode === "spin" ? t * Math.PI * 2 : car.mode === "bump" ? Math.sin(t * Math.PI) * 0.4 : 0,
      car.mode === "spin" ? 1 - t * 0.45 : 1, car.mode === "drive" ? 1 : 1 - t, car.image);
  }
  const bounce = state.bounce > 0 ? Math.sin((1 - state.bounce / CONFIG.bounceTime) * Math.PI) : 0;
  vehicle(CONFIG.busX - bounce * 22, state.busY, true, "#f4c84e", -bounce * 0.06);
  for (const p of state.particles) {
    ctx.save(); ctx.globalAlpha = 1 - p.age / p.life; ctx.translate(p.x, p.y); ctx.rotate(p.rotation + p.age * 3);
    rounded(-4, -3, 8, 6, 2, p.color); ctx.restore();
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  draw();
}
window.addEventListener("resize", resizeCanvas);
if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);

function frame(timestamp) {
  const dt = lastFrame === null ? 0 : Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  if (state.mode === "playing") update(dt);
  draw();
  requestAnimationFrame(frame);
}
resizeCanvas();
requestAnimationFrame(frame);
