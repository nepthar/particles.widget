// Floating particles effect
// Heavily modified from https://github.com/JulianLaval/canvas-particle-network

"use strict" // Does this do anything?
const TPI = 2.0 * Math.PI

class Random {
  static select(list) {
    // NB: Math.random is always less than 1.0
    return list[Math.floor(Math.random() * list.length)]
  }

  static range(min, max) {
    const range = max - min
    return () => {
      return (Math.random() * range) + min
    }
  }

  // Use the central limit theorem to approximate a normal distribution.
  // I played around with this for a bit and found that 12 gave me a satisfactory
  // approximation. I have no idea how expensive these Math.random calls are.
  // The range of numbers returned by this will be `mu` +/- (6 * `sigma`). Those
  // long tails could cause strange results.
  static normal(mu, sigma) {
    return () => {
      let rand = 0
      rand += Math.random(); rand += Math.random(); rand += Math.random();
      rand += Math.random(); rand += Math.random(); rand += Math.random();
      rand += Math.random(); rand += Math.random(); rand += Math.random();
      rand += Math.random(); rand += Math.random(); rand += Math.random();
      return (rand - 6) * sigma + mu
    }
  }

  // Returns true `probability` percent of the time
  static chance(probability) {
    return () => { return Math.random() < probability }
  }
}

// Numerical variable with two states: constant, changing. When constant, it has
// Has a transitionChance chance of switching to changing. This is approximate
class TVar {
  constructor(chance, getNewValue, getTime) {
    this.value = getNewValue()
    this.velocity = 0
    this.chance = chance
    this.newVal = getNewValue
    this.newTime = getTime
    this.steps = 0
    this.watchers = []
  }

  update(rand) {
    if (this.steps == 0) {
      // Constant

      if (this.chance > rand) {
        // Start Transition
        this.beginTransition()
      }
    } else {
      // Transitioning
      this.value += this.velocity
      this.steps -= 1
    }
    return this.value
  }

  beginTransition() {
    this.steps = Math.max(Math.floor(this.newTime()), 1)
    this.velocity = (this.newVal() - this.value) / this.steps

    for (let func of this.watchers) func()
  }

  watch(func) {
    this.watchers.push(func)
  }

  // Make other entangled to this - it will only change when this changes
  entangle(other) {
    other.chance = -1
    this.watch(() => {
      other.beginTransition()
    })
  }

  static const(value) {
    return new TVar(0.0, () => { return value }, () => { return 0; })
  }
}

class Particle {
  constructor(net) {
    this.net = net
    this.rand = Math.random()

    if (net.opts.edgeOnly)
    {
      this.threshold1 = 0.5
      this.threshold2 = 1.0

      if (net.opts.edgeAndCentre)
      {
        this.threshold1 = 0.3
        this.threshold2 = 0.6
      }

      if (Math.random() <= 0.5)
      {
        this.x_move = false
        this.y_move = true
        if (this.rand <= this.threshold1) // Spawn at the left Side
        {
          this.x = net.opts.sizeMax
        }
        else if (this.rand <= this.threshold2) // Spawn at the right side
        {
          this.x = net.limx - net.opts.sizeMax
        }
        else
        {
          this.x = (net.limx / 2) // Spawn at the horizontal middle
        }

        this.y = Math.random() * net.limy // Y can be any value
      }
      else
      {
        this.x_move = true
        this.y_move = false
        if (this.rand <= this.threshold1) // Spawn at Top
        {
          this.y = net.opts.sizeMax
        }
        else if (this.rand <= this.threshold2) // Spawn at Bottom
        {
          this.y = net.limy - net.opts.sizeMax
        }
        else
        {
          this.y = (net.limy / 2) // Spawn in the veritcal middle
        }
        this.x = Math.random() * net.limx // X can be any value
      }
    }
    else
    {
        this.x_move = true
        this.y_move = true
        this.x = Math.random() * net.limx
        this.y = Math.random() * net.limy
    }

    this.s = new TVar(net.opts.sizeFlicker, net.newParticleSize, net.newSizeChangeTime)
    this.color = Random.select(net.opts.colors)
    this.flicker = Random.range(1.0 - net.opts.flicker, 1.0)
    this.a = 0

    this.vx = new TVar(net.opts.wander, net.newVelocity, net.newVelChangeTime)
    this.vy = new TVar(net.opts.wander, net.newVelocity, net.newVelChangeTime)

  }

  update(rand, wind) {
    if (this.x_move)
    {
      this.x = ((this.x + this.vx.update(rand) + wind[0]) + this.net.limx) % this.net.limx
    }
    if (this.y_move)
    {
      this.y = ((this.y + this.vy.update(rand) + wind[1]) + this.net.limy) % this.net.limy
    }
    this.s.update(rand)
  }

  draw() {
    const ctx = this.net.ctx
    ctx.globalAlpha = this.a * this.flicker()
    ctx.fillStyle = this.color
    // Believe it or not, this uses 4x CPU. Wooo boy.
    // ctx.shadowBlur = this.s.value * .75
    // ctx.shadowColor = "white"
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.s.value, 0, TPI)
    ctx.fill()
  }
}

class Wind {
  constructor(minSpeed, maxSpeed, minDir, maxDir, changness) {
    this.velocity = new TVar(
      changness, Random.range(minSpeed, maxSpeed), Random.range(20, 40))
    this.direction = new TVar(0.0, Random.range(minDir, maxDir), Random.range(20,40))
    this.velocity.entangle(this.direction)
  }

  update(rand) {
    return [this.velocity.update(rand), this.direction.update(rand)]
  }

  watch(func) {
    this.velocity.watch(func)
  }

  value() {
    return [this.velocity.value, this.direction.value]
  }

  cartValue() {
    const r = this.velocity.value
    const th = this.direction.value * (Math.PI / 180.0)
    return [r * Math.cos(th), r * Math.sin(th)]
  }
}

class ParticleNetwork {
  constructor (elementId, options) {
    this.opts = options

    this.canvasDiv = document.getElementById(elementId)
    this.canvasDiv.size = {
      'width': this.canvasDiv.offsetWidth,
      'height': this.canvasDiv.offsetHeight
    }

    // Create canvas & context - Also not sure why this can't just be HTML
    this.canvas = document.createElement('canvas')
    this.canvasDiv.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    this.globalAlpha = 1.0
    this.canvas.width = this.canvasDiv.size.width
    this.canvas.height = this.canvasDiv.size.height
    this.setStyles(this.canvasDiv, { 'position': 'relative' })
    this.setStyles(this.canvas, {
      'z-index': '-1',
//       'position': 'relative'
    })

    this.limx = this.canvas.width
    this.limy = this.canvas.height

    // Standardizes some things across values of frame skip
    const fpsCorrect = this.opts.frameSkip + 1
    this.vv = (this.opts.speed * fpsCorrect) / 1000.0
    this.vflicker = this.opts.wander / fpsCorrect
    this.sflicker = 0.001 / fpsCorrect
    this.windFlicker = this.opts.windFlicker / fpsCorrect

    // Functions to generate new properties
    this.newParticleSize = Random.range(this.opts.sizeMin, this.opts.sizeMax)
    this.newSizeChangeTime = Random.range(60, 300)
    this.newVelChangeTime = Random.range(15, 60)
    this.newVelocity = Random.normal(0, this.vv)

    this.windBase = new Wind(
      this.opts.windSpeed[0],
      this.opts.windSpeed[1],
      this.opts.windDirection[0],
      this.opts.windDirection[1],
      this.windFlicker)

    if (this.opts.debug) {
      this.windBase.watch(() => {
        let el = document.getElementById('debug-info')
        const [dir, vel] = this.windBase.value()
        el.textContent = `Wind: ${dir.toFixed(2)} @ ${vel.toFixed(2)}`
      })
    }

    // Initialize particles
    this.particles = []
    this.numParticles = this.opts.density * (this.limx * this.limy) / (500.0 * 500.0)
    this.run = false

    for (let i = 0; i < this.numParticles; i++)
      this.particles.push(new Particle(this))

    this.boundOnFrame = this.onFrame.bind(this)
    this.frameCounter = 0
    console.log("Created particle network with N=" + this.numParticles)
  }

  updateAndDraw() {
    let ctx = this.ctx

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.windBase.update(Math.random())
    let wind = this.windBase.cartValue()

    if (this.opts.debug) {
      this.drawLineWithArrows(
        ctx,
        100, 100,
        100 + wind[0] * 100, 100 + wind[1] * 100,
        3, 3,
        false, true
      )
    }

    for (let i = 0; i < this.numParticles; i++) {
      const pi = this.particles[i]
      // I think it's cool when they all change at once.

      pi.update(Math.random(), wind)

      let closest = this.opts.range
      for (let j = 0; j < this.numParticles; j++) {
        if (i == j) continue
        const pj = this.particles[j]

        const distanceIsh = Math.abs(pi.x - pj.x) + Math.abs(pi.y - pj.y)
        if (distanceIsh < closest)
          closest = distanceIsh
      }

      const sqrtAlpha = (this.opts.range - closest) / this.opts.range
      pi.a = sqrtAlpha * sqrtAlpha
      pi.draw()
    }
  }

  debug() {
    console.log(`Wind base: ${this.windBse.cartValue()}`)
    console.log(`Canvas: ${this.canvas.width}x${this.canvas.height}`)
    console.log(`Limits: ${this.limx}x${this.limy}`)
  }

  // From stack overflow somewhere
  // x0,y0: the line's starting point
  // x1,y1: the line's ending point
  // width: the distance the arrowhead perpendicularly extends away from the line
  // height: the distance the arrowhead extends backward from the endpoint
  // arrowStart: true/false directing to draw arrowhead at the line's starting point
  // arrowEnd: true/false directing to draw arrowhead at the line's ending point
  drawLineWithArrows(ctx, x0,y0,x1,y1,aWidth,aLength,arrowStart,arrowEnd){
      const dx = x1-x0
      const dy = y1-y0
      const angle = Math.atan2(dy,dx)
      const length = Math.sqrt(dx*dx+dy*dy)

      ctx.fillStyle = 'white'
      ctx.globalAlpha = 1.0
      ctx.strokeStyle = 'white'

      ctx.translate(x0,y0)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0,0)
      ctx.lineTo(length,0)
      if(arrowStart){
          ctx.moveTo(aLength,-aWidth)
          ctx.lineTo(0,0)
          ctx.lineTo(aLength,aWidth)
      }
      if(arrowEnd){
          ctx.moveTo(length-aLength,-aWidth)
          ctx.lineTo(length,0)
          ctx.lineTo(length-aLength,aWidth)
      }
      //
      ctx.stroke()
      ctx.setTransform(1,0,0,1,0,0)
  }

  onFrame() {
    if(this.frameCounter > 0) {
      // Skip
      this.frameCounter--
    } else {
      this.updateAndDraw()
      this.frameCounter = this.opts.frameSkip
    }

    if (this.run) {
      requestAnimationFrame(this.boundOnFrame)
    }
  }

  start() {
    if (!this.run) {
      this.run = true
      this.onFrame()
    }
  }

  stop() {
    this.run = false
  }

  click() {
    if (this.run) {
      this.run = false
    } else {
      this.start()
    }
  }

  setStyles(div, styles) {
    for (let property in styles) {
      div.style[property] = styles[property]
    }
  }
}
