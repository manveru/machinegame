//                   ---===≡≡≡ machinegame ≡≡≡===---

/*
Your goal is to capture the red player's flag with your army of robots.
The flag will be defended by red's robots.

`state` contains information about what your robots can see:
state = {
 robots: [         → an array of your robots
  { x, y,          → integers, the position of your robot on the grid
    charges }      → integer, the health of your robot
 ],
 charges: [        → an array of charges on the ground
  { x, y }
 ],
 red: {            → what you can see from the red player
  robots: [        → red's robots
   { x, y,         → the position of the robot
     charges }     → the health of the robot
   ],
   flag: { x, y }  → red's flag, if you already found it
 },
}

You can give one of 4 instructions to your robot:

1. robot.moveTo(destination)
 The robot attempts to move to that position on the grid, one step each
 turn, including diagonally (like a king in chess).
`destination` can be either an object: `robot.moveTo(flag)` or coordinates
`robot.moveTo({x:1, y:2})`.
 Robots cannot move to a position occupied by red's robot.

2. robot.collect()
 The robot will attempt to pickup a charge on the ground.
 If successful, it will increment the robot.charges.

3. robot.clone()
 If the robot has 3 or more charges, spend 2 to create a new robot.
 There is a maximum of 256 robots per player.

4. robot.attack(redRobot)
 If your robot is next to another robot (including diagonal), it can
 smite them and remove 1 charge from them. If a robot reaches 0 charges,
 it drops dead.

You win when one of your robots is on red's flag.

Change the `play` function so it handles any state and gives instructions
to your robots to move, collect charges, clone, attack and defend, and
ultimately capture red's flag.

Additional docs can be found in the menu
*/

const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
]

var memory = {}
var redFlag = undefined
const chargesSeen = {}
var start = new Date()

function play(state) {
  const now = new Date()
  deltaT = now.getTime() - start.getTime()
  var robotCount = state.robots.length
  const newMemory = {}

  for (const robot of state.robots) {
    if (memory[robot.id] === undefined) {
      newMemory[robot.id] = {
        direction: directions[Math.floor(Math.random() * directions.length)],
        protector: needProtectors()
      }
    } else {
      newMemory[robot.id] = memory[robot.id]
    }
  }

  memory = newMemory

  for (const charge of state.charges) {
    chargesSeen[[charge.x, charge.y].toString()] = charge
  }

  if (chargesSeen.length == 0) {
    radius *= 2
  }

  const collect = {}
  const robotsNeedCharging = state.robots.filter(r => r.charges < 10)
  for (const [key, charge] of Object.entries(chargesSeen)) {
    const sorted = robotsNeedCharging.sort((a, b) => {
      const d =
        distance(charge.x, charge.y, a.x, a.y) -
        distance(charge.x, charge.y, b.x, b.y)
      return d === 0 ? a.id - b.id : d
    })
    const robot = sorted[0]
    if (robot) {
      const d = distance(charge.x, charge.y, robot.x, robot.y)
      const existing = collect[robot.id]
      if (d < 30 && (!existing || existing.distance > d)) {
        collect[robot.id] = { ...charge, distance: d }
      }
    }
  }

  state.robots.sort(
    (a, b) => distance(a.x, a.y, 0, 0) - distance(b.x, b.y, 0, 0)
  )
  var radius = Math.log(deltaT)

  outer: for (const robot of state.robots) {
    const m = memory[robot.id]
    const charge = collect[robot.id]

    const enemies = state.red.robots.sort(
      (a, b) =>
        distance(robot.x, robot.y, a.x, a.y) -
        distance(robot.x, robot.y, b.x, b.y)
    )

    for (const redRobot of enemies) {
      if (redRobot.charges <= 0) {
        continue
      }
      const dist = distance(robot.x, robot.y, redRobot.x, redRobot.y)
      if (dist < 1.5) {
        console.debug(robot.id, "attack", redRobot)
        robot.attack(redRobot)
        redRobot.charges--
        continue outer
      } else if (dist < 20 && !m.protector && redRobot.charge < robot.charge) {
        console.debug(robot.id, "moveTo attack", redRobot)
        robot.moveTo(redRobot)
        continue outer
      } else if (dist < 3 && !m.protector) {
        console.debug(robot.id, "moveTo flee", redRobot)
        directions.sort(
          (b, a) =>
            distance(robot.x + a[0], robot.y + a[1], redRobot.x, redRobot.y) -
            distance(robot.x + b[0], robot.y + b[1], redRobot.x, redRobot.y)
        )
        m.direction = directions[0]
        robot.moveTo({
          x: robot.x + m.direction[0],
          y: robot.y + m.direction[1]
        })
        // console.debug(robot.id, "moveTo flee", redRobot)
        // robot.moveTo({x: 0, y: 0})
        continue outer
      }
    }

    if (m.protector) {
      if (robot.x !== 0 || robot.y !== 0) {
        console.debug(robot.id, "moveTo protect")
        robot.moveTo({ x: 0, y: 0 })
      }
      continue outer
    } else if (needProtectors()) {
      m.protector = true
    } else {
      radius++
    }

    if (state.red.flag) {
      redFlag = state.red.flag
    }

    if (redFlag) {
      console.debug(robot.id, "moveTo redFlag", redFlag)
      robot.moveTo({ x: redFlag.x, y: redFlag.y })
      continue outer
    }

    if (robot.charges < 10) {
      if (robotCount < 256 && robot.charges >= 3) {
        console.debug(robot.id, "clone")
        robot.clone()
        robotCount++
        continue outer
      }

      if (charge) {
        if (
          charge.distance < 7 &&
          state.charges.find(c => c.x == charge.x && c.y == charge.y) ===
            undefined
        ) {
          delete chargesSeen[[charge.x, charge.y].toString()]
        } else if (charge.distance === 0) {
          console.debug(robot.id, "collect")
          robot.collect()
          delete chargesSeen[[charge.x, charge.y].toString()]
          continue outer
        } else {
          console.debug(robot.id, "moveTo collect", collect[robot.id])
          robot.moveTo(collect[robot.id])
          continue outer
        }
      }
    }

    var a = angle(robot)
    while (true) {
      const point = circleCoords(radius, a)
      // console.debug({angle: a, rx: robot.x, ry: robot.y, px: point.x, py: point.y})
      if (angle(robot) == angle(point)) {
        a++
      } else {
        // console.debug({move: point, oldAngle: angle(robot), angle: a, newAngle: angle(point)})
        console.debug(robot.id, "moveTo", point)
        robot.moveTo(point)
        break
      }
    }
  }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  function angle(p1, p2 = { x: 0, y: 0 }) {
    const vx = p1.x - p2.x
    const vy = p1.y - p2.y
    var radians = vx || vy ? Math.atan2(vy, vx) : 0
    if (radians < 0) {
      radians += 2 * Math.PI
    }
    return (radians * 180) / Math.PI
  }

  function circleCoords(radius, angle) {
    const a = (angle * Math.PI) / 180
    const x = radius * Math.cos(a)
    const y = radius * Math.sin(a)
    return { x: Math.round(x), y: Math.round(y) }
  }

  function needProtectors() {
    var protectors = state.robots.filter(r => {
      if (memory[r.id]) {
        return memory[r.id].protector
      } else if (newMemory[r.id]) {
        return newMemory[r.id].protector
      }
      return false
    }).length
    return protectors < Math.min(10, Math.floor(robotCount * 0.5))
  }
}
