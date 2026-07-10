/** GLSL-Quellen des Starfields (WebGL1). */

export const STAR_VERTEX = /* glsl */ `
attribute vec2 a_pos;      // normalisiert 0..1
attribute float a_depth;   // 0.3 / 0.6 / 1.0 — nah = 1.0
attribute float a_size;
attribute float a_phase;

uniform vec2 u_resolution;
uniform float u_time;      // Sekunden, für Twinkle
uniform float u_drift;     // akkumulierter Drift (inkl. Boost)
uniform vec2 u_parallax;   // -1..1 Mausoffset (gelerpt)
uniform float u_scroll;    // scrollY in px

varying float v_alpha;

void main() {
  vec2 pos = a_pos;
  pos.y = fract(pos.y + u_drift * 0.02 * a_depth);

  vec2 px = pos * u_resolution;
  px += u_parallax * a_depth * 30.0;
  px.y -= u_scroll * 0.02 * a_depth;
  px = mod(px, u_resolution);

  vec2 clip = (px / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;

  float twinkle = 0.65 + 0.35 * sin(u_time * (1.5 + a_depth * 2.0) + a_phase);
  v_alpha = twinkle * (0.35 + 0.65 * a_depth);
}
`;

export const STAR_FRAGMENT = /* glsl */ `
precision mediump float;
varying float v_alpha;

void main() {
  float r = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.1, r) * v_alpha;
  gl_FragColor = vec4(vec3(0.82, 0.9, 1.0), a);
}
`;

export const FULLSCREEN_VERTEX = /* glsl */ `
attribute vec2 a_pos; // clip space
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_parallax;
uniform float u_octaves; // 2.0 mobil, 3.0 ab 640px

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    if (float(i) >= u_octaves) { break; }
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * vec2(3.0 * u_resolution.x / u_resolution.y, 3.0);
  p += u_parallax * 0.15;
  p.y += u_time * 0.008;

  float n = fbm(p);
  float m = fbm(p * 0.5 + vec2(7.3, 1.7) - u_time * 0.004);

  vec3 indigo = vec3(0.11, 0.145, 0.25);
  vec3 cyan = vec3(0.369, 0.902, 1.0);
  vec3 color = mix(indigo, cyan, smoothstep(0.45, 0.85, n) * 0.35);
  float alpha = smoothstep(0.35, 0.8, n * 0.7 + m * 0.5) * 0.14;

  gl_FragColor = vec4(color, alpha);
}
`;

export const SHOOTING_VERTEX = /* glsl */ `
attribute vec2 a_pos;   // Pixel
attribute float a_alpha;

uniform vec2 u_resolution;
varying float v_alpha;

void main() {
  vec2 clip = (a_pos / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_alpha = a_alpha;
}
`;

export const SHOOTING_FRAGMENT = /* glsl */ `
precision mediump float;
varying float v_alpha;

void main() {
  gl_FragColor = vec4(0.72, 0.92, 1.0, v_alpha);
}
`;
