// The living window: a real stained-glass photo drawn with WebGL. Every piece of glass has its own
// light value (0 = dark and dull, 1 = sun through it), stored in a small texture the shader reads.
//
// Passes: scene (glass + stone) -> bright parts at 1/4 size -> blur (glow past the lead) ->
// light rays (radial blur from the sun) -> final mix with clouds, dust, grain.

export type GlassAssets = { photo: ImageBitmap; ids: ImageBitmap; count: number; fit?: 'cover' | 'contain' };

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Shared noise helpers.
const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;

const SCENE = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPhoto, uIds, uState;
uniform vec2 uRes; uniform vec4 uRect; uniform float uTime, uCloud, uFlash, uStateW, uSurround, uRoom;
${NOISE}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec4 state(float id) { return texture(uState, vec2((mod(id, uStateW) + 0.5) / uStateW, (floor(id / uStateW) + 0.5) / float(textureSize(uState, 0).y))); }
vec3 stone(vec2 p) {
  float n = fbm(p * vec2(9.0, 14.0)) * 0.6 + fbm(p * 60.0) * 0.4;
  float course = smoothstep(0.0, 0.004, abs(fract(p.y * 18.0) - 0.5) - 0.495); // faint mortar lines
  return vec3(0.16, 0.145, 0.13) * (0.75 + 0.5 * n) * (1.0 - 0.25 * course);
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);            // top-left origin, like the image
  vec2 uv = (p - uRect.xy) / uRect.zw;           // position inside the photo
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec3 wall = stone(p * aspect);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { o = vec4(wall, 1.0); return; }
  vec4 idt = texture(uIds, uv);
  // Deep stone reveal: the wall darkens toward the glass edge.
  vec2 px = 1.0 / vec2(textureSize(uIds, 0));
  float inside = 0.0;
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; inside += texture(uIds, uv + vec2(cos(a), sin(a)) * px * 14.0).a; }
  inside /= 8.0;
  if (idt.a < 0.5) {
    // The real wall from the photo, in a dim room that brightens as more of the window is lit.
    if (uSurround > 0.5) { vec3 w = texture(uPhoto, uv).rgb; o = vec4(mix(vec3(lum(w)), w, 0.85) * uRoom, 1.0); return; }
    o = vec4(wall * (1.0 - 0.55 * inside), 1.0); return;
  }

  float id = floor(idt.r * 255.0 + 0.5) + floor(idt.g * 255.0 + 0.5) * 256.0;
  vec4 s = state(id);
  float a = s.r * 1.5;                           // light, can overshoot past 1 while it arrives
  float glow = s.g, dust = s.b;
  float edge = idt.b;                            // 1 on the lead, fading over a few pixels into the glass

  vec3 c = texture(uPhoto, uv).rgb;
  float l = lum(c);
  // Dark glass: what it looks like with no sun behind it. Dim, grey, a little grime and a faint sheen.
  vec3 dull = mix(vec3(l), c, 0.3) * 0.17 + vec3(0.016, 0.018, 0.022);
  dull *= 0.85 + 0.3 * fbm(uv * vec2(30.0, 60.0));
  dull += vec3(0.05) * smoothstep(0.25, 0.0, abs(uv.x * 0.8 - uv.y * 0.5 + 0.1)) * (1.0 - edge);
  // Lit glass: richer, with uneven thickness shimmering slightly and clouds passing outside.
  float colourIn = clamp(a * 1.25 - 0.25, 0.0, 1.0);   // colour arrives just after the light
  vec3 lit = mix(vec3(l), c, 1.0 + 0.28 * colourIn);
  lit = mix(vec3(lum(lit)), lit, colourIn) * 1.0;
  lit *= 0.94 + 0.12 * noise(uv * vec2(140.0, 280.0) + uTime * 0.03);
  float cloud = mix(1.0, 0.8 + 0.3 * fbm(uv * 1.3 + vec2(uTime * 0.025, uTime * 0.008)), uCloud);
  lit *= cloud * (1.0 + uFlash);
  lit *= 1.0 - 0.45 * dust;                      // glass due for review has gathered a little dust
  vec3 col = mix(dull, lit, clamp(a, 0.0, 1.0)) * (1.0 + max(a - 1.0, 0.0));
  col += vec3(1.0, 0.7, 0.38) * edge * glow * 0.9; // light catching the lead as a piece wakes
  o = vec4(col, 1.0);
}`;

// Keep only what is bright: lit glass. Dull glass and stone fall below the threshold.
const BRIGHT = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex;
void main() { vec3 c = texture(uTex, vUv).rgb; float m = max(c.r, max(c.g, c.b)); o = vec4(c * smoothstep(0.45, 1.0, m) * 0.8, 1.0); }`;

const BLUR = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
void main() {
  vec2 d = uDir / vec2(textureSize(uTex, 0));
  vec3 c = texture(uTex, vUv).rgb * 0.227;
  c += (texture(uTex, vUv + d * 1.385).rgb + texture(uTex, vUv - d * 1.385).rgb) * 0.316;
  c += (texture(uTex, vUv + d * 3.231).rgb + texture(uTex, vUv - d * 3.231).rgb) * 0.070;
  o = vec4(c, 1.0);
}`;

// Light shafts: march from each pixel toward the sun, gathering bright glass along the way.
const RAYS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uSun;
void main() {
  vec2 step = (vUv - uSun) / 64.0 * 0.9;
  vec2 p = vUv; vec3 c = vec3(0.0); float w = 1.0;
  for (int i = 0; i < 64; i++) { p -= step; c += texture(uTex, p).rgb * w; w *= 0.965; }
  o = vec4(c / 22.0, 1.0);
}`;

const FINAL = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uGlow, uRays; uniform float uTime, uRayAmt; uniform vec2 uRes;
${NOISE}
void main() {
  vec3 c = texture(uScene, vUv).rgb;
  vec3 g = texture(uGlow, vUv).rgb;
  vec3 r = texture(uRays, vUv).rgb;
  // Rays read in the air in front of the stone; over bright glass they would only haze it.
  float over = smoothstep(0.08, 0.5, dot(c, vec3(0.2126, 0.7152, 0.0722)));
  c += g * mix(0.7, 0.25, over) + r * uRayAmt * 1.4 * (1.0 - 0.8 * over);
  // Dust drifting in the light: one mote per cell, only visible where rays fall.
  vec2 cell = vUv * uRes / 26.0; vec2 id = floor(cell);
  vec2 pos = vec2(hash(id), hash(id + 7.1)) + 0.25 * vec2(sin(uTime * 0.21 + hash(id) * 6.3), cos(uTime * 0.17 + hash(id + 3.0) * 6.3));
  float mote = smoothstep(0.06, 0.0, length(fract(cell) - fract(pos))) * step(0.82, hash(id + 1.7));
  c += mote * dot(r, vec3(0.33)) * 2.2;
  c = mix(c, c / (1.0 + max(c - 0.75, 0.0) * 1.2), step(0.75, c));        // soft shoulder so bright glass doesn't clip flat
  vec2 q = vUv - 0.5; c *= 1.0 - 0.35 * dot(q, q) * 2.0;
  c += (hash(vUv * uRes + fract(uTime)) - 0.5) * 0.018;
  o = vec4(c, 1.0);
}`;

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

export class GlassEngine {
  private gl: WebGL2RenderingContext;
  private progs: Record<string, WebGLProgram> = {};
  private photo: WebGLTexture; private ids: WebGLTexture; private stateTex: WebGLTexture;
  private stateW = 256; private stateH: number; private stateBytes: Uint8Array;
  private targets: Record<string, Target> = {};
  private imgAspect: number;
  readonly count: number;
  light: Float32Array; glow: Float32Array; dust: Float32Array;
  flash = 0; cloud = 1; rayAmount = 0.75; sun: [number, number] = [0.12, -0.25];
  /** How bright the room is (only for photos that keep their real wall). */
  room = 0.4;
  readonly fit: 'cover' | 'contain';
  private start = performance.now();

  constructor(private canvas: HTMLCanvasElement, assets: GlassAssets) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.count = assets.count;
    this.light = new Float32Array(this.count + 1);
    this.glow = new Float32Array(this.count + 1);
    this.dust = new Float32Array(this.count + 1);
    this.stateH = Math.ceil((this.count + 1) / this.stateW);
    this.stateBytes = new Uint8Array(this.stateW * this.stateH * 4);
    this.imgAspect = assets.photo.width / assets.photo.height;
    this.fit = assets.fit ?? 'contain';

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const [k, src] of Object.entries({ scene: SCENE, bright: BRIGHT, blur: BLUR, rays: RAYS, final: FINAL })) this.progs[k] = this.program(src);

    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.photo = this.texture(gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, assets.photo);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.ids = this.texture(gl.NEAREST, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, assets.ids);
    this.stateTex = this.texture(gl.NEAREST, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.stateW, this.stateH, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.stateBytes);
    this.resize();
  }

  private program(frag: string) {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    return p;
  }

  private texture(min: number, mag: number) {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private target(name: string, w: number, h: number) {
    const gl = this.gl, old = this.targets[name];
    if (old && old.w === w && old.h === h) return;
    if (old) { gl.deleteTexture(old.tex); gl.deleteFramebuffer(old.fb); }
    const tex = this.texture(gl.LINEAR, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    this.targets[name] = { fb, tex, w, h };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    this.canvas.width = w; this.canvas.height = h;
    const q = (n: number) => Math.max(1, Math.round(n / 4));
    this.target('scene', w, h);
    this.target('bright', q(w), q(h)); this.target('blurA', q(w), q(h)); this.target('blurB', q(w), q(h));
    this.target('rays', q(w), q(h));
  }

  // Where the window sits: as tall as fits between the top bar and the button, centred. When zoomed in,
  // the point "focus" (0 = top of the window, 1 = bottom) is kept in view, so the camera can follow the light.
  zoom = 1; focus = 0.5;
  rect(): [number, number, number, number] {
    const cw = this.canvas.width, ch = this.canvas.height;
    if (this.fit === 'cover') {
      // The photo's own wall fills the whole screen; the window stands in it.
      let w = cw, h = w / this.imgAspect;
      if (h < ch) { h = ch; w = h * this.imgAspect; }
      w *= this.zoom; h *= this.zoom;
      const y = Math.min(0, Math.max(ch - h, ch / 2 - this.focus * h));
      return [(cw - w) / 2 / cw, y / ch, w / cw, h / ch];
    }
    const top = ch * 0.035, bottom = ch * 0.865, availH = bottom - top, availW = cw * 0.9;
    let h = availH, w = h * this.imgAspect;
    if (w > availW) { w = availW; h = w / this.imgAspect; }
    w *= this.zoom; h *= this.zoom;
    let y = top + availH / 2 - this.focus * h;
    y = h > availH ? Math.min(top, Math.max(bottom - h, y)) : top + (availH - h) / 2;
    return [(cw - w) / 2 / cw, y / ch, w / cw, h / ch];
  }

  private draw(prog: string, out: Target | null, setup: (p: WebGLProgram) => void) {
    const gl = this.gl, p = this.progs[prog];
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    gl.viewport(0, 0, out ? out.w : this.canvas.width, out ? out.h : this.canvas.height);
    gl.useProgram(p);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    setup(p);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private bind(p: WebGLProgram, name: string, unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(p, name), unit);
  }

  render(now = performance.now()) {
    const gl = this.gl, t = (now - this.start) / 1000, T = this.targets;
    const b = this.stateBytes;
    for (let i = 0; i <= this.count; i++) {
      b[i * 4] = Math.round(Math.min(1, this.light[i] / 1.5) * 255);
      b[i * 4 + 1] = Math.round(Math.min(1, this.glow[i]) * 255);
      b[i * 4 + 2] = Math.round(Math.min(1, this.dust[i]) * 255);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.stateW, this.stateH, gl.RGBA, gl.UNSIGNED_BYTE, b);

    const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    this.draw('scene', T.scene, (p) => {
      this.bind(p, 'uPhoto', 0, this.photo); this.bind(p, 'uIds', 1, this.ids); this.bind(p, 'uState', 2, this.stateTex);
      gl.uniform2f(u(p, 'uRes'), this.canvas.width, this.canvas.height);
      gl.uniform4f(u(p, 'uRect'), ...this.rect());
      gl.uniform1f(u(p, 'uTime'), t); gl.uniform1f(u(p, 'uCloud'), this.cloud);
      gl.uniform1f(u(p, 'uFlash'), this.flash); gl.uniform1f(u(p, 'uStateW'), this.stateW);
      gl.uniform1f(u(p, 'uSurround'), this.fit === 'cover' ? 1 : 0); gl.uniform1f(u(p, 'uRoom'), this.room);
    });
    this.draw('bright', T.bright, (p) => this.bind(p, 'uTex', 0, T.scene.tex));
    for (let i = 0; i < 2; i++) {
      this.draw('blur', T.blurA, (p) => { this.bind(p, 'uTex', 0, (i ? T.blurB : T.bright).tex); gl.uniform2f(u(p, 'uDir'), 1 + i, 0); });
      this.draw('blur', T.blurB, (p) => { this.bind(p, 'uTex', 0, T.blurA.tex); gl.uniform2f(u(p, 'uDir'), 0, 1 + i); });
    }
    this.draw('rays', T.rays, (p) => { this.bind(p, 'uTex', 0, T.bright.tex); gl.uniform2f(u(p, 'uSun'), this.sun[0], 1 - this.sun[1]); });
    this.draw('final', null, (p) => {
      this.bind(p, 'uScene', 0, T.scene.tex); this.bind(p, 'uGlow', 1, T.blurB.tex); this.bind(p, 'uRays', 2, T.rays.tex);
      gl.uniform1f(u(p, 'uTime'), t); gl.uniform1f(u(p, 'uRayAmt'), this.rayAmount);
      gl.uniform2f(u(p, 'uRes'), this.canvas.width, this.canvas.height);
    });
  }

  dispose() { this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}

export async function loadGlass(base: string) {
  const [meta, photo, ids] = await Promise.all([
    fetch(`${base}/pieces.json`).then((r) => r.json()),
    fetch(`${base}/glass.webp`).then((r) => r.blob()).then((b) => createImageBitmap(b)),
    fetch(`${base}/ids.png`).then((r) => r.blob()).then((b) => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })),
  ]);
  return { assets: { photo, ids, count: meta.count as number, fit: meta.fit }, meta: meta as GlassMeta };
}

export type GlassMeta = {
  count: number; questions: number[][]; title: string; fit?: 'cover' | 'contain'; credit: { who: string; license: string; page: string; place: string };
};
