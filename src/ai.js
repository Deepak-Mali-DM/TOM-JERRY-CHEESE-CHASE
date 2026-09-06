/**
 * Minimax with Alpha-Beta Pruning for Enemy Tactical Decisions.
 *
 * Chooses among high-level tactics:
 * 1. CHASE: Directly pursue the player's current position.
 * 2. INTERCEPT: Predict player's route towards nearest key/exit and cut them off.
 * 3. GUARD_EXIT: Position at or choke the exit portal to block victory.
 * 4. GUARD_KEY: Guard the most vulnerable uncollected key to stall objective completion.
 */

import { AStar } from './pathfinding.js';

export const TACTIC = {
  CHASE: 'CHASE',
  INTERCEPT: 'INTERCEPT',
  GUARD_EXIT: 'GUARD_EXIT',
  GUARD_KEY: 'GUARD_KEY'
};

export class TacticalAI {
  /**
   * Decide the best tactic using Minimax with Alpha-Beta pruning, with level scaling
   * and exit camping prevention.
   */
  static decideTactic(maze, enemyPos, player, keys, exitPos, timeLeft, level = 1, exitCampTimer = 0, maxDepth = 3) {
    const uncollectedKeys = keys.filter(k => !k.collected);
    const playerHasAllKeys = uncollectedKeys.length === 0;

    const stats = {
      nodesEvaluated: 0,
      prunedBranches: 0,
      depth: maxDepth,
      tacticsEvaluated: []
    };

    // LEVEL 1: Easy Mode - Enemy uses gentle chase with no aggressive intercept or camping
    if (level === 1) {
      stats.nodesEvaluated = 1;
      return {
        tactic: TACTIC.CHASE,
        target: { c: player.c, r: player.r },
        score: 100,
        stats
      };
    }

    // 1. Generate candidate tactical actions for Enemy (Max player)
    const candidateTactics = this.generateCandidateTactics(
      maze,
      enemyPos,
      player,
      uncollectedKeys,
      exitPos,
      playerHasAllKeys,
      exitCampTimer,
      level
    );

    let bestScore = -Infinity;
    let bestTactic = candidateTactics[0]?.tactic || TACTIC.CHASE;
    let bestTarget = candidateTactics[0]?.target || { c: player.c, r: player.r };

    let alpha = -Infinity;
    const beta = Infinity;

    for (const candidate of candidateTactics) {
      // Simulate multi-step lookahead towards the tactical target
      const simEnemy = this.simulateStepsTowards(maze, enemyPos, candidate.target, 2);

      let score = this.minimax(
        maze,
        simEnemy,
        { c: player.c, r: player.r },
        uncollectedKeys,
        exitPos,
        timeLeft,
        maxDepth - 1,
        false, // Next turn is Min (Player)
        alpha,
        beta,
        stats
      );

      // Add tactical posture bias based on macro game state & anti-camping rules
      score += this.getTacticalBias(candidate, enemyPos, player, uncollectedKeys, exitPos, timeLeft, exitCampTimer, level);

      stats.tacticsEvaluated.push({
        tactic: candidate.tactic,
        target: candidate.target,
        score: Math.round(score)
      });

      if (score > bestScore) {
        bestScore = score;
        bestTactic = candidate.tactic;
        bestTarget = candidate.target;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) {
        stats.prunedBranches++;
        break; // Alpha-beta cutoff at root
      }
    }

    return {
      tactic: bestTactic,
      target: bestTarget,
      score: Math.round(bestScore),
      stats
    };
  }

  /**
   * Tactical bias adjustment with anti-camping rules.
   */
  static getTacticalBias(candidate, enemyPos, player, uncollectedKeys, exitPos, timeLeft, exitCampTimer, level) {
    let bias = 0;
    const distToPlayer = Math.abs(enemyPos.c - player.c) + Math.abs(enemyPos.r - player.r);
    const distToExit = Math.abs(enemyPos.c - exitPos.c) + Math.abs(enemyPos.r - exitPos.r);
    const playerDistToExit = Math.abs(player.c - exitPos.c) + Math.abs(player.r - exitPos.r);

    switch (candidate.tactic) {
      case TACTIC.CHASE:
        // Always viable when close
        if (distToPlayer <= 5) {
          bias += (6 - distToPlayer) * 70;
        }
        // If enemy was camping the exit, strongly incentivize switching to Chase to break away!
        if (exitCampTimer > 2.0) {
          bias += 800;
        }
        break;

      case TACTIC.INTERCEPT:
        if (level >= 3 && distToPlayer > 3 && distToPlayer < 12) {
          bias += 160;
        } else if (level === 2) {
          bias += 60; // Mild intercept on level 2
        }
        break;

      case TACTIC.GUARD_EXIT:
        // Anti-camping rule: If enemy has been guarding the exit for more than 2.5 seconds,
        // penalize heavily so enemy leaves the gate open for the player!
        if (exitCampTimer > 2.5) {
          bias -= 3500;
          break;
        }

        if (uncollectedKeys.length === 0) {
          bias += 700;
          if (distToExit < playerDistToExit) {
            bias += 300;
          }
        } else if (uncollectedKeys.length === 1 && level >= 3) {
          bias += 150;
        } else {
          bias -= 300;
        }
        break;

      case TACTIC.GUARD_KEY:
        if (uncollectedKeys.length > 0) {
          const keyTarget = candidate.target;
          const playerDistToKey = Math.abs(player.c - keyTarget.c) + Math.abs(player.r - keyTarget.r);
          const enemyDistToKey = Math.abs(enemyPos.c - keyTarget.c) + Math.abs(enemyPos.r - keyTarget.r);

          if (playerDistToKey < 5 && enemyDistToKey <= playerDistToKey + 1) {
            bias += 250;
          }
        }
        break;
    }

    return bias;
  }

  /**
   * Simulates N steps towards target for lookahead.
   */
  static simulateStepsTowards(maze, fromPos, targetPos, steps = 1) {
    const pathRes = AStar.findPath(maze, fromPos, targetPos);
    if (pathRes.found && pathRes.path.length > 1) {
      const idx = Math.min(steps, pathRes.path.length - 1);
      return { c: pathRes.path[idx].c, r: pathRes.path[idx].r };
    }
    return { c: fromPos.c, r: fromPos.r };
  }

  /**
   * Generates candidate tactical actions and their target destinations.
   */
  static generateCandidateTactics(maze, enemyPos, player, uncollectedKeys, exitPos, playerHasAllKeys, exitCampTimer, level) {
    const candidates = [];

    // Tactic 1: Direct Chase
    candidates.push({
      tactic: TACTIC.CHASE,
      target: { c: player.c, r: player.r },
      description: 'Hunt player directly'
    });

    // Tactic 2: Intercept
    let primaryObjective = exitPos;
    if (!playerHasAllKeys && uncollectedKeys.length > 0) {
      let minDist = Infinity;
      for (const k of uncollectedKeys) {
        const d = Math.abs(player.c - k.c) + Math.abs(player.r - k.r);
        if (d < minDist) {
          minDist = d;
          primaryObjective = k;
        }
      }
    }

    const playerToObjPath = AStar.findPath(maze, { c: player.c, r: player.r }, primaryObjective);
    if (playerToObjPath.found && playerToObjPath.path.length > 2) {
      const interceptIndex = Math.min(3, Math.floor(playerToObjPath.path.length / 2));
      const interceptCell = playerToObjPath.path[interceptIndex];
      candidates.push({
        tactic: TACTIC.INTERCEPT,
        target: { c: interceptCell.c, r: interceptCell.r },
        description: 'Ambush player path'
      });
    } else {
      const pDir = player.lastDir || { c: 0, r: 0 };
      const aheadC = Math.max(0, Math.min(maze.cols - 1, player.c + pDir.c * 2));
      const aheadR = Math.max(0, Math.min(maze.rows - 1, player.r + pDir.r * 2));
      candidates.push({
        tactic: TACTIC.INTERCEPT,
        target: { c: aheadC, r: aheadR },
        description: 'Cut off momentum'
      });
    }

    // Tactic 3: Guard Exit (Outer perimeter patrol - never sits on the exit tile itself!)
    // Pick an adjacent or perimeter cell 2 steps away so the exit is never blocked
    if (exitCampTimer <= 2.5) {
      const exitNeighbors = maze.getPassableNeighbors(exitPos.c, exitPos.r);
      const patrolCell = exitNeighbors.length > 0 ? exitNeighbors[0] : exitPos;
      candidates.push({
        tactic: TACTIC.GUARD_EXIT,
        target: { c: patrolCell.c, r: patrolCell.r },
        description: 'Patrol exit perimeter'
      });
    }

    // Tactic 4: Guard Keys
    if (!playerHasAllKeys && uncollectedKeys.length > 0) {
      let targetKey = uncollectedKeys[0];
      let minKeyDist = Infinity;
      for (const k of uncollectedKeys) {
        const d = Math.abs(player.c - k.c) + Math.abs(player.r - k.r);
        if (d < minKeyDist) {
          minKeyDist = d;
          targetKey = k;
        }
      }
      candidates.push({
        tactic: TACTIC.GUARD_KEY,
        target: { c: targetKey.c, r: targetKey.r },
        description: `Protect key at (${targetKey.c}, ${targetKey.r})`
      });
    }

    return candidates;
  }

  /**
   * Minimax recursive evaluation with Alpha-Beta pruning.
   */
  static minimax(maze, enemyPos, playerPos, uncollectedKeys, exitPos, timeLeft, depth, isMax, alpha, beta, stats) {
    stats.nodesEvaluated++;

    // Terminal state or depth limit reached
    const distToPlayer = Math.abs(enemyPos.c - playerPos.c) + Math.abs(enemyPos.r - playerPos.r);
    const playerAtExit = playerPos.c === exitPos.c && playerPos.r === exitPos.r;
    const playerHasAllKeys = uncollectedKeys.length === 0;

    if (depth <= 0 || distToPlayer === 0 || (playerAtExit && playerHasAllKeys)) {
      return this.evaluateState(enemyPos, playerPos, uncollectedKeys, exitPos, timeLeft);
    }

    if (isMax) {
      // Enemy Turn (Maximizing utility)
      let maxEval = -Infinity;
      const neighbors = maze.getPassableNeighbors(enemyPos.c, enemyPos.r);

      for (const n of neighbors) {
        const ev = this.minimax(
          maze,
          { c: n.c, r: n.r },
          playerPos,
          uncollectedKeys,
          exitPos,
          timeLeft,
          depth - 1,
          false,
          alpha,
          beta,
          stats
        );
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) {
          stats.prunedBranches++;
          break; // Beta cut-off
        }
      }
      return maxEval;
    } else {
      // Player Turn (Minimizing enemy utility / Maximizing player utility)
      let minEval = Infinity;
      const neighbors = maze.getPassableNeighbors(playerPos.c, playerPos.r);

      for (const n of neighbors) {
        // Check if player would collect a key at node n
        const remainingAfterMove = uncollectedKeys.filter(k => !(k.c === n.c && k.r === n.r));

        const ev = this.minimax(
          maze,
          enemyPos,
          { c: n.c, r: n.r },
          remainingAfterMove,
          exitPos,
          timeLeft,
          depth - 1,
          true,
          alpha,
          beta,
          stats
        );
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) {
          stats.prunedBranches++;
          break; // Alpha cut-off
        }
      }
      return minEval;
    }
  }

  /**
   * Utility Evaluation Function (from Enemy perspective: Higher is better for Enemy).
   */
  static evaluateState(enemyPos, playerPos, uncollectedKeys, exitPos, timeLeft) {
    const distToPlayer = Math.abs(enemyPos.c - playerPos.c) + Math.abs(enemyPos.r - playerPos.r);
    const playerDistToExit = Math.abs(playerPos.c - exitPos.c) + Math.abs(playerPos.r - exitPos.r);
    const enemyDistToExit = Math.abs(enemyPos.c - exitPos.c) + Math.abs(enemyPos.r - exitPos.r);

    // 1. Capture is the ultimate win condition for enemy
    if (distToPlayer === 0) {
      return 10000;
    }

    // 2. Player escaping with all keys is disaster for enemy
    const playerHasAllKeys = uncollectedKeys.length === 0;
    if (playerHasAllKeys && playerDistToExit === 0) {
      return -10000;
    }

    let score = 0;

    // Proximity to player: Closer is better for enemy
    score -= distToPlayer * 20;

    // Remaining keys: Each uncollected key is valuable for enemy
    score += uncollectedKeys.length * 300;

    if (uncollectedKeys.length > 0) {
      // Find player distance to closest key
      let minPlayerKeyDist = Infinity;
      let minEnemyKeyDist = Infinity;
      for (const k of uncollectedKeys) {
        const pd = Math.abs(playerPos.c - k.c) + Math.abs(playerPos.r - k.r);
        const ed = Math.abs(enemyPos.c - k.c) + Math.abs(enemyPos.r - k.r);
        if (pd < minPlayerKeyDist) minPlayerKeyDist = pd;
        if (ed < minEnemyKeyDist) minEnemyKeyDist = ed;
      }
      // If player is far from keys, enemy benefits
      score += minPlayerKeyDist * 15;
      // If enemy is close to keys, enemy can defend
      score -= minEnemyKeyDist * 5;
    } else {
      // All keys collected! Player rushing exit!
      // Huge urgency to get between player and exit
      score -= playerDistToExit * 40; // Enemy wants player far from exit
      score -= enemyDistToExit * 25;  // Enemy wants to be at exit
      if (enemyDistToExit < playerDistToExit) {
        score += 500; // Enemy has established defensive cutoff
      }
    }

    // Time factor: Low time favors enemy (survival/stalling)
    if (timeLeft < 20) {
      score += (20 - timeLeft) * 10;
    }

    return score;
  }

  /**
   * Helper to simulate one step of movement towards target for lookahead.
   */
  static simulateStepTowards(maze, fromPos, targetPos) {
    const pathRes = AStar.findPath(maze, fromPos, targetPos);
    if (pathRes.found && pathRes.path.length > 1) {
      return { c: pathRes.path[1].c, r: pathRes.path[1].r };
    }
    return { c: fromPos.c, r: fromPos.r };
  }
}
