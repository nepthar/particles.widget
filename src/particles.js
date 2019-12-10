// Floating particles effect
// Heavily modified from https://github.com/JulianLaval/canvas-particle-network

"use strict" // Does this do anything?
const TPI = 2.0 * Math.PI

function randomSelect(list) {
  // NB: Math.random is always less than 1.0
  return list[Math.floor(Math.random() * list.length)]
}

function randomRange(min, max) {
  const range = max - min
  return (rand) => {
    return (rand * range) + min
  }
}

// Numerical variable with two states: constant, changing. When constant, it has
// Has a transitionChance chance of switching to changing. This is approximate
class FlickerVar {
  constructor(transitionChance, getNewValue, getTransitionStepCount) {
    this.val = getNewValue(Math.random())
    this.velocity = 0
    this.chance = transitionChance
    this.getNewValue = getNewValue
    this.getTransitionStepCount = getTransitionStepCount
    this.transitionStepsRemaining = 0
  }

  // Rand should be in the range 0 to 1
  update(rand) {
    if (this.transitionStepsRemaining == 0) {
      // Constant
      if (this.chance > rand) {
        // Start Transition
        const newRandom = Math.random()
        this.transitionStepsRemaining = Math.floor(this.getTransitionStepCount(newRandom))
        this.velocity = (this.getNewValue(newRandom) - this.val) / this.transitionStepsRemaining
      }
    } else {
      // Transitioning
      this.val += this.velocity
      this.transitionStepsRemaining -= 1
    }
    return this.val
  }
}

class Particle {
  constructor (net) {
    this.net = net
    this.x = Math.random() * net.limx
    this.y = Math.random() * net.limy
    this.s = net.newParticleSize()
    this.color = randomSelect(net.opts.colors)

    this.vx = new FlickerVar(net.opts.velocityFlicker, net.newVelocity, net.newSizeChangeTime)
    this.vy = new FlickerVar(net.opts.velocityFlicker, net.newVelocity, net.newSizeChangeTime)
    this.vs = new FlickerVar(net.opts.sizeFlicker, net.newParticleSize, net.newSizeChangeTime)
  }

  update(rand) {
    this.x = (this.x + this.vx.update(rand)) % this.net.limx
    this.y = (this.y + this.vy.update(rand)) % this.net.limy
    this.size = this.vs.update(rand)
  }

  draw() {
    const ctx = this.net.ctx
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, TPI)
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
    this.ctx.globalAlpha = 0.5
    this.canvas.width = this.canvasDiv.size.width
    this.canvas.height = this.canvasDiv.size.height
    this.setStyles(this.canvasDiv, { 'position': 'relative' })
    this.setStyles(this.canvas, {
      'z-index': '-1',
      'position': 'relative'
    })

    this.limx = this.canvas.width
    this.limy = this.canvas.height

    // Standardizes velocity across values of frame skip
    this.vv = (this.opts.velocity / 1000) * (this.opts.frameSkip + 1)

    // Functions to generate new properties
    this.newParticleSize = randomRange(this.opts.sizeMin, this.opts.sizeMax)
    this.newSizeChangeTime = randomRange(30, 60)
    this.newVelocity = randomRange(-this.vv, this.vv)

    // Initialize particles
    this.particles = []
    this.numParticles = this.opts.numParticles
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
      pi.update(rand)// Math.random())
      for (let j = this.numParticles - 1; j > i; j--) {
        const pj = this.particles[j]

        // what fun would that be?
        if (pj.color == pi.color) continue

        const distanceIsh = Math.abs(pi.x - pj.x) + Math.abs(pi.y - pj.y)
        if (distanceIsh > this.opts.range) continue

        const sqrtAlpha = (this.opts.range - distanceIsh) / this.opts.range
        ctx.globalAlpha = sqrtAlpha * sqrtAlpha
        pi.draw()
        pj.draw()
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

  setStyles(div, styles) {
    for (let property in styles) {
      div.style[property] = styles[property]
    }
  }
}
