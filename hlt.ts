export const STILL = 0
export const NORTH = 1
export const EAST = 2
export const SOUTH = 3
export const WEST = 4

export type Direction =
  | typeof STILL
  | typeof NORTH
  | typeof EAST
  | typeof SOUTH
  | typeof WEST

export const DIRECTIONS = [STILL, NORTH, EAST, SOUTH, WEST]
export const CARDINALS = [NORTH, EAST, SOUTH, WEST]

export class Location {
  constructor(public x = 0, public y = 0) {}
}

export class Site {
  constructor(public owner = 0, public strength = 0, public production = 0) {}
}

export class Move {
  constructor(public loc = new Location(), public direction = STILL) {}
}

export class GameMap {
  public contents: Array<Site> = []

  constructor(public width = 0, public height = 0, public numberOfPlayers = 0) {
    this.contents = []

    for (let y = 0; y < this.height; y++) {
      const row = []
      for (let x = 0; x < this.width; x++) {
        row.push(new Site(0, 0, 0))
      }
      this.contents.push(row)
    }
  }

  inBounds(l) {
    return l.x >= 0 && l.x < this.width && l.y >= 0 && l.y < this.height
  }

  getDistance(l1, l2) {
    let dx = Math.abs(l1.x - l2.x)
    let dy = Math.abs(l1.y - l2.y)

    if (dx > this.width / 2) {
      dx = this.width - dx
    }

    if (dy > this.height / 2) {
      dy = this.height - dy
    }

    return dx + dy
  }

  getAngle(l1, l2) {
    let dx = l2.x - l1.x
    let dy = l2.y - l1.y

    if (dx > this.width - dx) {
      dx -= this.width
    } else if (-dx > this.width + dx) {
      dx += this.width
    }

    if (dy > this.height - dy) {
      dy -= this.height
    } else if (-dy > this.height + dy) {
      dy += this.height
    }

    return Math.atan2(dy, dx)
  }

  getLocation(loc, direction) {
    let {x, y} = loc
    if (direction === STILL) {
      // nothing
    } else if (direction === NORTH) {
      y -= 1
    } else if (direction === EAST) {
      x += 1
    } else if (direction === SOUTH) {
      y += 1
    } else if (direction === WEST) {
      x -= 1
    }

    if (x < 0) {
      x = this.width - 1
    } else {
      x %= this.width
    }

    if (y < 0) {
      y = this.height - 1
    } else {
      y %= this.height
    }

    return {x, y}
  }

  getSite(l: Location, direction = STILL): Site {
    const {x, y} = this.getLocation(l, direction)
    return this.contents[y][x]
  }
}
