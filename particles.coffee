# How bout some dots?
# @nepthar - January 2018

opts =
  # Particle colors
  colors:  ["#fffb96", "#f47cd4", "#01cdfe"] # a e s t h e t i c

  speed: 100

  # How often the particles change direction. (0.0 - 1.0)
  wander: 0.8

  # How flickery the particles appear. (0.0+)
  flicker: 0.5

  # Number of particles
  number: 50

  # Distance at which particles are close enough to glow
  range: 200

  # Minimum particle size
  sizeMin: 2

  # Max particle size
  sizeMax: 5

  # Skip frames to save CPU cycles. If this number is zero, the animation will
  # run at around 60 fps.
  frameSkip: 5

  # Only spawn particles at the edge of the screen.
  # Particles will only move along the edges.
  edgeOnly: true
  # Only useful if edgeOnly is true. When spawning particles, also spawn particles
  # at screen_width / 2 or screen_height / 2. 
  edgeAndCentre: true


command: "pmset -g batt | egrep '([0-9]+\%).*' -o --colour=auto | cut -f1 -d';'"


render: (_) ->
  """
  <div id="particle-canvas" style="width:100%; height:100%; padding:0;"></div>
  <script src="particles.widget/src/particles.js"></script>
  """


update: (output, domEl) ->
  # This often runs before the script is parsed for some reason
  if (typeof ParticleNetwork == "undefined")
    this.particles = null
  else
    if (!this.particles)
      this.particles = new ParticleNetwork("particle-canvas", opts)

    # Don't waste precious power
    batt = parseInt(output.split("%")[0])
    if batt > 99
      this.particles.start()
    else
      this.particles.stop()


style: """
  width: 100%
  height: 100%
  margin: 0
  padding: 0
  z-index: 10
"""


refreshFrequency: 10000
