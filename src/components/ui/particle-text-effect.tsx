"use client"

import { useEffect, useRef, useCallback } from "react"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 3
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01
  alpha = 1

  move() {
    let proximityMult = 1
    const distance = Math.sqrt(
      Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2)
    )

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    }

    const magnitude = Math.sqrt(towardsTarget.x * towardsTarget.x + towardsTarget.y * towardsTarget.y)
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    }

    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y)
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce
      steer.y = (steer.y / steerMagnitude) * this.maxForce
    }

    this.acc.x += steer.x
    this.acc.y += steer.y

    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }

    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)

    // Draw glow
    const glowSize = this.particleSize * 3
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, glowSize
    )
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.9})`)
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.3})`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(this.pos.x - glowSize, this.pos.y - glowSize, glowSize * 2, glowSize * 2)

    // Draw core dot
    ctx.fillStyle = `rgba(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 30, 255)}, ${this.alpha})`
    ctx.beginPath()
    ctx.arc(this.pos.x, this.pos.y, this.particleSize * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  kill(width: number, height: number) {
    if (!this.isKilled) {
      const angle = Math.random() * Math.PI * 2
      const mag = (width + height) / 2
      this.target.x = width / 2 + Math.cos(angle) * mag
      this.target.y = height / 2 + Math.sin(angle) * mag

      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0
      this.isKilled = true
    }
  }
}

interface ParticleTextEffectProps {
  words?: string[]
  transitionInterval?: number
  particleColor?: { r: number; g: number; b: number }
  fontSize?: number
  fontFamily?: string
  width?: number
  height?: number
  className?: string
  pixelSteps?: number
  onWordChange?: (index: number) => void
}

export function ParticleTextEffect({
  words = ["HELLO"],
  transitionInterval = 240,
  particleColor,
  fontSize = 80,
  fontFamily = "Arial",
  width = 1000,
  height = 300,
  className,
  pixelSteps = 6,
  onWordChange,
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)

  const nextWord = useCallback((word: string, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext("2d")!

    offscreenCtx.fillStyle = "white"
    offscreenCtx.font = `bold ${fontSize}px ${fontFamily}`
    offscreenCtx.textAlign = "center"
    offscreenCtx.textBaseline = "middle"
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 2)

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    const newColor = particleColor || {
      r: 200 + Math.random() * 55,
      g: 160 + Math.random() * 50,
      b: 60 + Math.random() * 40,
    }

    const particles = particlesRef.current
    let particleIndex = 0

    const coordsIndexes: number[] = []
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) {
      coordsIndexes.push(i)
    }

    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j], coordsIndexes[i]]
    }

    for (const coordIndex of coordsIndexes) {
      const alpha = pixels[coordIndex + 3]
      if (alpha > 0) {
        const x = (coordIndex / 4) % canvas.width
        const y = Math.floor(coordIndex / 4 / canvas.width)

        let particle: Particle

        if (particleIndex < particles.length) {
          particle = particles[particleIndex]
          particle.isKilled = false
          particleIndex++
        } else {
          particle = new Particle()

          const angle = Math.random() * Math.PI * 2
          const mag = (canvas.width + canvas.height) / 2
          particle.pos.x = canvas.width / 2 + Math.cos(angle) * mag
          particle.pos.y = canvas.height / 2 + Math.sin(angle) * mag

          particle.maxSpeed = Math.random() * 3 + 1.5
          particle.maxForce = particle.maxSpeed * 0.035
          particle.particleSize = Math.random() * 3 + 2
          particle.colorBlendRate = Math.random() * 0.015 + 0.002
          particle.alpha = 0.7 + Math.random() * 0.3

          particles.push(particle)
        }

        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
        }
        particle.targetColor = newColor
        particle.colorWeight = 0

        particle.target.x = x
        particle.target.y = y
      }
    }

    for (let i = particleIndex; i < particles.length; i++) {
      particles[i].kill(canvas.width, canvas.height)
    }
  }, [fontSize, fontFamily, particleColor, pixelSteps])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    nextWord(words[0], canvas)

    const animate = () => {
      const ctx = canvas.getContext("2d")!
      const particles = particlesRef.current

      // Fully transparent clear — no black rectangle
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]
        particle.move()
        particle.draw(ctx)

        if (particle.isKilled) {
          if (
            particle.pos.x < -50 || particle.pos.x > canvas.width + 50 ||
            particle.pos.y < -50 || particle.pos.y > canvas.height + 50
          ) {
            particles.splice(i, 1)
          }
        }
      }

      frameCountRef.current++
      if (transitionInterval > 0 && frameCountRef.current % transitionInterval === 0) {
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length
        nextWord(words[wordIndexRef.current], canvas)
        onWordChange?.(wordIndexRef.current)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
      particlesRef.current = []
    }
  }, [words, width, height, transitionInterval, nextWord, onWordChange])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  )
}
