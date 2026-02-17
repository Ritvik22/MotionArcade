const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const flapStatus = document.getElementById("flapStatus");
const flapHint = document.getElementById("flapHint");
const startBtn = document.getElementById("startBtn");
const cameraState = document.getElementById("cameraState");

const gameCanvas = document.getElementById("gameCanvas");
const gameCtx = gameCanvas.getContext("2d");
const resetGameBtn = document.getElementById("resetGameBtn");
const tabFlappy = document.getElementById("tabFlappy");
const tabCricket = document.getElementById("tabCricket");

const flappyHud = document.getElementById("flappyHud");
const gameScoreText = document.getElementById("gameScore");
const bestScoreText = document.getElementById("bestScore");

const cricketHud = document.getElementById("cricketHud");
const cricketRunsText = document.getElementById("cricketRuns");
const cricketBallsText = document.getElementById("cricketBalls");
const cricketLastShotText = document.getElementById("cricketLastShot");
const cricketHint = document.getElementById("cricketHint");

const flappyControls = document.getElementById("flappyControls");
const gravitySlider = document.getElementById("gravitySlider");
const jumpSlider = document.getElementById("jumpSlider");
const gravityValue = document.getElementById("gravityValue");
const jumpValue = document.getElementById("jumpValue");
const deviceModeNotice = document.getElementById("deviceModeNotice");

let camera;
let cameraStarted = false;
let activeGame = "flappy";
let lastPoseSampleAt = null;
let isMobileDevice = detectMobileDevice();

const poseState = {
  previousLeftY: null,
  previousRightY: null,
  previousRightX: null,
  lastFlapAt: 0,
  lastSwingAt: 0,
  lastFoldAt: 0,
};

const BIRD_X = 90;
const BATTER_X = 322;
const BATTER_Y = 432;
const CRICKET_MAX_BALLS = 12;

const difficultyProfiles = {
  desktop: {
    gravity: 1350,
    jump: 575,
    pipeWidth: 72,
    pipeGap: 214,
    pipeSpeed: 145,
    pipeSpawnInterval: 1.62,
    flapThreshold: 0.74,
    flapCooldownMs: 245,
    ballSpeed: 205,
    ballSpawnInterval: 1.85,
    swingThreshold: 0.9,
    swingCooldownMs: 320,
    hitWindowX: 96,
    hitWindowY: 120,
    timingScale: 86,
  },
  mobile: {
    gravity: 1100,
    jump: 650,
    pipeWidth: 66,
    pipeGap: 240,
    pipeSpeed: 118,
    pipeSpawnInterval: 2.0,
    flapThreshold: 0.58,
    flapCooldownMs: 220,
    ballSpeed: 165,
    ballSpawnInterval: 2.1,
    swingThreshold: 0.7,
    swingCooldownMs: 280,
    hitWindowX: 122,
    hitWindowY: 145,
    timingScale: 102,
  },
};

let gravityStrength = Number(gravitySlider.value);
let jumpStrength = Number(jumpSlider.value);
let pipeWidth = difficultyProfiles.desktop.pipeWidth;
let pipeGap = difficultyProfiles.desktop.pipeGap;
let pipeSpeed = difficultyProfiles.desktop.pipeSpeed;
let pipeSpawnInterval = difficultyProfiles.desktop.pipeSpawnInterval;
let flapThreshold = difficultyProfiles.desktop.flapThreshold;
let flapCooldownMs = difficultyProfiles.desktop.flapCooldownMs;
let ballSpeed = difficultyProfiles.desktop.ballSpeed;
let ballSpawnInterval = difficultyProfiles.desktop.ballSpawnInterval;
let swingThreshold = difficultyProfiles.desktop.swingThreshold;
let swingCooldownMs = difficultyProfiles.desktop.swingCooldownMs;
let hitWindowX = difficultyProfiles.desktop.hitWindowX;
let hitWindowY = difficultyProfiles.desktop.hitWindowY;
let timingScale = difficultyProfiles.desktop.timingScale;

const flappyState = {
  mode: "waiting",
  birdY: gameCanvas.height * 0.45,
  birdVelocity: 0,
  score: 0,
  best: 0,
  pipes: [],
  pipeSpawnTimer: 0,
};

const cricketState = {
  mode: "running",
  runs: 0,
  balls: 0,
  lastShot: "-",
  ball: null,
  spawnTimer: 0,
  flashTimer: 0,
  flashRuns: 0,
  batAngle: -0.35,
  batAngularVelocity: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function detectMobileDevice() {
  const byAgent = /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const byScreen = window.matchMedia("(max-width: 900px)").matches;
  const byPointer = window.matchMedia("(pointer: coarse)").matches;
  return byAgent || byScreen || byPointer;
}

function applyDeviceLayout() {
  document.body.classList.toggle("mobile-mode", isMobileDevice);
  if (deviceModeNotice) {
    deviceModeNotice.classList.remove("hidden");
    deviceModeNotice.textContent = isMobileDevice
      ? "Mobile-friendly mode enabled"
      : "Desktop mode enabled";
  }
}

function applyDifficultyProfile() {
  const profile = isMobileDevice ? difficultyProfiles.mobile : difficultyProfiles.desktop;

  pipeWidth = profile.pipeWidth;
  pipeGap = profile.pipeGap;
  pipeSpeed = profile.pipeSpeed;
  pipeSpawnInterval = profile.pipeSpawnInterval;
  flapThreshold = profile.flapThreshold;
  flapCooldownMs = profile.flapCooldownMs;
  ballSpeed = profile.ballSpeed;
  ballSpawnInterval = profile.ballSpawnInterval;
  swingThreshold = profile.swingThreshold;
  swingCooldownMs = profile.swingCooldownMs;
  hitWindowX = profile.hitWindowX;
  hitWindowY = profile.hitWindowY;
  timingScale = profile.timingScale;

  gravityStrength = profile.gravity;
  jumpStrength = profile.jump;
  gravitySlider.value = String(profile.gravity);
  jumpSlider.value = String(profile.jump);
  gravityValue.textContent = String(profile.gravity);
  jumpValue.textContent = String(profile.jump);
}

function setFlapStatus(text, className) {
  flapStatus.textContent = text;
  flapStatus.className = `status ${className}`;
}

function resetFlappyGame() {
  flappyState.mode = "waiting";
  flappyState.birdY = gameCanvas.height * 0.45;
  flappyState.birdVelocity = 0;
  flappyState.score = 0;
  flappyState.pipes = [];
  flappyState.pipeSpawnTimer = 0;
  gameScoreText.textContent = "Score: 0";
  bestScoreText.textContent = `Best: ${flappyState.best}`;
}

function resetCricketGame() {
  cricketState.mode = "running";
  cricketState.runs = 0;
  cricketState.balls = 0;
  cricketState.lastShot = "-";
  cricketState.ball = null;
  cricketState.spawnTimer = 0;
  cricketState.flashTimer = 0;
  cricketState.flashRuns = 0;
  cricketState.batAngle = -0.35;
  cricketState.batAngularVelocity = 0;
  cricketRunsText.textContent = "Runs: 0";
  cricketBallsText.textContent = `Balls: 0/${CRICKET_MAX_BALLS}`;
  cricketLastShotText.textContent = "Last hit: -";
}

function resetActiveGame() {
  if (activeGame === "flappy") {
    resetFlappyGame();
  } else {
    resetCricketGame();
  }
}

function spawnPipe() {
  const padding = 80;
  const gapY = padding + Math.random() * (gameCanvas.height - padding * 2 - pipeGap);
  flappyState.pipes.push({
    x: gameCanvas.width + 30,
    width: pipeWidth,
    gapY,
    gapHeight: pipeGap,
    scored: false,
  });
}

function spawnCricketBall() {
  const y = 315 + Math.random() * 155;
  cricketState.ball = {
    x: -20,
    y,
    vx: ballSpeed + (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 26,
    active: true,
  };
}

function triggerFlappyJump() {
  if (flappyState.mode === "gameover") return;
  if (flappyState.mode === "waiting") flappyState.mode = "running";
  flappyState.birdVelocity = -jumpStrength;
}

function isFoldedArms(landmarks, shoulderWidth) {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const torsoCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const leftToRightElbow = Math.hypot(leftWrist.x - rightElbow.x, leftWrist.y - rightElbow.y);
  const rightToLeftElbow = Math.hypot(rightWrist.x - leftElbow.x, rightWrist.y - leftElbow.y);

  const wristsNearOppositeElbows =
    leftToRightElbow / shoulderWidth < 0.95 && rightToLeftElbow / shoulderWidth < 0.95;
  const wristsNearTorsoCenter =
    Math.abs(leftWrist.x - torsoCenterX) / shoulderWidth < 0.8 &&
    Math.abs(rightWrist.x - torsoCenterX) / shoulderWidth < 0.8;
  const wristsAtChestHeight =
    Math.abs(leftWrist.y - shoulderMidY) / shoulderWidth < 1.15 &&
    Math.abs(rightWrist.y - shoulderMidY) / shoulderWidth < 1.15;

  return wristsNearOppositeElbows && wristsNearTorsoCenter && wristsAtChestHeight;
}

function evaluateCricketHitTiming(ballX) {
  const timingError = Math.abs(ballX - BATTER_X) / timingScale;
  if (timingError < 0.1) return 6;
  if (timingError < 0.2) return 4;
  if (timingError < 0.33) return 3;
  if (timingError < 0.55) return 2;
  return 1;
}

function registerCricketBallOutcome(lastHitText) {
  cricketState.balls += 1;
  cricketBallsText.textContent = `Balls: ${cricketState.balls}/${CRICKET_MAX_BALLS}`;
  cricketLastShotText.textContent = `Last hit: ${lastHitText}`;
  if (cricketState.balls >= CRICKET_MAX_BALLS) {
    cricketState.mode = "over";
    cricketState.ball = null;
    setFlapStatus("Innings over", "good");
    flapHint.textContent = "12 balls done. Fold arms or press Reset to play again.";
  }
}

function triggerBatSwing(swingPower) {
  const power = clamp(swingPower, 0.2, 1.5);
  cricketState.batAngularVelocity = -8 - power * 8;
}

function handlePoseGestures(landmarks, nowMs) {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const visibilityThreshold = isMobileDevice ? 0.42 : 0.5;

  const confident =
    leftWrist.visibility > visibilityThreshold &&
    rightWrist.visibility > visibilityThreshold &&
    leftElbow.visibility > visibilityThreshold &&
    rightElbow.visibility > visibilityThreshold &&
    leftShoulder.visibility > 0.45 &&
    rightShoulder.visibility > 0.45;

  if (!confident) {
    poseState.previousLeftY = null;
    poseState.previousRightY = null;
    poseState.previousRightX = null;
    lastPoseSampleAt = nowMs;
    setFlapStatus("Hands not tracked", "neutral");
    flapHint.textContent = "Keep upper body and both hands visible.";
    return;
  }

  if (!lastPoseSampleAt || poseState.previousLeftY === null) {
    poseState.previousLeftY = leftWrist.y;
    poseState.previousRightY = rightWrist.y;
    poseState.previousRightX = rightWrist.x;
    lastPoseSampleAt = nowMs;
    return;
  }

  const dt = Math.max((nowMs - lastPoseSampleAt) / 1000, 0.001);
  const shoulderWidth = Math.max(Math.abs(leftShoulder.x - rightShoulder.x), 0.001);

  const foldReady = nowMs - poseState.lastFoldAt > 950;
  if (foldReady && isFoldedArms(landmarks, shoulderWidth)) {
    poseState.lastFoldAt = nowMs;
    resetActiveGame();
    setFlapStatus("Arms folded: reset", "good");
    flapHint.textContent =
      activeGame === "flappy"
        ? "Flap up to start. Fold arms anytime to reset."
        : "Swing to hit. Fold arms anytime to reset innings.";
    poseState.previousLeftY = leftWrist.y;
    poseState.previousRightY = rightWrist.y;
    poseState.previousRightX = rightWrist.x;
    lastPoseSampleAt = nowMs;
    return;
  }

  if (activeGame === "flappy") {
    const leftUpSpeed = (poseState.previousLeftY - leftWrist.y) / dt;
    const rightUpSpeed = (poseState.previousRightY - rightWrist.y) / dt;
    const meanUpSpeed = (leftUpSpeed + rightUpSpeed) / 2;
    const elbowsBelowWrists = leftWrist.y < leftElbow.y + 0.11 && rightWrist.y < rightElbow.y + 0.11;
    const cooldownReady = nowMs - poseState.lastFlapAt > flapCooldownMs;
    const bothHandsUp = leftUpSpeed > flapThreshold * 0.75 && rightUpSpeed > flapThreshold * 0.75;
    const oneHandPowerFlap = leftUpSpeed > flapThreshold * 1.25 || rightUpSpeed > flapThreshold * 1.25;
    const isFlap =
      cooldownReady && elbowsBelowWrists && (meanUpSpeed > flapThreshold || bothHandsUp || oneHandPowerFlap);

    if (isFlap) {
      poseState.lastFlapAt = nowMs;
      triggerFlappyJump();
      setFlapStatus("Flap detected!", "good");
      flapHint.textContent = "Nice. Keep flapping upward. Fold arms to reset.";
    } else if (meanUpSpeed > flapThreshold * 0.6) {
      setFlapStatus("Almost there", "neutral");
      flapHint.textContent = "Good start. Raise both hands up a little faster.";
    } else {
      setFlapStatus("Ready", "neutral");
      flapHint.textContent = "Quick upward flaps jump. Fold arms to reset.";
    }
  } else {
    const rightXSpeed = Math.abs((rightWrist.x - poseState.previousRightX) / dt);
    const rightHeightOk = rightWrist.y < rightShoulder.y + 0.5;
    const swingReady = nowMs - poseState.lastSwingAt > swingCooldownMs;
    const isSwing = rightXSpeed > swingThreshold && rightHeightOk && swingReady;

    if (isSwing) {
      poseState.lastSwingAt = nowMs;
      triggerBatSwing((rightXSpeed - swingThreshold + 0.2) / 1.4);

      if (
        cricketState.mode === "running" &&
        cricketState.ball &&
        cricketState.ball.active &&
        Math.abs(cricketState.ball.x - BATTER_X) < hitWindowX &&
        Math.abs(cricketState.ball.y - BATTER_Y) < hitWindowY
      ) {
        const runs = evaluateCricketHitTiming(cricketState.ball.x);
        cricketState.runs += runs;
        cricketState.lastShot = `${runs} run${runs > 1 ? "s" : ""}`;
        cricketState.flashRuns = runs;
        cricketState.flashTimer = 0.8;
        cricketState.ball = null;

        cricketRunsText.textContent = `Runs: ${cricketState.runs}`;
        registerCricketBallOutcome(String(runs));
        setFlapStatus("Sweet swing!", "good");
        flapHint.textContent = `Timing score: ${runs}. Swing when ball reaches the batter.`;
      } else if (cricketState.mode === "running") {
        setFlapStatus("Swing detected", "neutral");
        flapHint.textContent = "Good swing. Time it when the ball is near the batter.";
      }
    } else {
      if (cricketState.mode === "over") {
        setFlapStatus("Innings over", "good");
        flapHint.textContent = "12 balls done. Fold arms or press Reset to play again.";
      } else {
        setFlapStatus("Ready", "neutral");
        flapHint.textContent = "Cricket mode: swing your right hand to hit. Fold arms to reset.";
      }
    }
  }

  poseState.previousLeftY = leftWrist.y;
  poseState.previousRightY = rightWrist.y;
  poseState.previousRightX = rightWrist.x;
  lastPoseSampleAt = nowMs;
}

function drawFlappy() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.fillStyle = "#bdeefe";
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (const pipe of flappyState.pipes) {
    gameCtx.fillStyle = "#2b995f";
    gameCtx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
    gameCtx.fillRect(
      pipe.x,
      pipe.gapY + pipe.gapHeight,
      pipe.width,
      gameCanvas.height - (pipe.gapY + pipe.gapHeight)
    );
  }

  gameCtx.fillStyle = "#ffcc3d";
  gameCtx.beginPath();
  gameCtx.arc(BIRD_X, flappyState.birdY, 16, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = "#2f2f2f";
  gameCtx.beginPath();
  gameCtx.arc(BIRD_X + 6, flappyState.birdY - 4, 2.3, 0, Math.PI * 2);
  gameCtx.fill();

  gameCtx.fillStyle = "rgba(14, 76, 110, 0.8)";
  gameCtx.fillRect(10, 10, gameCanvas.width - 20, 84);
  gameCtx.fillStyle = "#ffffff";
  gameCtx.textAlign = "left";
  gameCtx.font = '700 16px "Space Grotesk", sans-serif';
  gameCtx.fillText("How To Play Flappy", 20, 34);
  gameCtx.font = '500 14px "IBM Plex Mono", monospace';
  gameCtx.fillText("1) Flap both hands UP quickly to jump", 20, 56);
  gameCtx.fillText("2) Fold arms to reset", 20, 76);

  if (flappyState.mode === "waiting") {
    gameCtx.fillStyle = "rgba(14, 76, 110, 0.86)";
    gameCtx.fillRect(44, gameCanvas.height / 2 - 54, gameCanvas.width - 88, 96);
    gameCtx.fillStyle = "#ffffff";
    gameCtx.font = '700 24px "Space Grotesk", sans-serif';
    gameCtx.textAlign = "center";
    gameCtx.fillText("Flap your hands to start", gameCanvas.width / 2, gameCanvas.height / 2 - 12);
    gameCtx.font = '500 16px "IBM Plex Mono", monospace';
    gameCtx.fillText("Keep your full upper body in frame", gameCanvas.width / 2, gameCanvas.height / 2 + 16);
  } else if (flappyState.mode === "gameover") {
    gameCtx.fillStyle = "rgba(10, 20, 30, 0.52)";
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameCtx.fillStyle = "#ffffff";
    gameCtx.font = '700 36px "Space Grotesk", sans-serif';
    gameCtx.textAlign = "center";
    gameCtx.fillText("Game Over", gameCanvas.width / 2, gameCanvas.height / 2 - 10);
  }

  gameCtx.fillStyle = "rgba(10, 35, 28, 0.5)";
  gameCtx.font = '500 12px "IBM Plex Mono", monospace';
  gameCtx.textAlign = "right";
  gameCtx.fillText("Made by Ritvik Shah", gameCanvas.width - 12, gameCanvas.height - 10);
}

function drawCricket() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  const sky = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height * 0.6);
  sky.addColorStop(0, "#87d9ff");
  sky.addColorStop(1, "#d7f3ff");
  gameCtx.fillStyle = sky;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  gameCtx.fillStyle = "#5a6672";
  for (let i = 0; i < 12; i += 1) {
    const x = i * 42 - 10;
    const h = 48 + (i % 4) * 6;
    gameCtx.fillRect(x, 120 - h, 30, h);
  }

  gameCtx.fillStyle = "#62b85b";
  gameCtx.fillRect(0, gameCanvas.height * 0.5, gameCanvas.width, gameCanvas.height * 0.5);

  gameCtx.fillStyle = "#c59b68";
  gameCtx.fillRect(140, 205, 220, 340);
  gameCtx.strokeStyle = "#efddbf";
  gameCtx.lineWidth = 3;
  gameCtx.beginPath();
  gameCtx.moveTo(140, 260);
  gameCtx.lineTo(360, 260);
  gameCtx.moveTo(140, 500);
  gameCtx.lineTo(360, 500);
  gameCtx.stroke();

  gameCtx.fillStyle = "#f7e6ca";
  gameCtx.fillRect(BATTER_X + 12, BATTER_Y - 30, 4, 70);
  gameCtx.fillRect(BATTER_X + 18, BATTER_Y - 30, 4, 70);
  gameCtx.fillRect(BATTER_X + 24, BATTER_Y - 30, 4, 70);

  gameCtx.fillStyle = "#2f3542";
  gameCtx.beginPath();
  gameCtx.arc(BATTER_X - 4, BATTER_Y - 34, 15, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = "#f5d2b3";
  gameCtx.fillRect(BATTER_X - 15, BATTER_Y - 18, 20, 34);
  gameCtx.fillStyle = "#1f6e44";
  gameCtx.fillRect(BATTER_X - 16, BATTER_Y + 15, 24, 55);

  gameCtx.save();
  gameCtx.translate(BATTER_X, BATTER_Y + 6);
  gameCtx.rotate(cricketState.batAngle);
  gameCtx.fillStyle = "#ddb57e";
  gameCtx.fillRect(0, -10, 75, 14);
  gameCtx.fillStyle = "#b58756";
  gameCtx.fillRect(0, -10, 20, 14);
  gameCtx.restore();

  if (cricketState.ball && cricketState.ball.active) {
    gameCtx.fillStyle = "#ffffff";
    gameCtx.beginPath();
    gameCtx.arc(cricketState.ball.x + 2, cricketState.ball.y - 2, 11, 0, Math.PI * 2);
    gameCtx.fill();
    gameCtx.fillStyle = "#d83a3a";
    gameCtx.beginPath();
    gameCtx.arc(cricketState.ball.x, cricketState.ball.y, 10, 0, Math.PI * 2);
    gameCtx.fill();
  }

  if (cricketState.flashTimer > 0) {
    gameCtx.fillStyle = "rgba(15, 60, 20, 0.7)";
    gameCtx.fillRect(0, 0, gameCanvas.width, 88);
    gameCtx.fillStyle = "#ffffff";
    gameCtx.font = '700 34px "Space Grotesk", sans-serif';
    gameCtx.textAlign = "center";
    gameCtx.fillText(`${cricketState.flashRuns} RUNS`, gameCanvas.width / 2, 54);
  }

  gameCtx.fillStyle = "#1a4d2e";
  gameCtx.font = '600 16px "IBM Plex Mono", monospace';
  gameCtx.textAlign = "left";
  gameCtx.fillText("Runs by timing only: 1, 2, 3, 4, 6", 14, gameCanvas.height - 18);

  gameCtx.fillStyle = "rgba(14, 76, 110, 0.8)";
  gameCtx.fillRect(10, 10, gameCanvas.width - 20, 106);
  gameCtx.fillStyle = "#ffffff";
  gameCtx.textAlign = "left";
  gameCtx.font = '700 16px "Space Grotesk", sans-serif';
  gameCtx.fillText("How To Play Cricket", 20, 34);
  gameCtx.font = '500 14px "IBM Plex Mono", monospace';
  gameCtx.fillText("1) Swing RIGHT hand when ball reaches bat", 20, 56);
  gameCtx.fillText("2) You get exactly 12 balls", 20, 76);
  gameCtx.fillText("3) Fold arms to reset innings", 20, 96);

  if (cricketState.mode === "over") {
    gameCtx.fillStyle = "rgba(8, 20, 18, 0.62)";
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameCtx.fillStyle = "#ffffff";
    gameCtx.font = '700 34px "Space Grotesk", sans-serif';
    gameCtx.textAlign = "center";
    gameCtx.fillText("Innings Complete", gameCanvas.width / 2, gameCanvas.height / 2 - 14);
    gameCtx.font = '500 22px "IBM Plex Mono", monospace';
    gameCtx.fillText(`Final Runs: ${cricketState.runs}`, gameCanvas.width / 2, gameCanvas.height / 2 + 20);
  }

  gameCtx.fillStyle = "rgba(10, 35, 28, 0.48)";
  gameCtx.font = '500 12px "IBM Plex Mono", monospace';
  gameCtx.textAlign = "right";
  gameCtx.fillText("A Ritvik Shah Production", gameCanvas.width - 12, gameCanvas.height - 10);
}

function updateFlappy(dt) {
  if (flappyState.mode !== "running") return;

  flappyState.birdVelocity += gravityStrength * dt;
  flappyState.birdY += flappyState.birdVelocity * dt;

  flappyState.pipeSpawnTimer += dt;
  if (flappyState.pipeSpawnTimer >= pipeSpawnInterval) {
    flappyState.pipeSpawnTimer = 0;
    spawnPipe();
  }

  flappyState.pipes.forEach((pipe) => {
    pipe.x -= pipeSpeed * dt;
    if (!pipe.scored && pipe.x + pipe.width < BIRD_X) {
      pipe.scored = true;
      flappyState.score += 1;
      flappyState.best = Math.max(flappyState.best, flappyState.score);
      gameScoreText.textContent = `Score: ${flappyState.score}`;
      bestScoreText.textContent = `Best: ${flappyState.best}`;
    }
  });

  flappyState.pipes = flappyState.pipes.filter((pipe) => pipe.x + pipe.width > -10);

  if (flappyState.birdY < 16 || flappyState.birdY > gameCanvas.height - 16) {
    flappyState.mode = "gameover";
    return;
  }

  const birdHitbox = isMobileDevice ? 10 : 12;
  for (const pipe of flappyState.pipes) {
    const inX = BIRD_X + birdHitbox > pipe.x && BIRD_X - birdHitbox < pipe.x + pipe.width;
    const inTopPipe = flappyState.birdY - birdHitbox < pipe.gapY;
    const inBottomPipe = flappyState.birdY + birdHitbox > pipe.gapY + pipe.gapHeight;
    if (inX && (inTopPipe || inBottomPipe)) {
      flappyState.mode = "gameover";
      return;
    }
  }
}

function updateCricket(dt) {
  cricketState.batAngle += cricketState.batAngularVelocity * dt;
  cricketState.batAngularVelocity += 24 * dt;
  if (cricketState.batAngle > -0.35) {
    cricketState.batAngle = -0.35;
    cricketState.batAngularVelocity = 0;
  }

  if (cricketState.mode === "over") {
    cricketState.ball = null;
    return;
  }

  cricketState.spawnTimer += dt;
  if (!cricketState.ball && cricketState.spawnTimer >= ballSpawnInterval) {
    cricketState.spawnTimer = 0;
    spawnCricketBall();
  }

  if (cricketState.ball && cricketState.ball.active) {
    cricketState.ball.x += cricketState.ball.vx * dt;
    cricketState.ball.y += cricketState.ball.vy * dt;

    if (cricketState.ball.x > gameCanvas.width + 30) {
      cricketState.lastShot = "Miss";
      registerCricketBallOutcome("Miss");
      cricketState.ball = null;
      if (cricketState.mode !== "over") {
        setFlapStatus("Missed ball", "bad");
        flapHint.textContent = "Swing a little later when ball reaches the batter.";
      }
    }
  }

  if (cricketState.flashTimer > 0) {
    cricketState.flashTimer = Math.max(0, cricketState.flashTimer - dt);
  }
}

function setActiveGame(nextGame) {
  activeGame = nextGame;
  const flappy = nextGame === "flappy";

  tabFlappy.classList.toggle("active", flappy);
  tabCricket.classList.toggle("active", !flappy);

  flappyHud.classList.toggle("hidden", !flappy);
  flappyControls.classList.toggle("hidden", !flappy);

  cricketHud.classList.toggle("hidden", flappy);
  cricketHint.classList.toggle("hidden", flappy);

  if (flappy) {
    setFlapStatus("Ready", "neutral");
    flapHint.textContent = isMobileDevice
      ? "Mobile Flappy: quick up-flaps jump. Fold arms to reset."
      : "Flappy mode: flap hands to jump. Fold arms to reset.";
  } else {
    setFlapStatus("Ready", "neutral");
    flapHint.textContent = isMobileDevice
      ? "Mobile Cricket: swing right hand, 12 balls, score 1/2/3/4/6."
      : "Cricket mode: 12 balls, score 1/2/3/4/6 by timing your swing.";
  }
}

function onResults(results) {
  if (!videoElement.videoWidth || !videoElement.videoHeight) return;

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.poseLandmarks) {
    canvasCtx.restore();
    poseState.previousLeftY = null;
    poseState.previousRightY = null;
    poseState.previousRightX = null;
    lastPoseSampleAt = performance.now();
    setFlapStatus("No person detected", "bad");
    flapHint.textContent = "Step back and keep both arms visible.";
    return;
  }

  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#1bd4a9",
    lineWidth: 3,
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#ffce6a", lineWidth: 1, radius: 2.8 });
  canvasCtx.restore();

  handlePoseGestures(results.poseLandmarks, performance.now());
}

function gameLoop() {
  let lastFrame = performance.now();
  const tick = (now) => {
    const dt = clamp((now - lastFrame) / 1000, 0, 0.03);
    lastFrame = now;

    if (activeGame === "flappy") {
      updateFlappy(dt);
      drawFlappy();
    } else {
      updateCricket(dt);
      drawCricket();
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

async function startCamera() {
  if (cameraStarted) return;
  cameraStarted = true;
  cameraState.textContent = "Starting camera...";
  startBtn.disabled = true;

  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
  pose.onResults(onResults);

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
    width: isMobileDevice ? 720 : 960,
    height: isMobileDevice ? 960 : 720,
  });

  try {
    await camera.start();
    cameraState.textContent = "Camera is live.";
    startBtn.classList.add("hidden");
  } catch (error) {
    cameraStarted = false;
    startBtn.disabled = false;
    startBtn.classList.remove("hidden");
    cameraState.textContent = "Could not access camera. Check permissions and retry.";
    setFlapStatus("Camera access required", "bad");
    flapHint.textContent = "Allow camera access in browser settings.";
    console.error(error);
  }
}

startBtn.addEventListener("click", () => {
  startCamera();
});

resetGameBtn.addEventListener("click", () => {
  resetActiveGame();
  setFlapStatus("Ready", "neutral");
  flapHint.textContent =
    activeGame === "flappy"
      ? "Flappy mode: flap hands to jump. Fold arms to reset."
      : "Cricket mode: 12 balls, score 1/2/3/4/6 by timing your swing.";
});

tabFlappy.addEventListener("click", () => setActiveGame("flappy"));
tabCricket.addEventListener("click", () => setActiveGame("cricket"));

gravitySlider.addEventListener("input", () => {
  gravityStrength = Number(gravitySlider.value);
  gravityValue.textContent = String(gravityStrength);
});

jumpSlider.addEventListener("input", () => {
  jumpStrength = Number(jumpSlider.value);
  jumpValue.textContent = String(jumpStrength);
});

let resizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const nextMode = detectMobileDevice();
    if (nextMode === isMobileDevice) return;
    isMobileDevice = nextMode;
    applyDeviceLayout();
    applyDifficultyProfile();
    resetActiveGame();
    setActiveGame(activeGame);
  }, 180);
});

applyDeviceLayout();
applyDifficultyProfile();
bestScoreText.textContent = `Best: ${flappyState.best}`;
resetCricketGame();
setActiveGame("flappy");
gameLoop();
