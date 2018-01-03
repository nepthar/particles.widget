# How bout some dots?
# @nepthar - January 2018

opts =
  # Particle colors
  colors:  ["#fffb96", "#f47cd4", "#01cdfe"] # a e s t h e t i c

  # Average particle velocity
  velocity: 1

  # Average area per particle in sq pixels
  sparsity: 20000

  # Distance at which particles are close enough to glow
  range: 200

  # How fast particles change size
  sizeScale: 0.01

  # Soft size limits
  sizeMin: 0.75
  sizeMax: 4.0

  # Milliseconds between redraws
  updateMs: 75

  # Frames for fade in/out
  fadeFrames: 20


command: "pmset -g batt | egrep '([0-9]+\%).*' -o --colour=auto | cut -f1 -d';'"


render: (_) ->
  """
  <div id="particle-canvas" style="width:100%; height:100%; padding:0;"></div>
  <script src="particles.widget/particles.jsl"></script>
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
