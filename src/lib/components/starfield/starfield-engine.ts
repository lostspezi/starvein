import {
  FULLSCREEN_VERTEX,
  NEBULA_FRAGMENT,
  SHOOTING_FRAGMENT,
  SHOOTING_VERTEX,
  STAR_FRAGMENT,
  STAR_VERTEX,
} from "./shaders";

export const MAX_STARS = 650;
export const STAR_STRIDE = 5; // x, y, depth, size, phase
export const DEPTH_LAYERS = [0.3, 0.6, 1.0] as const;
export const BOOST_DURATION_MS = 700;
export const MAX_DPR = 1.5;

const SHOOTING_STAR_POOL = 3;
const SHOOTING_MIN_DELAY_MS = 5_000;
const SHOOTING_MAX_DELAY_MS = 14_000;

export function starCountFor(width: number): number {
  return Math.max(0, Math.min(MAX_STARS, Math.floor(width * 0.5)));
}

export function generateStars(
  count: number,
  random: () => number = Math.random,
): Float32Array {
  const data = new Float32Array(count * STAR_STRIDE);
  for (let i = 0; i < count; i++) {
    const offset = i * STAR_STRIDE;
    const depth =
      DEPTH_LAYERS[
        Math.min(
          DEPTH_LAYERS.length - 1,
          Math.floor(random() * DEPTH_LAYERS.length),
        )
      ];
    data[offset] = random();
    data[offset + 1] = random();
    data[offset + 2] = depth;
    data[offset + 3] = 0.8 + random() * 1.6 + depth;
    data[offset + 4] = random() * Math.PI * 2;
  }
  return data;
}

/** Drift-Multiplikator 1 → 3,5 → 1 über die Boost-Dauer (Sinus-Hüllkurve). */
export function boostEnvelope(
  elapsedMs: number,
  durationMs = BOOST_DURATION_MS,
): number {
  if (elapsedMs <= 0 || elapsedMs >= durationMs) {
    return 1;
  }
  return 1 + 2.5 * Math.sin((elapsedMs / durationMs) * Math.PI);
}

type ShootingStar = {
  active: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  ageMs: number;
  lifeMs: number;
};

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("starfield: createShader failed");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`starfield: shader compile failed: ${log ?? "unknown"}`);
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error("starfield: createProgram failed");
  }
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`starfield: program link failed: ${log ?? "unknown"}`);
  }
  return program;
}

/**
 * Render-Engine des Sternenhintergrunds — reines WebGL1 ohne Dependencies.
 * Kein DOM-/Event-Wissen: die Starfield-Komponente füttert Parallax, Scroll,
 * Resize und Boost von außen.
 */
export class StarfieldEngine {
  private readonly gl: WebGLRenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly random: () => number;

  private starProgram: WebGLProgram;
  private nebulaProgram: WebGLProgram;
  private shootingProgram: WebGLProgram;
  private starBuffer: WebGLBuffer;
  private quadBuffer: WebGLBuffer;
  private shootingBuffer: WebGLBuffer;

  private starCount = 0;
  private width = 0;
  private height = 0;

  private rafHandle: number | null = null;
  private lastFrameTime: number | null = null;
  private timeSeconds = 0;
  private drift = 0;
  private boostElapsedMs = Number.POSITIVE_INFINITY;

  private parallaxTargetX = 0;
  private parallaxTargetY = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private scrollY = 0;

  private shootingStars: ShootingStar[] = [];
  private nextShootingSpawnMs = 0;
  private shootingVertexData = new Float32Array(SHOOTING_STAR_POOL * 6 * 3);

  constructor(
    gl: WebGLRenderingContext,
    canvas: HTMLCanvasElement,
    random: () => number = Math.random,
  ) {
    this.gl = gl;
    this.canvas = canvas;
    this.random = random;

    this.starProgram = createProgram(gl, STAR_VERTEX, STAR_FRAGMENT);
    this.nebulaProgram = createProgram(gl, FULLSCREEN_VERTEX, NEBULA_FRAGMENT);
    this.shootingProgram = createProgram(
      gl,
      SHOOTING_VERTEX,
      SHOOTING_FRAGMENT,
    );

    const starBuffer = gl.createBuffer();
    const quadBuffer = gl.createBuffer();
    const shootingBuffer = gl.createBuffer();
    if (!starBuffer || !quadBuffer || !shootingBuffer) {
      throw new Error("starfield: createBuffer failed");
    }
    this.starBuffer = starBuffer;
    this.quadBuffer = quadBuffer;
    this.shootingBuffer = shootingBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.shootingStars = Array.from({ length: SHOOTING_STAR_POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      ageMs: 0,
      lifeMs: 0,
    }));
    this.scheduleNextShootingStar();

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    const dpr = Math.min(devicePixelRatio, MAX_DPR);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.starCount = starCountFor(width);
    const stars = generateStars(this.starCount, this.random);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.starBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, stars, this.gl.STATIC_DRAW);
  }

  setParallaxTarget(x: number, y: number): void {
    this.parallaxTargetX = x;
    this.parallaxTargetY = y;
  }

  setScroll(y: number): void {
    this.scrollY = y;
  }

  boost(): void {
    this.boostElapsedMs = 0;
  }

  start(): void {
    if (this.rafHandle !== null) {
      return;
    }
    this.lastFrameTime = null;
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  destroy(): void {
    this.stop();
    const { gl } = this;
    gl.deleteBuffer(this.starBuffer);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.shootingBuffer);
    gl.deleteProgram(this.starProgram);
    gl.deleteProgram(this.nebulaProgram);
    gl.deleteProgram(this.shootingProgram);
  }

  private scheduleNextShootingStar(): void {
    this.nextShootingSpawnMs =
      SHOOTING_MIN_DELAY_MS +
      this.random() * (SHOOTING_MAX_DELAY_MS - SHOOTING_MIN_DELAY_MS);
  }

  private spawnShootingStar(): void {
    const star = this.shootingStars.find((candidate) => !candidate.active);
    if (!star || this.width === 0) {
      return;
    }
    const speed = 0.55 + this.random() * 0.35; // px/ms
    const angle = Math.PI * (0.15 + this.random() * 0.2); // flach nach unten rechts
    star.active = true;
    star.x = this.random() * this.width * 0.8;
    star.y = this.random() * this.height * 0.4;
    star.dx = Math.cos(angle) * speed;
    star.dy = Math.sin(angle) * speed;
    star.ageMs = 0;
    star.lifeMs = 600 + this.random() * 500;
  }

  private updateShootingStars(deltaMs: number): void {
    this.nextShootingSpawnMs -= deltaMs;
    if (this.nextShootingSpawnMs <= 0) {
      this.spawnShootingStar();
      this.scheduleNextShootingStar();
    }
    for (const star of this.shootingStars) {
      if (!star.active) {
        continue;
      }
      star.ageMs += deltaMs;
      star.x += star.dx * deltaMs;
      star.y += star.dy * deltaMs;
      if (
        star.ageMs >= star.lifeMs ||
        star.x > this.width + 200 ||
        star.y > this.height + 200
      ) {
        star.active = false;
      }
    }
  }

  /** Baut 2 Dreiecke pro aktiver Sternschnuppe (Kopf hell, Schweif transparent). */
  private fillShootingVertices(): number {
    const data = this.shootingVertexData;
    let vertexCount = 0;
    for (const star of this.shootingStars) {
      if (!star.active) {
        continue;
      }
      const lifeProgress = star.ageMs / star.lifeMs;
      const fade = Math.sin(Math.min(lifeProgress, 1) * Math.PI);
      const tailLength = 110;
      const tailX = star.x - star.dx * tailLength;
      const tailY = star.y - star.dy * tailLength;
      // Senkrechte für Quad-Breite (~1.5px)
      const length = Math.hypot(star.x - tailX, star.y - tailY) || 1;
      const nx = (-(star.y - tailY) / length) * 1.5;
      const ny = ((star.x - tailX) / length) * 1.5;

      const headAlpha = 0.85 * fade;
      const vertices = [
        [star.x + nx, star.y + ny, headAlpha],
        [star.x - nx, star.y - ny, headAlpha],
        [tailX + nx, tailY + ny, 0],
        [tailX + nx, tailY + ny, 0],
        [star.x - nx, star.y - ny, headAlpha],
        [tailX - nx, tailY - ny, 0],
      ];
      for (const [x, y, alpha] of vertices) {
        const offset = vertexCount * 3;
        data[offset] = x;
        data[offset + 1] = y;
        data[offset + 2] = alpha;
        vertexCount += 1;
      }
    }
    return vertexCount;
  }

  private readonly frame = (now: number): void => {
    const deltaMs =
      this.lastFrameTime === null
        ? 16.7
        : Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;

    this.timeSeconds += deltaMs / 1000;
    this.boostElapsedMs += deltaMs;
    this.drift += (deltaMs / 1000) * 0.5 * boostEnvelope(this.boostElapsedMs);

    this.parallaxX += (this.parallaxTargetX - this.parallaxX) * 0.05;
    this.parallaxY += (this.parallaxTargetY - this.parallaxY) * 0.05;

    this.updateShootingStars(deltaMs);
    this.render();

    this.rafHandle = requestAnimationFrame(this.frame);
  };

  private render(): void {
    const { gl } = this;
    if (this.width === 0 || this.height === 0) {
      return;
    }

    gl.clearColor(0.039, 0.055, 0.102, 1); // --color-bg-void
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1) Nebel (normales Alpha-Blending)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.nebulaProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const nebulaPos = gl.getAttribLocation(this.nebulaProgram, "a_pos");
    gl.enableVertexAttribArray(nebulaPos);
    gl.vertexAttribPointer(nebulaPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(
      gl.getUniformLocation(this.nebulaProgram, "u_resolution"),
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.nebulaProgram, "u_time"),
      this.timeSeconds,
    );
    gl.uniform2f(
      gl.getUniformLocation(this.nebulaProgram, "u_parallax"),
      this.parallaxX,
      this.parallaxY,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.nebulaProgram, "u_octaves"),
      this.width < 640 ? 2 : 3,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2) Sterne (additiv für Glow)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(this.starProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuffer);
    const strideBytes = STAR_STRIDE * 4;
    const posLoc = gl.getAttribLocation(this.starProgram, "a_pos");
    const depthLoc = gl.getAttribLocation(this.starProgram, "a_depth");
    const sizeLoc = gl.getAttribLocation(this.starProgram, "a_size");
    const phaseLoc = gl.getAttribLocation(this.starProgram, "a_phase");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, strideBytes, 0);
    gl.enableVertexAttribArray(depthLoc);
    gl.vertexAttribPointer(depthLoc, 1, gl.FLOAT, false, strideBytes, 8);
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, strideBytes, 12);
    gl.enableVertexAttribArray(phaseLoc);
    gl.vertexAttribPointer(phaseLoc, 1, gl.FLOAT, false, strideBytes, 16);
    gl.uniform2f(
      gl.getUniformLocation(this.starProgram, "u_resolution"),
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.starProgram, "u_time"),
      this.timeSeconds,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.starProgram, "u_drift"),
      this.drift,
    );
    gl.uniform2f(
      gl.getUniformLocation(this.starProgram, "u_parallax"),
      this.parallaxX * (this.canvas.width / this.width),
      this.parallaxY * (this.canvas.width / this.width),
    );
    gl.uniform1f(
      gl.getUniformLocation(this.starProgram, "u_scroll"),
      this.scrollY * (this.canvas.width / this.width),
    );
    gl.drawArrays(gl.POINTS, 0, this.starCount);

    // 3) Sternschnuppen (additiv)
    const shootingVertexCount = this.fillShootingVertices();
    if (shootingVertexCount > 0) {
      gl.useProgram(this.shootingProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.shootingBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.shootingVertexData, gl.DYNAMIC_DRAW);
      const dprScale = this.canvas.width / this.width;
      gl.uniform2f(
        gl.getUniformLocation(this.shootingProgram, "u_resolution"),
        this.canvas.width / dprScale,
        this.canvas.height / dprScale,
      );
      const shootPos = gl.getAttribLocation(this.shootingProgram, "a_pos");
      const shootAlpha = gl.getAttribLocation(this.shootingProgram, "a_alpha");
      gl.enableVertexAttribArray(shootPos);
      gl.vertexAttribPointer(shootPos, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(shootAlpha);
      gl.vertexAttribPointer(shootAlpha, 1, gl.FLOAT, false, 12, 8);
      gl.drawArrays(gl.TRIANGLES, 0, shootingVertexCount);
    }
  }
}
