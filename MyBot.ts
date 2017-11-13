'use strict'

import {
  Move,
  NORTH,
  WEST,
  EAST,
  SOUTH,
  STILL,
  GameMap,
  Site,
  Location,
  Direction
} from './hlt'

import {Networking} from './networking'
import {writeFileSync} from 'fs'

const network = new Networking('McBot XII')

network.on('map', (gameMap: GameMap, id) => {
  const mapSize = Math.max(gameMap.width, gameMap.height)

  // simple: 0 ... 2
  function scoreLocation(
    loc: Location,
    site: Site,
    distance: number,
    simple = false
  ) {
    // 0 ... mapSize
    const distanceScore = simple ? 0 : mapSize - distance
    // 0 ... 4
    let attackScore = 0
    if (!simple) {
      attackScore = getOverkillTargets(loc).length
    }
    // 0.00390625 ... 17
    const siteScore = site.production / (site.strength + 1)
    // 0.00390625 ... 1
    const normalizedSiteScore = siteScore * (1 / 17)

    // 0 .. 1
    let neighbourScore = 0
    if (!simple) {
      for (const [dir, site] of getNeighbours(loc)) {
        neighbourScore +=
          scoreLocation(offsetLocation(loc, 1, dir), site, 1, true) / 8
      }
    }

    return (
      distanceScore +
      attackScore * 0.1 +
      normalizedSiteScore * 2 +
      neighbourScore * 0.9
    )
  }

  function getPrefferedDirection(loc) {
    const locations: Array<[Direction, number]> = []

    for (let direction = 1; direction < 5; direction++) {
      for (let radius = 1; radius < mapSize; radius++) {
        const location = offsetLocation(loc, radius, direction as Direction)
        const site = gameMap.getSite(location)

        if (site.owner !== id) {
          const score = scoreLocation(location, site, radius)
          // writeFileSync(
          //   'log.out',
          //   `dir: ${direction}, distance: ${radius}, owner: ${site.owner}, strength: ${site.strength}, production: ${site.production}, score: ${score}\n`,
          //   {encoding: 'utf-8', flag: 'a'}
          // )
          locations.push([direction as Direction, score])
          break
        }
      }
    }

    if (locations.length === 0) return STILL

    return locations.sort((a, b) => b[1] - a[1])[0][0]
  }

  // function directionToNearestEdge(loc) {
  //   for (let radius = 1; radius < 30; radius++) {
  //     for (let direction = 1; direction < 5; direction++) {
  //       let currentLocationOwner = gameMap.getSite(
  //         offsetLocation(loc, radius, direction as Direction)
  //       ).owner

  //       if (currentLocationOwner !== id) {
  //         return direction
  //       }
  //     }
  //   }

  //   return STILL
  // }

  function offsetLocation(
    loc: Location,
    distance: number,
    direction: Direction
  ) {
    switch (direction) {
      case NORTH:
        return {
          x: loc.x,
          y: loc.y - distance
        }
      case SOUTH:
        return {
          x: loc.x,
          y: loc.y + distance
        }
      case WEST:
        return {
          x: loc.x - distance,
          y: loc.y
        }
      case EAST:
        return {
          x: loc.x + distance,
          y: loc.y
        }
      default:
        return loc
    }
  }

  function getNeighbours(loc: Location) {
    return [
      [NORTH, gameMap.getSite(loc, NORTH)],
      [WEST, gameMap.getSite(loc, WEST)],
      [EAST, gameMap.getSite(loc, EAST)],
      [SOUTH, gameMap.getSite(loc, SOUTH)]
    ] as [
      [typeof NORTH, Site],
      [typeof WEST, Site],
      [typeof EAST, Site],
      [typeof SOUTH, Site]
    ]
  }

  function getOverkillTargets(loc: Location) {
    return getNeighbours(loc).filter(([_, n]) => n.owner > 0 && n.owner !== id)
  }

  const moves = []

  for (let y = 0; y < gameMap.height; y++) {
    for (let x = 0; x < gameMap.width; x++) {
      const loc = {
        x,
        y
      }
      const {owner, strength, production} = gameMap.getSite(loc)
      if (owner === id) {
        const neighbours = getNeighbours(loc)

        let notOwnedNeighbours = neighbours.filter(
          neighbour => neighbour[1].owner !== id
        )

        if (notOwnedNeighbours.length === 0) {
          if (strength > 10 && strength > Math.min(production * 2, 127)) {
            moves.push(new Move(loc, getPrefferedDirection(loc)))
          }
        } else {
          const canAttack = neighbours.some(
            ([dir]) =>
              getOverkillTargets(offsetLocation(loc, 1, dir)).length > 0
          )
          const weakerThanMe = notOwnedNeighbours.filter(
            neighbour => neighbour[1].strength < strength
          )

          if (weakerThanMe.length > 0) {
            const prefferedNeighbour = weakerThanMe
              .map(n => {
                let score
                if (canAttack) {
                  // Best attack
                  const targets = getOverkillTargets(
                    offsetLocation(loc, 1, n[0])
                  )
                  score = targets.length
                  for (const [, site] of targets) {
                    score += site.production * (1 / 170)
                  }
                } else {
                  // Best production / strength ratio
                  score = n[1].production / n[1].strength
                }
                return [n, score] as [[Direction, Site], number]
              })
              .sort(([, aScore], [, bScore]) => bScore - aScore)[0][0]

            moves.push(new Move(loc, prefferedNeighbour[0]))
          } else if (canAttack && strength > 10) {
            const constMostOponents = neighbours
              .map(([dir]) => [
                dir,
                getOverkillTargets(offsetLocation(loc, 1, dir)).length
              ])
              .sort(([, aEnemies], [, bEnemies]) => bEnemies - aEnemies)[0][0]

            moves.push(new Move(loc, constMostOponents))
          } else if (strength > 0) {
            let mostProduction = neighbours
              .filter(neighbour => neighbour[1].owner === id)
              .filter(neighbour => neighbour[1].strength > 0)
              .filter(neighbour => neighbour[1].production > production)
              .filter(neighbour => {
                const otherStrength = neighbour[1].strength
                const otherProd = neighbour[1].production

                const otherNeights = getNeighbours(
                  offsetLocation(loc, 1, neighbour[0])
                )
                const isAtEdge =
                  otherNeights.filter(neighbour => neighbour[1].owner === id)
                    .length < 4
                const isWeak =
                  otherNeights
                    .filter(neighbour => neighbour[1].owner !== id)
                    .filter(
                      neighbour =>
                        neighbour[1].strength < otherStrength + otherProd
                    ).length == 0
                const willWin =
                  otherNeights
                    .filter(neighbour => neighbour[1].owner !== id)
                    .filter(
                      neighbour =>
                        neighbour[1].strength <
                        otherStrength + otherProd + strength
                    ).length > 0
                const isSensible = otherStrength + strength < 270

                return isAtEdge && isWeak && willWin && isSensible
              })
              .sort((a, b) => {
                return b[1].production - a[1].production
              })[0]

            if (mostProduction !== undefined) {
              moves.push(new Move(loc, +mostProduction[0]))
            }
          }
        }
      }
    }
  }

  network.sendMoves(moves)
})
