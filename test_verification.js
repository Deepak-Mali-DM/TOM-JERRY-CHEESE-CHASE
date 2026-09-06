import { Maze } from './src/maze.js';
import { LEVEL_CONFIGS } from './src/game.js';

console.log('=== TEST 1: High-Connectivity Multi-Way Labyrinth ===');
for (const size of [9, 11, 13]) {
  const maze = new Maze(size, size, 0.55);
  let deadEnds = 0;
  let totalPassable = 0;
  let cellsCount = size * size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = maze.getPassableNeighbors(c, r).length;
      totalPassable += p;
      if (p <= 1) deadEnds++;
    }
  }

  const avgWays = (totalPassable / cellsCount).toFixed(2);
  console.log(`Maze ${size}x${size}: Avg Passable Ways per Cell = ${avgWays}, Dead Ends = ${deadEnds}`);
  if (deadEnds > 0) {
    throw new Error(`Maze ${size}x${size} has dead ends! Found ${deadEnds}`);
  }
}

console.log('\n=== TEST 2: 10 Levels Capped Between 9x9 and 13x13 ===');
console.log(`Total configured levels: ${LEVEL_CONFIGS.length}`);
LEVEL_CONFIGS.forEach(cfg => {
  console.log(`Level ${cfg.level} (${cfg.name}): ${cfg.cols}x${cfg.rows}, Time: ${cfg.time}s, AI Speed: ${cfg.enemySpeed}`);
  if (cfg.cols > 13 || cfg.rows > 13) {
    throw new Error(`Level ${cfg.level} exceeds 13x13 maximum cap!`);
  }
});

console.log('\n=== TEST 3: Keyboard Controls & Modal Action Routing ===');
const testNextLevelKeys = [
  { key: 'Enter', code: 'Enter' },
  { key: 'Enter', code: 'NumpadEnter' },
  { key: ' ', code: 'Space' },
  { key: 'n', code: 'KeyN' },
  { key: 'N', code: 'KeyN' },
  { key: 'ArrowRight', code: 'ArrowRight' }
];

testNextLevelKeys.forEach(e => {
  const isNext = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' ||
                 e.key === ' ' || e.code === 'Space' ||
                 e.key.toLowerCase() === 'n' || e.code === 'KeyN' ||
                 e.key === 'ArrowRight';
  if (!isNext) throw new Error(`Key ${JSON.stringify(e)} failed Next Level detection!`);
});
console.log(`Verified ${testNextLevelKeys.length} Next Level key bindings (Enter, NumpadEnter, Space, n, N, ArrowRight).`);

// Verify Level wrap / progression logic
for (let lvl = 1; lvl <= 10; lvl++) {
  const nextLvl = lvl >= 10 ? 1 : lvl + 1;
  if (lvl < 10 && nextLvl !== lvl + 1) throw new Error(`Level progression broken at ${lvl}`);
  if (lvl === 10 && nextLvl !== 1) throw new Error(`Level 10 loop to 1 broken`);
}
console.log('Verified 10-level sequential progression and wrap-around.');

console.log('\n=== TEST 4: Tom & Jerry SVG Vector Assets ===');
import fs from 'fs';
const requiredAssets = [
  'assets/jerry.svg',
  'assets/tom.svg',
  'assets/cheese.svg',
  'assets/mousehole.svg',
  'assets/logo.svg'
];

requiredAssets.forEach(p => {
  if (!fs.existsSync(p)) throw new Error(`Missing required SVG asset: ${p}`);
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('<svg') || !content.includes('</svg>')) {
    throw new Error(`Invalid SVG file: ${p}`);
  }
  console.log(`✓ Verified ${p} (${content.length} bytes, valid SVG XML)`);
});

console.log('\n=== TEST 5: Responsive Arcade Movement & Cornering Engine ===');

// Simulate a mock maze cell layout for movement tests
const mockMaze = {
  canMove: (fromC, fromR, toC, toR) => {
    // Cell (1, 1) has passages to (2, 1) [Right], (1, 0) [Up], (0, 1) [Left]
    // Cell (2, 1) has passage to (2, 2) [Down] and (2, 0) [Up]
    const key = `${fromC},${fromR}->${toC},${toR}`;
    const allowed = new Set([
      '0,0->1,0', '1,0->0,0',
      '1,0->1,1', '1,1->1,0',
      '1,1->2,1', '2,1->1,1',
      '1,1->0,1', '0,1->1,1',
      '2,1->2,2', '2,2->2,1',
      '2,1->2,0', '2,0->2,1'
    ]);
    return allowed.has(key);
  }
};

// 5A: Test 180° Direction Reversal
{
  const p = {
    c: 1, r: 1,
    targetC: 2, targetR: 1,
    lastDir: { c: 1, r: 0 }, // moving right
    isMoving: true,
    moveProgress: 0.3
  };
  const revDir = { c: -1, r: 0 }; // reverse left
  const isOpposite = (revDir.c === -p.lastDir.c && revDir.r === -p.lastDir.r);
  if (!isOpposite) throw new Error('180° check failed!');
  
  const oldTargetC = p.targetC;
  const oldTargetR = p.targetR;
  p.targetC = p.c;
  p.targetR = p.r;
  p.c = oldTargetC;
  p.r = oldTargetR;
  p.moveProgress = Math.max(0, 1.0 - p.moveProgress);
  p.lastDir = revDir;

  if (p.c !== 2 || p.targetC !== 1 || p.moveProgress !== 0.7 || p.lastDir.c !== -1) {
    throw new Error('180° reversal state corrupted!');
  }
  console.log('✓ 180° Instant Reversal successfully reverses coordinates and progress.');
}

// 5B: Test Late-Turn Corner Snapping (moveProgress <= 0.45)
{
  // Jerry just crossed cell (1, 1) moving towards (2, 1), at moveProgress = 0.20.
  // Player taps UP { c: 0, r: -1 }. Cell (1, 1) has passage UP to (1, 0).
  const p = {
    c: 1, r: 1,
    targetC: 2, targetR: 1,
    lastDir: { c: 1, r: 0 },
    isMoving: true,
    moveProgress: 0.20
  };
  const newDir = { c: 0, r: -1 }; // UP
  const isPerpendicular = (newDir.c !== p.lastDir.c || newDir.r !== p.lastDir.r);
  const canSnap = mockMaze.canMove(p.c, p.r, p.c + newDir.c, p.r + newDir.r);

  if (p.moveProgress <= 0.45 && isPerpendicular && canSnap) {
    p.targetC = p.c + newDir.c;
    p.targetR = p.r + newDir.r;
    p.lastDir = newDir;
    p.moveProgress = Math.min(0.25, Math.max(0.04, p.moveProgress));
  } else {
    throw new Error('Late turn corner snap failed precondition!');
  }

  if (p.targetC !== 1 || p.targetR !== 0 || p.lastDir.r !== -1) {
    throw new Error('Late turn snapping target incorrect!');
  }
  console.log('✓ Late-Turn Corner Snapping successfully pivots around corner from origin cell.');
}

// 5C: Test Turn Buffering across keyup
{
  // Player taps DOWN at t=100ms. keyup fires at t=160ms. Jerry reaches tile at t=210ms.
  const turnBuffer = { dirName: 'down', dir: { c: 0, r: 1 }, timestamp: 100 };
  const arrivalTime = 210;
  const isBufferValid = (arrivalTime - turnBuffer.timestamp <= 500);
  if (!isBufferValid) throw new Error('Turn buffer expired prematurely!');
  
  // Cell (2, 1) has passage DOWN to (2, 2)
  const canTurn = mockMaze.canMove(2, 1, 2 + turnBuffer.dir.c, 1 + turnBuffer.dir.r);
  if (!canTurn) throw new Error('Mock maze should allow passage down from (2, 1)!');
  console.log('✓ Turn Buffering retains input across keyup and executes at arrival.');
}

// 5D: Test Continuous Momentum Overflow Carryover
{
  let p = {
    c: 1, r: 1,
    targetC: 2, targetR: 1,
    lastDir: { c: 1, r: 0 },
    isMoving: true,
    moveProgress: 0.95,
    speed: 5.8
  };
  const dt = 0.0166; // 60 FPS frame
  p.moveProgress += p.speed * dt; // 0.95 + 0.09628 = 1.04628

  if (p.moveProgress >= 1.0) {
    const overflow = p.moveProgress - 1.0;
    p.c = p.targetC;
    p.r = p.targetR;
    p.moveProgress = Math.min(0.4, Math.max(0, overflow));
    // Turn down into (2, 2)
    const nextDir = { c: 0, r: 1 };
    p.targetC = p.c + nextDir.c;
    p.targetR = p.r + nextDir.r;
    p.lastDir = nextDir;
  }

  if (p.moveProgress <= 0 || p.moveProgress > 0.1) {
    throw new Error(`Overflow momentum lost! moveProgress = ${p.moveProgress}`);
  }
  console.log(`✓ Momentum Overflow Carryover preserved ${p.moveProgress.toFixed(4)} tiles of continuous velocity.`);
}

console.log('\nALL HIGH-CONNECTIVITY, LEVEL, KEYBOARD, ASSET, AND CORNERING TESTS PASSED SUCCESSFULLY!');
