/**
 * One Minute Maze - Core Game Engine
 * Features:
 * - Ultra-responsive Arcade Input Stack with instant 180° reversals and smooth cornering.
 * - High-connectivity multi-way mazes (3 to 4 open corridors at every step).
 * - 10 balanced progressive levels capped at 9x9 to 13x13 for maximum visual clarity.
 * - Anti-exit-camping AI behavior.
 * - EMP Shockwave special ability (Spacebar / Mobile Button).
 * - Dynamic tension proximity vignette & heartbeat audio.
 * - Dark & Light mode system with persistence.
 * - Direct Level Selector Ribbon and Hotkeys.
 */

import { Maze } from './maze.js';
import { AStar } from './pathfinding.js';
import { TacticalAI, TACTIC } from './ai.js';
import { sound } from './audio.js';
import { ParticleSystem } from './particles.js';

export const LEVEL_CONFIGS = [
  { level: 1, name: 'Training Grounds', cols: 9, rows: 9, time: 80, enemySpeed: 1.6, pauseAtIntersection: 0.5 },
  { level: 2, name: 'First Patrol', cols: 9, rows: 9, time: 75, enemySpeed: 1.8, pauseAtIntersection: 0.4 },
  { level: 3, name: 'Twin Loops', cols: 11, rows: 11, time: 75, enemySpeed: 2.0, pauseAtIntersection: 0.35 },
  { level: 4, name: 'Corridor Hunt', cols: 11, rows: 11, time: 70, enemySpeed: 2.2, pauseAtIntersection: 0.25 },
  { level: 5, name: 'Crossroads', cols: 11, rows: 11, time: 65, enemySpeed: 2.4, pauseAtIntersection: 0.2 },
  { level: 6, name: 'The Labyrinth', cols: 13, rows: 13, time: 60, enemySpeed: 2.6, pauseAtIntersection: 0.15 },
  { level: 7, name: 'Shadow Chase', cols: 13, rows: 13, time: 60, enemySpeed: 2.8, pauseAtIntersection: 0.1 },
  { level: 8, name: 'Tactical Ambush', cols: 13, rows: 13, time: 55, enemySpeed: 3.0, pauseAtIntersection: 0.05 },
  { level: 9, name: 'Hunter\'s Den', cols: 13, rows: 13, time: 55, enemySpeed: 3.2, pauseAtIntersection: 0 },
  { level: 10, name: 'Nightmare Escape', cols: 13, rows: 13, time: 50, enemySpeed: 3.4, pauseAtIntersection: 0 }
];

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = new ParticleSystem();

    // Theme state
    this.currentTheme = localStorage.getItem('omm_theme') || 'dark';
    this.applyTheme(this.currentTheme);

    // Game state
    this.state = 'MENU';
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.timeLeft = 80.0;
    this.keysCollected = 0;
    this.totalKeys = 3;

    // EMP Ability state
    this.empCooldown = 0;
    this.empMaxCooldown = 12.0;

    // AI Vision toggle
    this.aiVisionEnabled = false;

    // Grid configuration
    this.cols = 9;
    this.rows = 9;
    this.cellSize = 48;

    // Entities
    this.player = null;
    this.enemy = null;
    this.keys = [];
    this.exit = null;
    this.maze = null;

    // Active Input Key Stack & Turn Buffer for instant responsive cornering
    this.activeKeyStack = [];
    this.touchDir = null;
    this.turnBuffer = null;

    // Hard Mode state (Nightmare Tom: Super Fast & Smart)
    this.hardMode = localStorage.getItem('omm_hard_mode') === 'true';

    // Anti-exit-camping tracker
    this.exitCampTimer = 0;

    // Tension vignette
    this.isTensionActive = false;
    this.lastHeartbeatTime = 0;

    // Camera shake
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Timing
    this.lastTime = performance.now();
    this.lastTickSecond = 80;

    // AI telemetry
    this.aiTelemetry = {
      tactic: TACTIC.CHASE,
      target: { c: 0, r: 0 },
      score: 0,
      pathLength: 0,
      exploredCount: 0,
      prunedCount: 0,
      activePath: [],
      exploredNodes: []
    };

    // Cartoon Tom & Jerry Vector Assets
    this.assets = {
      jerry: new Image(),
      tom: new Image(),
      cheese: new Image(),
      mousehole: new Image()
    };
    this.assets.jerry.src = 'assets/jerry.svg';
    this.assets.tom.src = 'assets/tom.svg';
    this.assets.cheese.src = 'assets/cheese.svg';
    this.assets.mousehole.src = 'assets/mousehole.svg';

    this.initDOM();
    this.renderLevelSelector();
    this.initInputs();
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.render();
      }, 150);
    });

    setTimeout(() => {
      if (this.dom.btnStart) this.dom.btnStart.focus();
    }, 100);

    requestAnimationFrame(this.loop.bind(this));
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omm_theme', theme);

    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.style.display = 'inline-block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline-block';
      }
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    sound.playButtonClick();
  }

  renderLevelSelector() {
    const container = document.getElementById('level-pills-container');
    if (!container) return;

    container.innerHTML = '';
    LEVEL_CONFIGS.forEach(cfg => {
      const btn = document.createElement('button');
      btn.className = `level-pill ${cfg.level === this.level ? 'active' : ''}`;
      btn.textContent = cfg.level;
      btn.title = `Jump to Level ${cfg.level}: ${cfg.name} (${cfg.cols}x${cfg.rows})`;
      btn.addEventListener('click', () => {
        sound.playButtonClick();
        this.startNewGame(cfg.level);
      });
      container.appendChild(btn);
    });
  }

  updateLevelSelectorActive() {
    const pills = document.querySelectorAll('.level-pill');
    pills.forEach((p, idx) => {
      p.classList.toggle('active', idx + 1 === this.level);
    });
  }

  initDOM() {
    this.dom = {
      timerVal: document.getElementById('timer-val'),
      timerBar: document.getElementById('timer-progress'),
      scoreVal: document.getElementById('score-val'),
      levelVal: document.getElementById('level-val'),
      livesContainer: document.getElementById('lives-container'),
      keysContainer: document.getElementById('keys-container'),
      tensionVignette: document.getElementById('tension-vignette'),
      toast: document.getElementById('toast'),

      btnEmpHud: document.getElementById('btn-emp-hud'),
      empStatusText: document.getElementById('emp-status-text'),
      btnEmpMobile: document.getElementById('btn-emp-mobile'),

      startModal: document.getElementById('start-modal'),
      pauseModal: document.getElementById('pause-modal'),
      gameOverModal: document.getElementById('game-over-modal'),
      victoryModal: document.getElementById('victory-modal'),

      finalScoreLoss: document.getElementById('final-score-loss'),
      keysFoundLoss: document.getElementById('keys-found-loss'),
      levelLossText: document.getElementById('level-loss-text'),
      finalScoreWin: document.getElementById('final-score-win'),
      timeBonusWin: document.getElementById('time-bonus-win'),
      livesBonusWin: document.getElementById('lives-bonus-win'),
      rankBadgeVal: document.getElementById('rank-badge-val'),

      btnTheme: document.getElementById('btn-theme'),
      btnHardMode: document.getElementById('btn-hard-mode'),
      hardModeState: document.getElementById('hard-mode-state'),
      hardModeBadge: document.getElementById('hard-mode-badge'),
      btnStart: document.getElementById('btn-start'),
      btnRestartLoss: document.getElementById('btn-restart-loss'),
      btnNextLevel: document.getElementById('btn-next-level'),
      btnShareCard: document.getElementById('btn-share-card'),
      btnPause: document.getElementById('btn-pause'),
      btnResume: document.getElementById('btn-resume'),
      btnRestartPause: document.getElementById('btn-restart-pause'),
      btnMute: document.getElementById('btn-mute'),
      btnToggleAi: document.getElementById('btn-toggle-ai'),

      aiHud: document.getElementById('ai-hud'),
      aiTacticVal: document.getElementById('ai-tactic-val'),
      aiTargetVal: document.getElementById('ai-target-val'),
      aiPathVal: document.getElementById('ai-path-val'),
      aiExploredVal: document.getElementById('ai-explored-val'),
      aiPrunedVal: document.getElementById('ai-pruned-val'),
      aiScoreVal: document.getElementById('ai-score-val'),

      dpadUp: document.getElementById('dpad-up'),
      dpadDown: document.getElementById('dpad-down'),
      dpadLeft: document.getElementById('dpad-left'),
      dpadRight: document.getElementById('dpad-right')
    };

    this.dom.btnTheme.addEventListener('click', () => this.toggleTheme());

    if (this.dom.btnHardMode) {
      this.dom.btnHardMode.addEventListener('click', () => {
        sound.playButtonClick();
        this.toggleHardMode();
      });
      this.updateHardModeUI();
    }

    const triggerEMP = () => this.activateEMP();
    this.dom.btnEmpHud.addEventListener('click', triggerEMP);
    if (this.dom.btnEmpMobile) {
      this.dom.btnEmpMobile.addEventListener('click', triggerEMP);
      this.dom.btnEmpMobile.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerEMP();
        if (navigator.vibrate) navigator.vibrate(20);
      }, { passive: false });
    }

    this.dom.btnStart.addEventListener('click', () => {
      sound.playButtonClick();
      this.startNewGame(1);
    });

    this.dom.btnRestartLoss.addEventListener('click', () => {
      sound.playButtonClick();
      this.startNewGame(this.level);
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      sound.playButtonClick();
      const nextLvl = this.level >= 10 ? 1 : this.level + 1;
      this.startNewGame(nextLvl);
    });

    this.dom.btnShareCard.addEventListener('click', () => {
      this.copyBragCard();
    });

    this.dom.btnPause.addEventListener('click', () => {
      sound.playButtonClick();
      this.togglePause();
    });

    this.dom.btnResume.addEventListener('click', () => {
      sound.playButtonClick();
      this.togglePause();
    });

    this.dom.btnRestartPause.addEventListener('click', () => {
      sound.playButtonClick();
      this.togglePause();
      this.startNewGame(this.level);
    });

    this.dom.btnMute.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.dom.btnMute.classList.toggle('active', isMuted);
    });

    this.dom.btnToggleAi.addEventListener('click', () => {
      sound.playButtonClick();
      this.toggleAiVision();
    });
  }

  showToast(message) {
    const toast = this.dom.toast;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  copyBragCard() {
    const rank = this.dom.rankBadgeVal.textContent;
    const time = Math.floor(this.timeLeft);
    const score = this.score;

    const bragText = `🧀 TOM & JERRY: CHEESE CHASE - Level ${this.level}\n` +
      `Rank: ${rank}\n` +
      `⏱ Time Remaining: ${time}s | 🐭 Lives: ${this.lives}/3\n` +
      `Score: ${score} pts\n` +
      `Jerry grabbed all the Swiss cheese and outmaneuvered Tom! Can you beat my time?`;

    navigator.clipboard.writeText(bragText).then(() => {
      this.showToast('📋 Copied Brag Card to Clipboard!');
      sound.playButtonClick();
    }).catch(() => {
      this.showToast('Copied result!');
    });
  }

  toggleAiVision() {
    this.aiVisionEnabled = !this.aiVisionEnabled;
    if (this.dom && this.dom.btnToggleAi) {
      this.dom.btnToggleAi.classList.toggle('active', this.aiVisionEnabled);
    }
    if (this.dom && this.dom.aiHud) {
      this.dom.aiHud.classList.toggle('visible', this.aiVisionEnabled);
    }
    if (this.aiVisionEnabled) {
      this.updateAiHud();
    }
  }

  toggleHardMode() {
    this.hardMode = !this.hardMode;
    localStorage.setItem('omm_hard_mode', this.hardMode.toString());
    this.updateHardModeUI();

    if (this.enemy) {
      const cfg = LEVEL_CONFIGS[this.level - 1] || LEVEL_CONFIGS[0];
      if (this.hardMode) {
        this.enemy.speed = Math.min(5.5, 4.6 + this.level * 0.1);
        this.enemy.defaultPause = 0;
        this.enemy.pauseAtIntersection = 0;
      } else {
        this.enemy.speed = cfg.enemySpeed;
        this.enemy.defaultPause = cfg.pauseAtIntersection;
      }
      this.updateEnemyTactics();
    }

    if (this.hardMode) {
      this.showToast('🔥 HARD MODE ON: TOM IS ULTRA-FAST & SMART!');
    } else {
      this.showToast('🌿 NORMAL MODE: BALANCED GAMEPLAY');
    }
  }

  updateHardModeUI() {
    if (!this.dom) return;
    if (this.dom.btnHardMode) {
      this.dom.btnHardMode.classList.toggle('active', this.hardMode);
    }
    if (this.dom.hardModeState) {
      this.dom.hardModeState.textContent = this.hardMode ? 'ON' : 'OFF';
    }
    if (this.dom.hardModeBadge) {
      this.dom.hardModeBadge.style.display = this.hardMode ? 'inline-flex' : 'none';
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.dom.pauseModal.classList.remove('hidden');
      setTimeout(() => {
        if (this.dom.btnResume) this.dom.btnResume.focus();
      }, 50);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.dom.pauseModal.classList.add('hidden');
      this.lastTime = performance.now();
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }
  }

  initInputs() {
    const normalizeKey = (k) => {
      const lower = k.toLowerCase();
      if (lower === 'arrowup' || lower === 'w') return 'up';
      if (lower === 'arrowdown' || lower === 's') return 'down';
      if (lower === 'arrowleft' || lower === 'a') return 'left';
      if (lower === 'arrowright' || lower === 'd') return 'right';
      return null;
    };

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Modal Keyboard Navigation (Enter, Space, N, R, ArrowRight, ArrowUp)
      if (this.state === 'VICTORY') {
        const isNextKey = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' ||
                          e.key === ' ' || e.code === 'Space' ||
                          e.key.toLowerCase() === 'n' || e.code === 'KeyN' ||
                          e.key === 'ArrowRight';
        if (isNextKey) {
          e.preventDefault();
          sound.playButtonClick();
          const nextLvl = this.level >= 10 ? 1 : this.level + 1;
          this.startNewGame(nextLvl);
          return;
        }
      }

      if (this.state === 'GAMEOVER') {
        const isRetryKey = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' ||
                           e.key === ' ' || e.code === 'Space' ||
                           e.key.toLowerCase() === 'r' || e.code === 'KeyR' ||
                           e.key === 'ArrowUp';
        if (isRetryKey) {
          e.preventDefault();
          sound.playButtonClick();
          this.startNewGame(this.level);
          return;
        }
      }

      if (this.state === 'MENU') {
        const isStartKey = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' ||
                           e.key === ' ' || e.code === 'Space';
        if (isStartKey) {
          e.preventDefault();
          sound.playButtonClick();
          this.startNewGame(1);
          return;
        }
      }

      if (this.state === 'PAUSED') {
        const isResumeKey = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' ||
                            e.key === ' ' || e.code === 'Space' ||
                            e.key === 'Escape' || e.key.toLowerCase() === 'p' || e.code === 'KeyP';
        if (isResumeKey) {
          e.preventDefault();
          sound.playButtonClick();
          this.togglePause();
          return;
        }
      }

      // Space: EMP (during active gameplay)
      if (this.state === 'PLAYING' && (e.key === ' ' || e.code === 'Space')) {
        this.activateEMP();
        return;
      }

      // Hotkey: Jump directly to Next Level from keyboard anytime!
      if (e.key.toLowerCase() === 'n' || e.code === 'KeyN') {
        sound.playButtonClick();
        const nextLvl = this.level >= 10 ? 1 : this.level + 1;
        this.startNewGame(nextLvl);
        return;
      }

      // Hotkey: Quick restart current level from keyboard
      if (e.key.toLowerCase() === 'r' || e.code === 'KeyR') {
        sound.playButtonClick();
        this.startNewGame(this.level);
        return;
      }

      // Hotkeys
      if (e.key.toLowerCase() === 'h' || e.code === 'KeyH') {
        sound.playButtonClick();
        this.toggleHardMode();
        return;
      }
      if (e.key.toLowerCase() === 'v' || e.code === 'KeyV') {
        this.toggleAiVision();
        return;
      }
      if (e.key.toLowerCase() === 'p' || e.code === 'KeyP' || e.key === 'Escape') {
        this.togglePause();
        return;
      }

      // Number key shortcuts 1-9 and 0
      if (e.key >= '1' && e.key <= '9') {
        sound.playButtonClick();
        this.startNewGame(parseInt(e.key, 10));
        return;
      }
      if (e.key === '0') {
        sound.playButtonClick();
        this.startNewGame(10);
        return;
      }

      const dirName = normalizeKey(e.key);
      if (dirName) {
        // Push to active key stack (latest key pressed sits on top!)
        this.activeKeyStack = this.activeKeyStack.filter(k => k !== dirName);
        this.activeKeyStack.push(dirName);

        // Immediately handle turning / direction update
        this.onDirectionInput(dirName);
      }
    });

    window.addEventListener('keyup', (e) => {
      const dirName = normalizeKey(e.key);
      if (dirName) {
        this.activeKeyStack = this.activeKeyStack.filter(k => k !== dirName);
      }
    });

    // 1. Touch D-Pad Individual Button Listeners
    const setupTouchBtn = (btn, dirName) => {
      if (!btn) return;
      const activate = (e) => {
        e.preventDefault();
        this.touchDir = dirName;
        this.onDirectionInput(dirName);
        if (navigator.vibrate) navigator.vibrate(10);
      };
      const deactivate = (e) => {
        e.preventDefault();
        if (this.touchDir === dirName) this.touchDir = null;
      };
      btn.addEventListener('touchstart', activate, { passive: false });
      btn.addEventListener('touchend', deactivate, { passive: false });
      btn.addEventListener('mousedown', activate);
      btn.addEventListener('mouseup', deactivate);
      btn.addEventListener('mouseleave', deactivate);
    };

    setupTouchBtn(this.dom.dpadUp, 'up');
    setupTouchBtn(this.dom.dpadDown, 'down');
    setupTouchBtn(this.dom.dpadLeft, 'left');
    setupTouchBtn(this.dom.dpadRight, 'right');

    // 2. Rolling Thumb Gestures across D-Pad Container (Arcade Thumb Slide)
    const dpadContainer = document.querySelector('.dpad-container');
    if (dpadContainer) {
      let currentActiveBtn = null;

      const handleDpadMove = (touch) => {
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
        const btn = targetEl ? targetEl.closest('.dpad-btn') : null;
        if (btn && btn !== currentActiveBtn) {
          if (currentActiveBtn) currentActiveBtn.classList.remove('active-touch');
          currentActiveBtn = btn;
          currentActiveBtn.classList.add('active-touch');

          let dir = null;
          if (btn.id === 'dpad-up') dir = 'up';
          else if (btn.id === 'dpad-down') dir = 'down';
          else if (btn.id === 'dpad-left') dir = 'left';
          else if (btn.id === 'dpad-right') dir = 'right';

          if (dir) {
            this.touchDir = dir;
            this.onDirectionInput(dir);
            if (navigator.vibrate) navigator.vibrate(12);
          }
        } else if (!btn && currentActiveBtn) {
          currentActiveBtn.classList.remove('active-touch');
          currentActiveBtn = null;
          this.touchDir = null;
        }
      };

      dpadContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches && e.touches.length > 0) handleDpadMove(e.touches[0]);
      }, { passive: false });

      dpadContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches && e.touches.length > 0) handleDpadMove(e.touches[0]);
      }, { passive: false });

      const clearDpad = (e) => {
        e.preventDefault();
        if (currentActiveBtn) {
          currentActiveBtn.classList.remove('active-touch');
          currentActiveBtn = null;
        }
        this.touchDir = null;
      };

      dpadContainer.addEventListener('touchend', clearDpad, { passive: false });
      dpadContainer.addEventListener('touchcancel', clearDpad, { passive: false });
    }

    // 3. Direct Touch Gestures on Canvas (Swipe & Continuous Drag Steering)
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchingCanvas = false;

    this.canvas.addEventListener('touchstart', (e) => {
      // Tap on canvas to advance if in menu, pause, or end game screens
      if (this.state !== 'PLAYING') {
        if (this.state === 'MENU') {
          sound.playButtonClick();
          this.startNewGame(1);
          return;
        } else if (this.state === 'GAMEOVER') {
          sound.playButtonClick();
          this.startNewGame(this.level);
          return;
        } else if (this.state === 'VICTORY') {
          sound.playButtonClick();
          const nextLvl = this.level >= 10 ? 1 : this.level + 1;
          this.startNewGame(nextLvl);
          return;
        } else if (this.state === 'PAUSED') {
          sound.playButtonClick();
          this.togglePause();
          return;
        }
      }

      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        isTouchingCanvas = true;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!isTouchingCanvas || this.state !== 'PLAYING') return;
      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const distSq = dx * dx + dy * dy;

        // Snappy 12px threshold for quick direction shifts
        if (distSq >= 144) {
          let dir = null;
          if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? 'right' : 'left';
          } else {
            dir = dy > 0 ? 'down' : 'up';
          }

          if (dir) {
            this.touchDir = dir;
            this.onDirectionInput(dir);
            if (navigator.vibrate) navigator.vibrate(10);
            // Reset origin so player can continuously drag around corners without lifting thumb!
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
          }
        }
      }
    }, { passive: false });

    const endCanvasTouch = (e) => {
      if (isTouchingCanvas) {
        isTouchingCanvas = false;
        this.touchDir = null;
      }
    };

    this.canvas.addEventListener('touchend', endCanvasTouch, { passive: false });
    this.canvas.addEventListener('touchcancel', endCanvasTouch, { passive: false });
  }

  dirNameToCoords(dirName) {
    if (dirName === 'up') return { c: 0, r: -1 };
    if (dirName === 'down') return { c: 0, r: 1 };
    if (dirName === 'left') return { c: -1, r: 0 };
    if (dirName === 'right') return { c: 1, r: 0 };
    return null;
  }

  getTopRequestedDirection() {
    if (this.touchDir) {
      return this.dirNameToCoords(this.touchDir);
    }
    if (this.activeKeyStack.length > 0) {
      const topKey = this.activeKeyStack[this.activeKeyStack.length - 1];
      return this.dirNameToCoords(topKey);
    }
    return null;
  }

  /**
   * Ultra-Responsive Arcade Cornering Engine:
   * 1. Caches every tap in a persistent turn buffer (500ms validity).
   * 2. Instant 180° direction reversal during motion.
   * 3. Late-Turn Snapping (moveProgress <= 0.45): Snaps around the corner from the junction just passed.
   * 4. Early-Turn Snapping (moveProgress >= 0.75): Cuts the corner into the upcoming opening.
   * 5. Immediate launch if currently idle.
   */
  onDirectionInput(dirName) {
    if (this.state !== 'PLAYING' || !this.player || !this.maze) return;

    const p = this.player;
    const newDir = this.dirNameToCoords(dirName);
    if (!newDir) return;

    const now = performance.now();
    this.turnBuffer = { dirName, dir: newDir, timestamp: now };

    // 1. Instant 180° direction reversal while in motion
    if (p.isMoving && p.lastDir) {
      const isOpposite = (newDir.c === -p.lastDir.c && newDir.r === -p.lastDir.r);
      if (isOpposite) {
        const oldTargetC = p.targetC;
        const oldTargetR = p.targetR;
        p.targetC = p.c;
        p.targetR = p.r;
        p.c = oldTargetC;
        p.r = oldTargetR;
        p.moveProgress = Math.max(0, 1.0 - p.moveProgress);
        p.lastDir = newDir;
        p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
        p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
        sound.playMove();
        this.turnBuffer = null;
        return;
      }
    }

    // 2. Late-Turn Corner Snapping (within 45% of leaving cell p.c, p.r)
    // If the player pressed turn slightly late at high speed, allow turning from the junction just left!
    if (p.isMoving && p.lastDir && p.moveProgress <= 0.45) {
      const isPerpendicular = (newDir.c !== p.lastDir.c || newDir.r !== p.lastDir.r);
      if (isPerpendicular) {
        const turnC = p.c + newDir.c;
        const turnR = p.r + newDir.r;
        if (this.maze.canMove(p.c, p.r, turnC, turnR)) {
          p.targetC = turnC;
          p.targetR = turnR;
          p.lastDir = newDir;
          p.isMoving = true;
          p.moveProgress = Math.min(0.25, Math.max(0.04, p.moveProgress));
          p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
          p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
          sound.playMove();
          this.turnBuffer = null;
          return;
        }
      }
    }

    // 3. Early-Turn Corner Snapping (within 25% of reaching target tile p.targetC, p.targetR)
    // If approaching an intersection and turning perpendicular into an open corridor:
    if (p.isMoving && p.lastDir && p.moveProgress >= 0.75) {
      const isPerpendicular = (newDir.c !== p.lastDir.c || newDir.r !== p.lastDir.r);
      if (isPerpendicular) {
        const turnC = p.targetC + newDir.c;
        const turnR = p.targetR + newDir.r;
        if (this.maze.canMove(p.targetC, p.targetR, turnC, turnR)) {
          const overflow = p.moveProgress - 0.75;
          p.c = p.targetC;
          p.r = p.targetR;
          p.targetC = turnC;
          p.targetR = turnR;
          p.lastDir = newDir;
          p.isMoving = true;
          p.moveProgress = Math.min(0.3, overflow);
          p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
          p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
          sound.playMove();
          this.turnBuffer = null;
          return;
        }
      }
    }

    // 4. If currently stopped / idle, immediately start moving if the direction is open
    if (!p.isMoving) {
      const nextC = p.c + newDir.c;
      const nextR = p.r + newDir.r;
      if (this.maze.canMove(p.c, p.r, nextC, nextR)) {
        p.targetC = nextC;
        p.targetR = nextR;
        p.lastDir = newDir;
        p.isMoving = true;
        p.moveProgress = 0;
        p.renderX = p.c;
        p.renderY = p.r;
        sound.playMove();
        this.turnBuffer = null;
      }
    }
  }

  resizeCanvas() {
    const container = document.getElementById('canvas-wrapper');
    if (!container) return;

    // Dynamically calculate available space to eliminate empty void and prevent mobile overflow
    const header = document.querySelector('header');
    const footer = document.querySelector('.game-footer');
    const mobileControls = document.getElementById('mobile-controls');

    const headerH = header ? header.offsetHeight : 110;

    // Check footer visibility (hidden on mobile screens to save screen height)
    let footerH = 0;
    if (footer && window.getComputedStyle(footer).display !== 'none') {
      footerH = footer.offsetHeight;
    }

    // Check mobile controls visibility and calculate height
    let mobileH = 0;
    if (mobileControls && window.getComputedStyle(mobileControls).display !== 'none') {
      mobileH = mobileControls.offsetHeight || 135;
    }

    // Available width accounting for side padding & canvas borders
    const horizPadding = window.innerWidth <= 480 ? 16 : (window.innerWidth <= 768 ? 24 : 36);
    const availableW = window.innerWidth - horizPadding;

    // Available height accounting for vertical margins and spacing
    const vertPadding = window.innerWidth <= 480 ? 14 : 28;
    const availableH = window.innerHeight - headerH - footerH - mobileH - vertPadding;

    // Minimum size 240px (fits small phones and split views), capped at 680px for desktop
    const minDim = Math.max(240, Math.floor(Math.min(availableW, availableH, 680)));

    this.canvas.width = minDim;
    this.canvas.height = minDim;
    this.canvas.style.width = `${minDim}px`;
    this.canvas.style.height = `${minDim}px`;
    container.style.width = `${minDim}px`;
    container.style.height = `${minDim}px`;

    if (this.maze) {
      this.cellSize = minDim / Math.max(this.cols, this.rows);
    }
  }

  startNewGame(level = 1) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    setTimeout(() => { this.isTransitioning = false; }, 250);

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    this.level = Math.max(1, Math.min(10, level));
    const cfg = LEVEL_CONFIGS[this.level - 1] || LEVEL_CONFIGS[0];

    if (this.level === 1) {
      this.score = 0;
      this.lives = this.maxLives;
    }

    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.timeLeft = cfg.time;
    this.lastTickSecond = Math.ceil(this.timeLeft);
    this.keysCollected = 0;
    this.empCooldown = 0;
    this.exitCampTimer = 0;
    this.activeKeyStack = [];
    this.turnBuffer = null;

    this.dom.startModal.classList.add('hidden');
    this.dom.pauseModal.classList.add('hidden');
    this.dom.gameOverModal.classList.add('hidden');
    this.dom.victoryModal.classList.add('hidden');
    this.dom.tensionVignette.classList.remove('active');

    this.particles.clear();
    this.resizeCanvas();

    // High-connectivity maze with 3-4 ways at almost every cell
    this.maze = new Maze(this.cols, this.rows, 0.55);

    // Player spawn at (0, 0)
    this.player = {
      c: 0,
      r: 0,
      renderX: 0,
      renderY: 0,
      speed: 5.8, // Snappy arcade speed
      targetC: 0,
      targetR: 0,
      isMoving: false,
      moveProgress: 0,
      lastDir: { c: 0, r: 0 },
      invulnerableTimer: 0,
      speedBurstTimer: 0
    };

    // Exit at (cols - 1, rows - 1)
    this.exit = {
      c: this.cols - 1,
      r: this.rows - 1,
      unlocked: false
    };
    this.maze.ensureMultiWayAccess(this.exit.c, this.exit.r, 3);

    this.generateKeys();

    // Enemy spawn
    const enemySpawn = { c: this.cols - 1, r: 0 };
    const enemySpeed = this.hardMode 
      ? Math.min(5.5, 4.6 + this.level * 0.1) 
      : cfg.enemySpeed;
    const defaultPause = this.hardMode ? 0 : cfg.pauseAtIntersection;

    this.enemy = {
      c: enemySpawn.c,
      r: enemySpawn.r,
      renderX: enemySpawn.c,
      renderY: enemySpawn.r,
      speed: enemySpeed,
      targetC: enemySpawn.c,
      targetR: enemySpawn.r,
      isMoving: false,
      moveProgress: 0,
      stunnedTimer: 0,
      rethinkTimer: 0,
      pauseAtIntersection: 0,
      defaultPause: defaultPause
    };

    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.updateHUD();
    this.updateLevelSelectorActive();
    this.updateHardModeUI();
    this.updateEnemyTactics();
  }

  generateKeys() {
    this.keys = [];
    const midC = Math.floor(this.cols / 2);
    const midR = Math.floor(this.rows / 2);

    const regions = [
      { minC: 1, maxC: midC - 1, minR: midR, maxR: this.rows - 2 },
      { minC: midC, maxC: this.cols - 2, minR: 1, maxR: midR - 1 },
      { minC: Math.max(1, midC - 1), maxC: Math.min(this.cols - 2, midC + 1), minR: Math.max(1, midR - 1), maxR: Math.min(this.rows - 2, midR + 1) }
    ];

    regions.forEach((reg, i) => {
      let keyC = Math.floor(Math.random() * (reg.maxC - reg.minC + 1)) + reg.minC;
      let keyR = Math.floor(Math.random() * (reg.maxR - reg.minR + 1)) + reg.minR;

      if (keyC === 0 && keyR === 0) keyC = 1;
      if (keyC === this.exit.c && keyR === this.exit.r) keyR = this.exit.r - 1;

      // Ensure key has 3 distinct access corridors
      this.maze.ensureMultiWayAccess(keyC, keyR, 3);

      this.keys.push({
        id: i,
        c: keyC,
        r: keyR,
        collected: false,
        pulseOffset: i * 1.5
      });
    });
  }

  activateEMP() {
    if (this.state !== 'PLAYING') return;
    if (this.empCooldown > 0) return;

    this.empCooldown = this.empMaxCooldown;
    sound.playEMP();
    this.triggerScreenShake(8, 0.3);

    const playerScreen = this.gridToScreen(this.player.renderX, this.player.renderY);
    this.particles.emitEMPWave(playerScreen.x, playerScreen.y);

    this.enemy.stunnedTimer = 3.5;
    this.enemy.isMoving = false;
    this.enemy.renderX = this.enemy.c;
    this.enemy.renderY = this.enemy.r;

    this.player.speedBurstTimer = 1.2;
    this.showToast('⚡ EMP ACTIVATED - HUNTER STUNNED!');
    this.updateHUD();
  }

  updateEnemyTactics() {
    if (!this.maze || !this.player || !this.enemy) return;

    const depth = this.hardMode ? 5 : (this.level >= 8 ? 4 : (this.level >= 4 ? 3 : 2));

    const decision = TacticalAI.decideTactic(
      this.maze,
      { c: this.enemy.c, r: this.enemy.r },
      this.player,
      this.keys,
      this.exit,
      this.timeLeft,
      this.level,
      this.exitCampTimer,
      depth,
      this.hardMode
    );

    let target = decision.target;
    if (this.keysCollected >= this.totalKeys && target.c === this.exit.c && target.r === this.exit.r) {
      const neighbors = this.maze.getPassableNeighbors(this.exit.c, this.exit.r);
      if (neighbors.length > 0) {
        target = neighbors[0];
      }
    }

    const astarRes = AStar.findPath(
      this.maze,
      { c: this.enemy.c, r: this.enemy.r },
      target
    );

    this.aiTelemetry = {
      tactic: decision.tactic,
      target,
      score: decision.score,
      pathLength: astarRes.found ? astarRes.path.length : 0,
      exploredCount: astarRes.exploredNodes.length,
      prunedCount: decision.stats.prunedBranches,
      activePath: astarRes.path,
      exploredNodes: astarRes.exploredNodes
    };

    this.enemyPlannedPath = astarRes.path;
    this.updateAiHud();
  }

  updateAiHud() {
    if (!this.aiVisionEnabled || !this.dom || !this.dom.aiHud) return;
    try {
      if (this.dom.aiTacticVal && this.aiTelemetry.tactic) {
        this.dom.aiTacticVal.textContent = this.aiTelemetry.tactic;
        this.dom.aiTacticVal.className = `tactic-badge tactic-${this.aiTelemetry.tactic.toLowerCase()}`;
      }
      if (this.dom.aiTargetVal && this.aiTelemetry.target) {
        this.dom.aiTargetVal.textContent = `(${this.aiTelemetry.target.c ?? 0}, ${this.aiTelemetry.target.r ?? 0})`;
      }
      if (this.dom.aiPathVal) {
        this.dom.aiPathVal.textContent = `${this.aiTelemetry.pathLength ?? 0} steps`;
      }
      if (this.dom.aiExploredVal) {
        this.dom.aiExploredVal.textContent = `${this.aiTelemetry.exploredCount ?? 0} nodes`;
      }
      if (this.dom.aiPrunedVal) {
        this.dom.aiPrunedVal.textContent = `${this.aiTelemetry.prunedCount ?? 0} branches`;
      }
      if (this.dom.aiScoreVal) {
        const s = this.aiTelemetry.score ?? 0;
        this.dom.aiScoreVal.textContent = `${s > 0 ? '+' : ''}${s}`;
      }
    } catch (err) {
      console.warn('Error updating AI HUD:', err);
    }
  }

  triggerScreenShake(intensity = 8, duration = 0.35) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    try {
      if (this.state === 'PLAYING') {
        this.update(dt);
      }
      this.render();
    } catch (err) {
      console.error('Game loop error:', err);
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.handleGameOver('Time Expired!');
      return;
    }

    const currentSec = Math.ceil(this.timeLeft);
    if (currentSec <= 10 && currentSec < this.lastTickSecond) {
      sound.playWarningTick();
      this.lastTickSecond = currentSec;
    }

    if (this.empCooldown > 0) {
      this.empCooldown = Math.max(0, this.empCooldown - dt);
    }

    if (this.aiTelemetry.tactic === TACTIC.GUARD_EXIT) {
      this.exitCampTimer += dt;
      if (this.exitCampTimer > 2.5) {
        this.updateEnemyTactics();
      }
    } else {
      this.exitCampTimer = Math.max(0, this.exitCampTimer - dt * 0.5);
    }

    this.updatePlayerMovement(dt);
    this.updateEnemyMovement(dt);
    this.checkKeyPickups();
    this.checkExit();
    this.checkCollisions();
    this.updateTensionEffects();

    this.particles.update(dt);
    if (this.exit.unlocked) {
      const exitCenter = this.gridToScreen(this.exit.c, this.exit.r);
      this.particles.emitPortalVortex(exitCenter.x, exitCenter.y);
    }
    if (this.enemy.stunnedTimer > 0) {
      const enemyScreen = this.gridToScreen(this.enemy.renderX, this.enemy.renderY);
      this.particles.emitStunSparks(enemyScreen.x, enemyScreen.y);
    }
    if (this.hardMode && this.enemy && this.enemy.isMoving && this.enemy.stunnedTimer <= 0 && Math.random() < 0.3) {
      const enemyScreen = this.gridToScreen(this.enemy.renderX, this.enemy.renderY);
      this.particles.emitHitSparks(enemyScreen.x, enemyScreen.y, '#ef4444', 2);
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    this.updateHUD();
  }

  updateTensionEffects() {
    if (!this.player || !this.enemy) return;

    const dx = this.player.c - this.enemy.c;
    const dy = this.player.r - this.enemy.r;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 6.5 && this.enemy.stunnedTimer <= 0) {
      if (!this.isTensionActive) {
        this.isTensionActive = true;
        this.dom.tensionVignette.classList.add('active');
      }

      const now = performance.now();
      const interval = Math.max(450, dist * 130);
      if (now - this.lastHeartbeatTime > interval) {
        sound.playHeartbeat();
        this.lastHeartbeatTime = now;
      }
    } else {
      if (this.isTensionActive) {
        this.isTensionActive = false;
        this.dom.tensionVignette.classList.remove('active');
      }
    }
  }

  /**
   * Ultra-Responsive Arcade Movement Engine:
   * 1. Priority 1: Buffered tap within 500ms (never drops fast key taps).
   * 2. Priority 2: Currently held key / touch button.
   * 3. Priority 3: Retains continuous forward momentum through open corridors.
   * 4. Seamless overflow carryover (eliminates tile-boundary stutter at high speeds).
   */
  updatePlayerMovement(dt) {
    const p = this.player;
    if (!p) return;

    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    let currentSpeed = p.speed;
    if (p.speedBurstTimer > 0) {
      p.speedBurstTimer -= dt;
      currentSpeed = 7.4;
    }

    const now = performance.now();
    const isBufferValid = Boolean(this.turnBuffer && (now - this.turnBuffer.timestamp <= 500));
    const bufferedDir = isBufferValid ? this.turnBuffer.dir : null;
    const heldDir = this.getTopRequestedDirection();

    const canMoveInDir = (fromC, fromR, d) => {
      if (!d) return false;
      return this.maze.canMove(fromC, fromR, fromC + d.c, fromR + d.r);
    };

    if (p.isMoving) {
      p.moveProgress += currentSpeed * dt;

      // Early turn assistance when approaching next cell with a buffered turn
      if (p.moveProgress >= 0.80 && isBufferValid && bufferedDir) {
        const isPerpendicular = (bufferedDir.c !== p.lastDir.c || bufferedDir.r !== p.lastDir.r);
        if (isPerpendicular && canMoveInDir(p.targetC, p.targetR, bufferedDir)) {
          const overflow = p.moveProgress - 0.80;
          p.c = p.targetC;
          p.r = p.targetR;
          p.targetC = p.c + bufferedDir.c;
          p.targetR = p.r + bufferedDir.r;
          p.lastDir = bufferedDir;
          p.moveProgress = Math.min(0.35, overflow);
          p.isMoving = true;
          p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
          p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
          this.turnBuffer = null;
          sound.playMove();
        }
      }

      if (p.moveProgress >= 1.0) {
        const overflow = p.moveProgress - 1.0;
        p.c = p.targetC;
        p.r = p.targetR;
        p.moveProgress = Math.min(0.4, Math.max(0, overflow));

        // Priority 1: Buffered direction from recent tap
        let nextDir = null;
        if (bufferedDir && canMoveInDir(p.c, p.r, bufferedDir)) {
          nextDir = bufferedDir;
          this.turnBuffer = null; // Consumed
        } else if (heldDir && canMoveInDir(p.c, p.r, heldDir)) {
          // Priority 2: Currently held key
          nextDir = heldDir;
        } else if (p.lastDir && canMoveInDir(p.c, p.r, p.lastDir)) {
          // Priority 3: Keep sailing forward through the open lane
          nextDir = p.lastDir;
        }

        if (nextDir) {
          p.targetC = p.c + nextDir.c;
          p.targetR = p.r + nextDir.r;
          p.lastDir = nextDir;
          p.isMoving = true;
          p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
          p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
          sound.playMove();
        } else {
          // Hit a wall, stop cleanly at tile center
          p.renderX = p.c;
          p.renderY = p.r;
          p.moveProgress = 0;
          p.isMoving = false;
        }
      } else {
        p.renderX = p.c + (p.targetC - p.c) * p.moveProgress;
        p.renderY = p.r + (p.targetR - p.r) * p.moveProgress;
      }
    }

    // If player is idle / stopped, immediately start moving if buffered or held key is passable
    if (!p.isMoving) {
      let startDir = null;
      if (bufferedDir && canMoveInDir(p.c, p.r, bufferedDir)) {
        startDir = bufferedDir;
        this.turnBuffer = null;
      } else if (heldDir && canMoveInDir(p.c, p.r, heldDir)) {
        startDir = heldDir;
      }

      if (startDir) {
        p.targetC = p.c + startDir.c;
        p.targetR = p.r + startDir.r;
        p.lastDir = startDir;
        p.isMoving = true;
        p.moveProgress = 0;
        p.renderX = p.c;
        p.renderY = p.r;
        sound.playMove();
      }
    }
  }

  updateEnemyMovement(dt) {
    const e = this.enemy;

    if (e.stunnedTimer > 0) {
      e.stunnedTimer -= dt;
      return;
    }

    if (e.pauseAtIntersection > 0) {
      e.pauseAtIntersection -= dt;
      return;
    }

    const rethinkInterval = this.hardMode 
      ? 0.15 
      : (this.level <= 2 ? 0.8 : (this.level <= 5 ? 0.6 : 0.4));
    e.rethinkTimer += dt;
    if (e.rethinkTimer >= rethinkInterval) {
      e.rethinkTimer = 0;
      this.updateEnemyTactics();
    }

    if (e.isMoving) {
      e.moveProgress += e.speed * dt;
      if (e.moveProgress >= 1.0) {
        e.c = e.targetC;
        e.r = e.targetR;
        e.renderX = e.c;
        e.renderY = e.r;
        e.isMoving = false;
        e.moveProgress = 0;

        if (!this.hardMode && e.defaultPause > 0) {
          const passable = this.maze.getPassableNeighbors(e.c, e.r);
          if (passable.length > 2) {
            e.pauseAtIntersection = e.defaultPause;
          }
        }
      } else {
        e.renderX = e.c + (e.targetC - e.c) * e.moveProgress;
        e.renderY = e.r + (e.targetR - e.r) * e.moveProgress;
      }
    }

    if (!e.isMoving && this.enemyPlannedPath && this.enemyPlannedPath.length > 1) {
      const nextStep = this.enemyPlannedPath[1];

      if (this.exit.unlocked && nextStep.c === this.exit.c && nextStep.r === this.exit.r) {
        this.updateEnemyTactics();
        return;
      }

      if (this.maze.canMove(e.c, e.r, nextStep.c, nextStep.r)) {
        e.targetC = nextStep.c;
        e.targetR = nextStep.r;
        e.isMoving = true;
        e.moveProgress = 0;
        this.enemyPlannedPath.shift();
      } else {
        this.updateEnemyTactics();
      }
    }
  }

  checkKeyPickups() {
    for (const key of this.keys) {
      if (!key.collected && this.player.c === key.c && this.player.r === key.r) {
        key.collected = true;
        this.keysCollected++;
        this.score += 250;
        sound.playKeyPickup();

        this.empCooldown = 0;
        this.showToast('🧀 CHEESE COLLECTED! MOUSETRAP READY!');

        const screenPos = this.gridToScreen(key.c, key.r);
        this.particles.emitKeySparkles(screenPos.x, screenPos.y, '#fbbf24', 30);

        if (this.keysCollected >= this.totalKeys) {
          this.exit.unlocked = true;
          sound.playUnlockExit();
          const exitPos = this.gridToScreen(this.exit.c, this.exit.r);
          this.particles.emitKeySparkles(exitPos.x, exitPos.y, '#f59e0b', 40);
          this.showToast('🚪 MOUSE HOLE IS OPEN! SCURRY TO SAFETY!');
        }

        this.updateEnemyTactics();
      }
    }
  }

  checkExit() {
    if (this.exit.unlocked && this.player.c === this.exit.c && this.player.r === this.exit.r) {
      this.handleVictory();
    }
  }

  checkCollisions() {
    const p = this.player;
    const e = this.enemy;

    const dx = p.renderX - e.renderX;
    const dy = p.renderY - e.renderY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.65 && p.invulnerableTimer <= 0) {
      this.lives--;
      this.triggerScreenShake(12, 0.4);
      sound.playHit();

      const screenPos = this.gridToScreen(p.renderX, p.renderY);
      this.particles.emitHitSparks(screenPos.x, screenPos.y, '#f97316', 35);

      if (this.lives <= 0) {
        this.handleGameOver('Tom caught Jerry!');
        return;
      }

      p.invulnerableTimer = 2.4;
      e.stunnedTimer = 1.8;
      e.isMoving = false;
      e.renderX = e.c;
      e.renderY = e.r;
    }
  }

  handleGameOver(reason) {
    this.state = 'GAMEOVER';
    sound.playGameOver();
    this.dom.tensionVignette.classList.remove('active');
    document.getElementById('loss-reason').textContent = reason;
    this.dom.levelLossText.textContent = `Level ${this.level}`;
    this.dom.keysFoundLoss.textContent = `${this.keysCollected} / ${this.totalKeys} Cheeses`;
    this.dom.finalScoreLoss.textContent = this.score;
    this.dom.gameOverModal.classList.remove('hidden');
    setTimeout(() => {
      if (this.dom.btnRestartLoss) this.dom.btnRestartLoss.focus();
    }, 50);
  }

  handleVictory() {
    this.state = 'VICTORY';
    sound.playVictory();
    this.dom.tensionVignette.classList.remove('active');

    const timeBonus = Math.floor(this.timeLeft * 50);
    const livesBonus = this.lives * 300;
    const levelClearBonus = this.level * 1000;
    let totalLevelScore = timeBonus + livesBonus + levelClearBonus;
    if (this.hardMode) {
      totalLevelScore = Math.floor(totalLevelScore * 1.5);
    }
    this.score += totalLevelScore;

    let rank = 'C LITTLE MOUSE';
    if (this.timeLeft >= 40 && this.lives === 3) rank = this.hardMode ? '🔥 S++ NIGHTMARE GOD' : 'S+ CHEESE MASTER';
    else if (this.timeLeft >= 28) rank = this.hardMode ? '🔥 S NIGHTMARE SURVIVOR' : 'S SLICK JERRY';
    else if (this.timeLeft >= 15) rank = this.hardMode ? '🔥 A SHADOW ESCAPEE' : 'A FAST PAWS';
    else if (this.timeLeft >= 5) rank = this.hardMode ? '🔥 B LUCKY SURVIVOR' : 'B ESCAPEE';

    this.dom.rankBadgeVal.textContent = rank;
    this.dom.timeBonusWin.textContent = `+${timeBonus} (${Math.floor(this.timeLeft)}s left)`;
    this.dom.livesBonusWin.textContent = `+${livesBonus} (${this.lives} lives)`;
    this.dom.finalScoreWin.textContent = this.score;
    this.dom.victoryModal.classList.remove('hidden');
    setTimeout(() => {
      if (this.dom.btnNextLevel) this.dom.btnNextLevel.focus();
    }, 50);
  }

  updateHUD() {
    const t = Math.max(0, this.timeLeft);
    const sec = Math.floor(t);
    const ms = Math.floor((t - sec) * 100);
    this.dom.timerVal.textContent = `${sec.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;

    const cfg = LEVEL_CONFIGS[this.level - 1] || LEVEL_CONFIGS[0];
    const pct = Math.max(0, Math.min(100, (this.timeLeft / cfg.time) * 100));
    this.dom.timerBar.style.width = `${pct}%`;
    if (this.timeLeft <= 10) {
      this.dom.timerBar.classList.add('critical');
    } else {
      this.dom.timerBar.classList.remove('critical');
    }

    this.dom.scoreVal.textContent = this.score;
    this.dom.levelVal.textContent = this.level;

    let heartsHtml = '';
    for (let i = 0; i < this.maxLives; i++) {
      const isLost = i >= this.lives;
      heartsHtml += `<svg class="life-icon ${isLost ? 'lost' : ''}" viewBox="0 0 24 24" title="Jerry Life">
        <circle cx="6" cy="7" r="4.5" fill="#fca5a5" stroke="#451a03" stroke-width="1.2"/>
        <circle cx="18" cy="7" r="4.5" fill="#fca5a5" stroke="#451a03" stroke-width="1.2"/>
        <ellipse cx="12" cy="14" rx="7" ry="6.5" fill="${isLost ? '#94a3b8' : '#e2e8f0'}" stroke="#451a03" stroke-width="1.5"/>
        <ellipse cx="12" cy="17.5" rx="1.8" ry="1.2" fill="#f43f5e"/>
        <circle cx="9.5" cy="13" r="1.2" fill="#1e293b"/>
        <circle cx="14.5" cy="13" r="1.2" fill="#1e293b"/>
      </svg>`;
    }
    this.dom.livesContainer.innerHTML = heartsHtml;

    let keysHtml = '';
    for (let i = 0; i < this.totalKeys; i++) {
      const isCollected = i < this.keysCollected;
      keysHtml += `<svg class="key-item-svg ${isCollected ? 'collected' : 'uncollected'}" viewBox="0 0 24 24" title="Swiss Cheese Wedge">
        <polygon points="3,13 20,6 21,17 4,21" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/>
        <polygon points="3,13 20,6 14,3 1,10" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="10" cy="8" r="1.5" fill="#f59e0b"/>
        <circle cx="15" cy="13" r="1.8" fill="#d97706"/>
        <circle cx="7" cy="16" r="1.2" fill="#d97706"/>
      </svg>`;
    }
    this.dom.keysContainer.innerHTML = keysHtml;

    if (this.empCooldown <= 0) {
      this.dom.btnEmpHud.disabled = false;
      this.dom.empStatusText.textContent = 'READY';
      if (this.dom.btnEmpMobile) this.dom.btnEmpMobile.disabled = false;
    } else {
      this.dom.btnEmpHud.disabled = true;
      this.dom.empStatusText.textContent = `${Math.ceil(this.empCooldown)}s`;
      if (this.dom.btnEmpMobile) this.dom.btnEmpMobile.disabled = true;
    }
  }

  gridToScreen(c, r) {
    return {
      x: (c + 0.5) * this.cellSize,
      y: (r + 0.5) * this.cellSize
    };
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    if (this.shakeDuration > 0) {
      const currentIntensity = this.shakeIntensity * (this.shakeDuration / 0.4);
      const shakeX = (Math.random() - 0.5) * currentIntensity * 2;
      const shakeY = (Math.random() - 0.5) * currentIntensity * 2;
      ctx.translate(shakeX, shakeY);
    }

    if (this.maze) {
      this.drawGardenMaze(ctx);

      if (this.aiVisionEnabled) {
        this.drawAiVisualization(ctx);
      }

      this.drawExit(ctx);
      this.drawKeys(ctx);
      this.drawPlayer(ctx);
      this.drawEnemy(ctx);
      this.particles.draw(ctx);
    }

    ctx.restore();
  }

  drawGardenMaze(ctx) {
    const isLight = this.currentTheme === 'light';
    const sz = this.cellSize;
    const cw = sz * 0.74; // Corridor clay trail width
    const rw = cw + sz * 0.16; // 3D hedge rim & dark border width

    // Color palette matching the user's reference illustration
    const grassGreen = isLight ? '#8da93c' : '#233d26';
    const darkBorder = isLight ? '#2c3d18' : '#0f1c11';
    const cliffShadow = isLight ? '#557220' : '#162b18';
    const dirtClay = isLight ? '#a57c5a' : '#5e432f';
    const breadcrumbColor = isLight ? '#7c573c' : '#412d20';

    // 1. Fill entire canvas with lush lawn grass
    ctx.fillStyle = grassGreen;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Helper to trace all open corridors
    const tracePassages = () => {
      ctx.beginPath();
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.maze.getCell(c, r);
          const cx = (c + 0.5) * sz;
          const cy = (r + 0.5) * sz;

          // Connect right
          if (!cell.walls.right && c + 1 < this.cols) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + sz, cy);
          }
          // Connect bottom
          if (!cell.walls.bottom && r + 1 < this.rows) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy + sz);
          }
          // Center dot ensures rounded dead ends and junctions
          ctx.moveTo(cx - 0.1, cy);
          ctx.lineTo(cx + 0.1, cy);
        }
      }
      ctx.stroke();
    };

    // 2. PASS 1: 3D Elevated Grass Cliff Drop Shadow (offset down by 3px)
    ctx.strokeStyle = cliffShadow;
    ctx.lineWidth = rw;
    ctx.save();
    ctx.translate(0, 3);
    tracePassages();
    ctx.restore();

    // 3. PASS 2: Dark outline along hedge corridor borders
    ctx.strokeStyle = darkBorder;
    ctx.lineWidth = rw;
    tracePassages();

    // 4. PASS 3: Warm earthy clay / dirt corridor trail
    ctx.strokeStyle = dirtClay;
    ctx.lineWidth = cw;
    tracePassages();

    // 5. PASS 4: Dashed cartoon breadcrumb trail down center of paths
    ctx.strokeStyle = breadcrumbColor;
    ctx.lineWidth = Math.max(2, sz * 0.08);
    ctx.setLineDash([sz * 0.12, sz * 0.12]);
    tracePassages();
    ctx.setLineDash([]);
    ctx.restore();

    // 6. PASS 5: Deterministic decorative daisies, grass tufts, and pebbles
    this.drawGardenDecorations(ctx, sz, isLight);
  }

  drawGardenDecorations(ctx, sz, isLight) {
    ctx.save();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.maze.getCell(c, r);
        const cellX = c * sz;
        const cellY = r * sz;
        const cx = (c + 0.5) * sz;
        const cy = (r + 0.5) * sz;

        // Coordinate hash for stable decoration positions across frames
        const hash = (((c * 73856093) ^ (r * 19349663)) >>> 0);

        // Daisies and grass on wall areas
        if (cell.walls.top) {
          if (hash % 4 === 0) {
            this.drawDaisy(ctx, cellX + sz * 0.5, cellY + sz * 0.08, sz * 0.14);
          } else if (hash % 3 === 0) {
            this.drawGrassTuft(ctx, cellX + sz * 0.38, cellY + sz * 0.1, sz * 0.1, isLight);
          }
        }

        if (cell.walls.left) {
          if ((hash >> 2) % 4 === 0) {
            this.drawDaisy(ctx, cellX + sz * 0.08, cellY + sz * 0.5, sz * 0.14);
          } else if ((hash >> 2) % 3 === 0) {
            this.drawGrassTuft(ctx, cellX + sz * 0.1, cellY + sz * 0.38, sz * 0.1, isLight);
          }
        }

        if (cell.walls.right && cell.walls.bottom) {
          if ((hash >> 4) % 3 === 0) {
            this.drawDaisy(ctx, cellX + sz * 0.88, cellY + sz * 0.88, sz * 0.14);
          } else {
            this.drawGrassTuft(ctx, cellX + sz * 0.86, cellY + sz * 0.86, sz * 0.1, isLight);
          }
        }

        // Small pebble on dirt path
        if ((hash >> 6) % 6 === 0) {
          ctx.fillStyle = isLight ? '#7c6858' : '#473a30';
          ctx.beginPath();
          const pOffX = ((hash % 5) - 2) * (sz * 0.05);
          const pOffY = (((hash >> 3) % 5) - 2) * (sz * 0.05);
          ctx.arc(cx + pOffX, cy + pOffY, sz * 0.045, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  drawDaisy(ctx, x, y, size) {
    const petalR = size * 0.34;
    const centerR = size * 0.28;
    ctx.save();
    ctx.translate(x, y);

    // 5 pure white petals with soft shadow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * (petalR * 0.85), Math.sin(angle) * (petalR * 0.85), petalR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden yellow center
    ctx.fillStyle = '#facc15';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGrassTuft(ctx, x, y, size, isLight) {
    ctx.save();
    ctx.strokeStyle = isLight ? '#476318' : '#142e1a';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y + size * 0.2);
    ctx.quadraticCurveTo(x - size * 0.35, y - size * 0.5, x - size * 0.5, y - size * 0.6);
    ctx.moveTo(x, y + size * 0.2);
    ctx.lineTo(x, y - size * 0.7);
    ctx.moveTo(x + size * 0.5, y + size * 0.2);
    ctx.quadraticCurveTo(x + size * 0.35, y - size * 0.5, x + size * 0.5, y - size * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  drawAiVisualization(ctx) {
    try {
      const sz = this.cellSize;

      if (this.aiTelemetry.exploredNodes && Array.isArray(this.aiTelemetry.exploredNodes)) {
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 1;

        for (const node of this.aiTelemetry.exploredNodes) {
          if (node && typeof node.c === 'number' && typeof node.r === 'number') {
            ctx.fillRect(node.c * sz + 2, node.r * sz + 2, sz - 4, sz - 4);
            ctx.strokeRect(node.c * sz + 2, node.r * sz + 2, sz - 4, sz - 4);
          }
        }
        ctx.restore();
      }

      if (this.aiTelemetry.activePath && Array.isArray(this.aiTelemetry.activePath) && this.aiTelemetry.activePath.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#f43f5e';
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.lineWidth = Math.max(2.5, sz * 0.1);
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        const first = this.gridToScreen(this.aiTelemetry.activePath[0].c, this.aiTelemetry.activePath[0].r);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.aiTelemetry.activePath.length; i++) {
          const pt = this.gridToScreen(this.aiTelemetry.activePath[i].c, this.aiTelemetry.activePath[i].r);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        for (const pt of this.aiTelemetry.activePath) {
          const scr = this.gridToScreen(pt.c, pt.r);
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (this.aiTelemetry.target && typeof this.aiTelemetry.target.c === 'number' && typeof this.aiTelemetry.target.r === 'number') {
        const tgt = this.gridToScreen(this.aiTelemetry.target.c, this.aiTelemetry.target.r);
        const t = performance.now() / 300;
        const pulse = Math.sin(t) * 3;

        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        const radius = sz * 0.42 + pulse;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const tacticName = this.aiTelemetry.tactic || 'CHASE';
        ctx.fillText(`TOM: ${tacticName}`, tgt.x, tgt.y - radius - 5);
        ctx.restore();
      }
    } catch (err) {
      console.warn('Error in drawAiVisualization:', err);
    }
  }

  drawExit(ctx) {
    const scr = this.gridToScreen(this.exit.c, this.exit.r);
    const sz = this.cellSize;
    const charSize = sz * 0.92;
    const now = performance.now() / 1000;

    ctx.save();
    ctx.translate(scr.x, scr.y);

    if (this.exit.unlocked) {
      // Warm welcoming beacon glow when all 3 cheeses are gathered
      const pulse = Math.sin(now * 4) * (sz * 0.08);
      const glowGrad = ctx.createRadialGradient(0, 0, sz * 0.1, 0, 0, sz * 0.55 + pulse);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.55 + pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.assets.mousehole && this.assets.mousehole.complete && this.assets.mousehole.naturalWidth > 0) {
      ctx.drawImage(this.assets.mousehole, -charSize / 2, -charSize / 2, charSize, charSize);
    } else {
      // Fallback mouse hole
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, charSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Padlock indicator if locked
    if (!this.exit.unlocked) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Golden cartoon lock
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.fillRect(-sz * 0.12, -sz * 0.04, sz * 0.24, sz * 0.2);
      ctx.strokeRect(-sz * 0.12, -sz * 0.04, sz * 0.24, sz * 0.2);

      ctx.beginPath();
      ctx.arc(0, -sz * 0.04, sz * 0.09, Math.PI, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawKeys(ctx) {
    const sz = this.cellSize;
    const charSize = sz * 0.74;
    const now = performance.now() / 1000;

    ctx.save();
    for (const key of this.keys) {
      if (key.collected) continue;

      const scr = this.gridToScreen(key.c, key.r);
      const bobY = Math.sin(now * 3.5 + key.pulseOffset) * (sz * 0.07);
      const pulseScale = 1 + Math.sin(now * 4 + key.pulseOffset) * 0.08;

      ctx.save();
      ctx.translate(scr.x, scr.y + bobY);
      ctx.scale(pulseScale, pulseScale);

      // Golden cheese halo glow
      const radGrad = ctx.createRadialGradient(0, 0, sz * 0.1, 0, 0, sz * 0.44);
      radGrad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      radGrad.addColorStop(0.6, 'rgba(217, 119, 6, 0.25)');
      radGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.44, 0, Math.PI * 2);
      ctx.fill();

      if (this.assets.cheese && this.assets.cheese.complete && this.assets.cheese.naturalWidth > 0) {
        ctx.drawImage(this.assets.cheese, -charSize / 2, -charSize / 2, charSize, charSize);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, charSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.player;
    const scr = this.gridToScreen(p.renderX, p.renderY);
    const sz = this.cellSize;
    const charSize = sz * 0.82;

    ctx.save();

    if (p.invulnerableTimer > 0) {
      const blink = Math.floor(performance.now() / 100) % 2;
      if (blink === 0) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 0.75;
    }

    // Cute running bob
    const bob = p.isMoving ? Math.sin(performance.now() * 0.02) * (sz * 0.035) : 0;
    ctx.translate(scr.x, scr.y + bob);

    // Directional tilt and horizontal flip
    let angle = 0;
    const dir = p.lastDir || { c: 0, r: 0 };
    if (dir.c > 0) angle = 0.12;
    else if (dir.c < 0) angle = -0.12;
    else if (dir.r > 0) angle = 0.06;
    else if (dir.r < 0) angle = -0.06;
    ctx.rotate(angle);

    if (dir.c < 0) {
      ctx.scale(-1, 1);
    }

    if (this.assets.jerry && this.assets.jerry.complete && this.assets.jerry.naturalWidth > 0) {
      ctx.drawImage(this.assets.jerry, -charSize / 2, -charSize / 2, charSize, charSize);
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.arc(0, 0, charSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEnemy(ctx) {
    const e = this.enemy;
    const scr = this.gridToScreen(e.renderX, e.renderY);
    const sz = this.cellSize;
    const charSize = sz * 0.88;
    const now = performance.now() / 1000;

    ctx.save();

    let shakeOffset = 0;
    if (e.stunnedTimer > 0) {
      shakeOffset = (Math.random() - 0.5) * 4;
      ctx.globalAlpha = 0.85;
    }

    ctx.translate(scr.x + shakeOffset, scr.y);

    // Fiery Predator Aura in Hard Mode!
    if (this.hardMode) {
      const pulse = Math.sin(now * 8) * (sz * 0.06);
      const fireGrad = ctx.createRadialGradient(0, 0, sz * 0.15, 0, 0, sz * 0.52 + pulse);
      fireGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
      fireGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
      fireGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.52 + pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.assets.tom && this.assets.tom.complete && this.assets.tom.naturalWidth > 0) {
      ctx.drawImage(this.assets.tom, -charSize / 2, -charSize / 2, charSize, charSize);
    } else {
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, charSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Classic Cartoon Dizzy Spinning Stars when Tom is stunned!
    if (e.stunnedTimer > 0) {
      const numStars = 4;
      const radiusX = charSize * 0.48;
      const radiusY = charSize * 0.22;
      const starSpeed = now * 7;

      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < numStars; i++) {
        const starAngle = starSpeed + (i * Math.PI * 2) / numStars;
        const sx = Math.cos(starAngle) * radiusX;
        const sy = -charSize * 0.45 + Math.sin(starAngle) * radiusY;

        this.drawStar(ctx, sx, sy, 5, sz * 0.08, sz * 0.038);
      }
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Instantiate engine when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
  });
}
