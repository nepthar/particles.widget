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
  }

  update(rand) {
    if (this.steps == 0) {
      // Constant
      if (this.chance > rand) {
        // Start Transition
        this.steps = Math.floor(this.newTime())
        if (this.steps == 0) {
          this.value = this.newVal()
        } else {
          this.velocity = (this.newVal() - this.value) / this.steps
        }
      }
    } else {
      // Transitioning
      this.value += this.velocity
      this.steps -= 1
    }
    return this.value
  }

  static const(value) {
    return new TVar(0.0, () => { return value }, () => { return 0; })
  }
}

class Particle {
  constructor (net) {
    this.net = net
    this.x = Math.random() * net.limx
    this.y = Math.random() * net.limy

    this.s = new TVar(net.opts.sizeFlicker, net.newParticleSize, net.newSizeChangeTime)
    this.color = Random.select(net.opts.colors)
    this.flicker = Random.range(1.0 - net.opts.flicker, 1.0)

    this.vx = new TVar(net.opts.wander, net.newVelocity, net.newVelChangeTime)
    this.vy = new TVar(net.opts.wander, net.newVelocity, net.newVelChangeTime)
  }

  update(rand) {
    this.x = (this.x + this.vx.update(rand)) % this.net.limx
    this.y = (this.y + this.vy.update(rand)) % this.net.limy
    this.s.update(rand)
  }

  draw(alpha) {
    const ctx = this.net.ctx
    ctx.globalAlpha = alpha * this.flicker()
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.s.value, 0, TPI)
    ctx.fill()
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
      'position': 'relative'
    })

    this.limx = this.canvas.width
    this.limy = this.canvas.height

    // Standardizes some things across values of frame skip
    const fpsCorrect = this.opts.frameSkip + 1
    this.vv = (this.opts.speed * fpsCorrect) / 1000.0
    this.vflicker = this.opts.wander / fpsCorrect
    this.sflicker = 0.001 / fpsCorrect

    // Functions to generate new properties
    this.newParticleSize = Random.range(this.opts.sizeMin, this.opts.sizeMax)
    this.newSizeChangeTime = Random.range(60, 300)
    this.newVelChangeTime = Random.range(15, 60)
    this.newVelocity = Random.normal(0, this.vv)

    // Initialize particles
    this.particles = []
    this.numParticles = this.opts.number
    this.run = false

    for (let i = 0; i < this.numParticles; i++)
      this.particles.push(new Particle(this))

    this.boundOnFrame = this.onFrame.bind(this)
    this.frameCounter = 0

    console.log("Created particle network with N=" + this.numParticles)
  }

  updateAndDraw() {
    let ctx = this.ctx
    const rand = Math.random()

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (let i = 0; i < this.numParticles; i++) {
      const pi = this.particles[i]
      // I think it's cool when they all change at once.
      pi.update(rand);

      for (let j = this.numParticles - 1; j > i; j--) {
        const pj = this.particles[j]

        const distanceIsh = Math.abs(pi.x - pj.x) + Math.abs(pi.y - pj.y)
        if (distanceIsh > this.opts.range) continue

        const sqrtAlpha = (this.opts.range - distanceIsh) / this.opts.range
        const as = sqrtAlpha * sqrtAlpha

        pi.draw(as)
        pj.draw(as)
      }
    }
  }

  onFrame() {
    // Skip
    if(this.frameCounter > 0) {
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
