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

const network = new Networking('McBot XII')

network.on('map', (gameMap: GameMap, id) => {
  function directionToNearestEdge(loc) {
    for (let radius = 1; radius < 30; radius++) {
      for (let direction = 1; direction < 5; direction++) {
        let currentLocationOwner = gameMap.getSite(
          offsetLocation(loc, radius, direction as Direction)
        ).owner

        if (currentLocationOwner !== id) {
          return direction
        }
      }
    }

    return STILL
  }

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
          // if (strength > 10) {
          if (strength > 10 && strength > Math.min(production * 1.5, 127)) {
            moves.push(new Move(loc, directionToNearestEdge(loc)))
          }
        } else {
          const canAttack = neighbours.some(
            ([dir]) =>
              getOverkillTargets(offsetLocation(loc, 1, dir)).length > 0
          )
          const prefferedNeighbour = notOwnedNeighbours
            .filter(neighbour => neighbour[1].strength < strength)
            .sort((a, b) => {
              if (canAttack) {
                // Best attack
                return (
                  getOverkillTargets(offsetLocation(loc, 1, b[0])).length -
                  getOverkillTargets(offsetLocation(loc, 1, a[0])).length
                )
              } else {
                // Best production / strength ratio
                return (
                  b[1].production / b[1].strength -
                  a[1].production / a[1].strength
                )
              }
            })[0]

          if (prefferedNeighbour !== undefined) {
            moves.push(new Move(loc, +prefferedNeighbour[0]))
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
