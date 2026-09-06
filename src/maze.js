/**
 * Procedural Maze Generator with High-Connectivity Braiding.
 * Ensures open, multi-way labyrinths with 3 to 4 open corridors at almost every step,
 * so the player is never trapped, never cornered, and can always dodge/loop around the AI.
 */

export class Maze {
  constructor(cols, rows, loopFactor = 0.55) {
    this.cols = cols;
    this.rows = rows;
    this.loopFactor = loopFactor;
    this.grid = [];
    this.initGrid();
    this.generateDFS();
    this.braidAndOpenMultiWays();
  }

  initGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          c,
          r,
          walls: {
            top: true,
            right: true,
            bottom: true,
            left: true
          },
          visited: false
        });
      }
      this.grid.push(row);
    }
  }

  getCell(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) {
      return null;
    }
    return this.grid[r][c];
  }

  generateDFS() {
    const stack = [];
    const startCell = this.getCell(0, 0);
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c].visited = false;
      }
    }
  }

  getUnvisitedNeighbors(cell) {
    const { c, r } = cell;
    const neighbors = [];

    const potential = [
      this.getCell(c, r - 1),
      this.getCell(c + 1, r),
      this.getCell(c, r + 1),
      this.getCell(c - 1, r)
    ];

    for (const n of potential) {
      if (n && !n.visited) {
        neighbors.push(n);
      }
    }
    return neighbors;
  }

  removeWallBetween(c1, c2) {
    const dc = c2.c - c1.c;
    const dr = c2.r - c1.r;

    if (dc === 1) {
      c1.walls.right = false;
      c2.walls.left = false;
    } else if (dc === -1) {
      c1.walls.left = false;
      c2.walls.right = false;
    } else if (dr === 1) {
      c1.walls.bottom = false;
      c2.walls.top = false;
    } else if (dr === -1) {
      c1.walls.top = false;
      c2.walls.bottom = false;
    }
  }

  /**
   * Braid the maze and ensure 3 to 4 open corridors throughout the maze:
   * 1. Completely eliminate dead ends (zero 1-way dead ends).
   * 2. Boost connectivity so almost every cell has 3 or 4 passable directions.
   * 3. Add extensive loop connections across all corridors.
   */
  braidAndOpenMultiWays() {
    // 1. Remove 100% of dead ends (cells with only 1 passable neighbor)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.getCell(c, r);
        let passable = this.getPassableNeighbors(c, r);

        while (passable.length < 2) {
          const closed = this.getClosedNeighbors(cell);
          if (closed.length === 0) break;
          const chosen = closed[Math.floor(Math.random() * closed.length)];
          this.removeWallBetween(cell, chosen);
          passable = this.getPassableNeighbors(c, r);
        }
      }
    }

    // 2. High-connectivity opening: ensure most cells have 3-4 open pathways!
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.getCell(c, r);
        let passable = this.getPassableNeighbors(c, r);

        // Maximum possible physical neighbors for this cell (corners have 2, edges 3, inner 4)
        const totalPossible = this.getAllAdjacentNeighbors(cell).length;
        const targetPassable = Math.min(totalPossible, 3); // Aim for at least 3 ways!

        if (passable.length < targetPassable && Math.random() < this.loopFactor) {
          const closed = this.getClosedNeighbors(cell);
          if (closed.length > 0) {
            const chosen = closed[Math.floor(Math.random() * closed.length)];
            this.removeWallBetween(cell, chosen);
          }
        }
      }
    }

    // 3. Additional random cross-connections
    for (let r = 1; r < this.rows - 1; r++) {
      for (let c = 1; c < this.cols - 1; c++) {
        if (Math.random() < 0.35) {
          const current = this.getCell(c, r);
          const closed = this.getClosedNeighbors(current);
          if (closed.length > 0) {
            const chosen = closed[Math.floor(Math.random() * closed.length)];
            this.removeWallBetween(current, chosen);
          }
        }
      }
    }
  }

  getAllAdjacentNeighbors(cell) {
    const { c, r } = cell;
    return [
      this.getCell(c, r - 1),
      this.getCell(c + 1, r),
      this.getCell(c, r + 1),
      this.getCell(c - 1, r)
    ].filter(n => n !== null);
  }

  getClosedNeighbors(cell) {
    const { c, r } = cell;
    const closed = [];
    if (cell.walls.top && r > 0) closed.push(this.getCell(c, r - 1));
    if (cell.walls.right && c < this.cols - 1) closed.push(this.getCell(c + 1, r));
    if (cell.walls.bottom && r < this.rows - 1) closed.push(this.getCell(c, r + 1));
    if (cell.walls.left && c > 0) closed.push(this.getCell(c - 1, r));
    return closed;
  }

  /**
   * Guarantees that key and exit cells have at least 3 distinct access corridors
   * so the player can always loop around or escape if the enemy approaches.
   */
  ensureMultiWayAccess(c, r, targetWays = 3) {
    const cell = this.getCell(c, r);
    if (!cell) return;

    let passable = this.getPassableNeighbors(c, r);
    const totalPossible = this.getAllAdjacentNeighbors(cell).length;
    const desired = Math.min(totalPossible, targetWays);

    while (passable.length < desired) {
      const closed = this.getClosedNeighbors(cell);
      if (closed.length === 0) break;
      const chosen = closed[Math.floor(Math.random() * closed.length)];
      this.removeWallBetween(cell, chosen);
      passable = this.getPassableNeighbors(c, r);
    }
  }

  // Returns valid passable adjacent neighbors (no wall in between)
  getPassableNeighbors(c, r) {
    const cell = this.getCell(c, r);
    if (!cell) return [];

    const neighbors = [];
    if (!cell.walls.top) {
      const top = this.getCell(c, r - 1);
      if (top) neighbors.push(top);
    }
    if (!cell.walls.right) {
      const right = this.getCell(c + 1, r);
      if (right) neighbors.push(right);
    }
    if (!cell.walls.bottom) {
      const bottom = this.getCell(c, r + 1);
      if (bottom) neighbors.push(bottom);
    }
    if (!cell.walls.left) {
      const left = this.getCell(c - 1, r);
      if (left) neighbors.push(left);
    }
    return neighbors;
  }

  // Check if movement from (c1, r1) to (c2, r2) is unobstructed
  canMove(c1, r1, c2, r2) {
    const dc = c2 - c1;
    const dr = r2 - r1;
    const cell = this.getCell(c1, r1);
    if (!cell) return false;

    if (dc === 1 && dr === 0) return !cell.walls.right;
    if (dc === -1 && dr === 0) return !cell.walls.left;
    if (dc === 0 && dr === 1) return !cell.walls.bottom;
    if (dc === 0 && dr === -1) return !cell.walls.top;
    return false;
  }
}
