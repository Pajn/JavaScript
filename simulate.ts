import {execSync} from 'child_process'

const times = process.argv.map(arg => +arg).find(arg => !isNaN(arg))

const playerPattern = /^Player #(\d+), .+, came in rank #(\d+)/gm
const score = {}

for (let i = 0; i < times; i++) {
  const output = execSync('../simulate.sh').toString('utf-8')
  const playerInfo = output.slice(output.indexOf('Player #1, '))

  const players: Array<{player: number; position: number}> = []
  let match
  while ((match = playerPattern.exec(playerInfo))) {
    const player = +match[1]
    const position = +match[2]
    players.push({player, position})
  }

  players.forEach(({player, position}) => {
    const previousScore = score[player] || 0
    const currentScore = players.length - position
    score[player] = currentScore + previousScore
  })
}

console.log('score', score)
