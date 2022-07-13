# How bout some dots?
# @nepthar - January 2018

opts =
  # Particle colors
  colors:  ["#fffb96", "#f47cd4", "#01cdfe"] # a e s t h e t i c

  speed: 100

  # The min and max wind speed
  windSpeed: [0.3, 1.0]

  # How often the wind changes
  windFlicker: 0.01

  # The range of wind directions, in degrees, that the wind can blow.
  # If both numbers are the same, the wind will never change direction.
  # Guide:
  # 0: Right, 90: Down, 180: Left, 270: Right
  # So, for example, if you want the wind to always blow mostly upwards,
  # use [250, 290]. For any direction, use [0, 359].
  # The first number must always be less than the second, but you can
  # pick negative numbers like [-10, 10]
  windDirection: [0, 359]

  # How often the particles change direction. (0.0 - 1.0)
  wander: 0.8

  # How flickery the particles appear. (0.0+)
  flicker: 0.5

  # Particles per 500x500 block of pixels
  density: 7.2

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
  edgeOnly: false

  # Only useful if edgeOnly is true. When spawning particles, also spawn particles
  # at screen_width / 2 or screen_height / 2.
  edgeAndCentre: false

  # Show debugging info
  debug: false


command: "pmset -g batt | egrep '([0-9]+\%).*' -o --colour=auto | cut -f1 -d';'"


render: (_) ->
  """
  <div id="particle-canvas" style="width:100%; height:100%; padding:0;border: 0px solid;position:absolute"></div>
  <div id="debug-info" style="position: absolute;left:10px;right:0;bottom:10px;color:white"></div>
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
    if batt > 0
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
