/**
 * A* Pathfinding Algorithm on the Maze Grid Graph.
 * Computes shortest path from start to goal and tracks all explored nodes
 * for real-time AI visualization.
 */

export class AStar {
  /**
   * Finds the shortest path between start and goal.
   * @param {Maze} maze - The maze grid instance
   * @param {{c: number, r: number}} start - Starting cell coordinates
   * @param {{c: number, r: number}} goal - Goal cell coordinates
   * @returns {{ path: Array<{c: number, r: number}>, exploredNodes: Array<{c: number, r: number}>, found: boolean }}
   */
  static findPath(maze, start, goal) {
    if (!start || !goal) {
      return { path: [], exploredNodes: [], found: false };
    }

    if (start.c === goal.c && start.r === goal.r) {
      return { path: [{ c: start.c, r: start.r }], exploredNodes: [{ c: start.c, r: start.r }], found: true };
    }

    const keyOf = (c, r) => `${c},${r}`;
    const manhattan = (c1, r1, c2, r2) => Math.abs(c1 - c2) + Math.abs(r1 - r2);

    const openSet = new Map();
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = new Map();
    const fScore = new Map();

    const startKey = keyOf(start.c, start.r);
    const goalKey = keyOf(goal.c, goal.r);

    gScore.set(startKey, 0);
    fScore.set(startKey, manhattan(start.c, start.r, goal.c, goal.r));
    openSet.set(startKey, { c: start.c, r: start.r, f: fScore.get(startKey) });

    const exploredNodes = [];

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentKey = null;
      let lowestF = Infinity;

      for (const [k, node] of openSet.entries()) {
        const f = fScore.get(k);
        if (f < lowestF) {
          lowestF = f;
          currentKey = k;
        }
      }

      const current = openSet.get(currentKey);
      openSet.delete(currentKey);
      closedSet.add(currentKey);
      exploredNodes.push({ c: current.c, r: current.r });

      // Reached goal?
      if (current.c === goal.c && current.r === goal.r) {
        // Reconstruct path
        const path = [];
        let curr = currentKey;
        while (curr) {
          const [sc, sr] = curr.split(',').map(Number);
          path.unshift({ c: sc, r: sr });
          curr = cameFrom.get(curr);
        }
        return { path, exploredNodes, found: true };
      }

      const neighbors = maze.getPassableNeighbors(current.c, current.r);
      for (const neighbor of neighbors) {
        const nKey = keyOf(neighbor.c, neighbor.r);
        if (closedSet.has(nKey)) continue;

        const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, currentKey);
          gScore.set(nKey, tentativeG);
          const f = tentativeG + manhattan(neighbor.c, neighbor.r, goal.c, goal.r);
          fScore.set(nKey, f);

          if (!openSet.has(nKey)) {
            openSet.set(nKey, { c: neighbor.c, r: neighbor.r, f });
          }
        }
      }
    }

    // No path found (isolated node)
    return { path: [], exploredNodes, found: false };
  }

  /**
   * Fast distance query using BFS/A* distance.
   */
  static getDistance(maze, start, goal) {
    const res = AStar.findPath(maze, start, goal);
    return res.found ? res.path.length - 1 : Infinity;
  }
}
