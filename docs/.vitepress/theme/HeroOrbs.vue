<template>
  <div class="hero-orbs">
    <canvas ref="canvas" class="warp-canvas" />
    <img class="hero-center-logo" :src="logoSrc" alt="codevoyant" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const canvas = ref(null)
const isDark = ref(false)

const logoSrc = computed(() =>
  isDark.value
    ? '/codevoyant/codevoyant-logo-dark.svg'
    : '/codevoyant/codevoyant-logo-light.svg'
)

const COLORS = ['#4343ff', '#5555ff', '#7766ff', '#9988ff', '#bbaaff', '#3322cc', '#ffffff']
const MAX_PARTICLES = 90

class Particle {
  constructor(w, h) { this.init(w, h) }

  init(w, h) {
    this.x = w / 2 + (Math.random() - 0.5) * 30
    this.y = h / 2 + (Math.random() - 0.5) * 30
    const angle = Math.random() * Math.PI * 2
    const speed = 0.8 + Math.random() * 1.6
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.accel = 1.012 + Math.random() * 0.012
    this.life = 1
    this.decay = 0.004 + Math.random() * 0.008
    this.size = 1.5 + Math.random() * 3.0
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
    this.trail = []
    this.trailLen = 10 + Math.floor(Math.random() * 10)
  }

  update(w, h) {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.trailLen) this.trail.shift()
    this.vx *= this.accel
    this.vy *= this.accel
    this.x += this.vx
    this.y += this.vy
    this.life -= this.decay
    return this.life > 0 && this.x > -40 && this.x < w + 40 && this.y > -40 && this.y < h + 40
  }

  draw(ctx) {
    if (this.trail.length < 2) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // tapered trail — thin and faint at tail, thick and bright at head
    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length
      ctx.globalAlpha = this.life * t * 0.75
      ctx.lineWidth = this.size * t * this.life
      ctx.strokeStyle = this.color
      ctx.beginPath()
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y)
      ctx.lineTo(this.trail[i].x, this.trail[i].y)
      ctx.stroke()
    }

    // hot white core at the head
    ctx.globalAlpha = this.life * 0.95
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 0.45 * this.life, 0, Math.PI * 2)
    ctx.fill()
  }
}

let particles = []
let raf = null
let w = 0
let h = 0

function resize() {
  const c = canvas.value
  if (!c) return
  const rect = c.parentElement.getBoundingClientRect()
  w = rect.width
  h = rect.height
  c.width = w * devicePixelRatio
  c.height = h * devicePixelRatio
  c.style.width = `${w}px`
  c.style.height = `${h}px`
  const ctx = c.getContext('2d')
  ctx.scale(devicePixelRatio, devicePixelRatio)
}

function tick() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')

  ctx.clearRect(0, 0, w, h)

  // spawn new particles to maintain count
  while (particles.length < MAX_PARTICLES) {
    particles.push(new Particle(w, h))
  }

  particles = particles.filter(p => {
    const alive = p.update(w, h)
    if (alive) p.draw(ctx)
    return alive
  })

  ctx.globalAlpha = 1
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  const update = () => isDark.value = document.documentElement.classList.contains('dark')
  update()
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true, attributeFilter: ['class'],
  })

  resize()
  window.addEventListener('resize', resize)
  tick()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.hero-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warp-canvas {
  position: absolute;
  inset: 0;
}

.hero-center-logo {
  position: absolute;
  width: 200px;
  height: 200px;
  filter: drop-shadow(0 0 16px rgba(67, 67, 255, 0.5));
}
</style>
