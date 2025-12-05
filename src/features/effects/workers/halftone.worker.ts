/**
 * Halftone Effect Web Worker
 *
 * Runs WebGL halftone rendering off the main thread using an internal OffscreenCanvas.
 * Uses ImageBitmap passthrough pattern to avoid canvas transfer issues with React.
 *
 * Communication:
 * - Main thread sends 'init' with dimensions
 * - Main thread sends 'render' with ImageBitmap frame + options
 * - Worker returns 'frame' with processed ImageBitmap
 * - Main thread sends 'dispose' to cleanup
 */

// Vertex shader - simple pass-through
const VERTEX_SHADER = `
precision mediump float;
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// Fragment shader - halftone effect
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_dotSize;
uniform float u_spacing;
uniform float u_angle;
uniform float u_intensity;
uniform vec3 u_dotColor;
uniform vec3 u_bgColor;

vec2 rotate(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;
  vec4 texColor = texture2D(u_image, uv);
  float lum = luminance(texColor.rgb);

  vec2 pixelCoord = uv * u_resolution;
  float angleRad = u_angle * 3.14159265 / 180.0;
  vec2 rotatedCoord = rotate(pixelCoord - u_resolution * 0.5, angleRad) + u_resolution * 0.5;

  vec2 cellPos = mod(rotatedCoord, u_spacing);
  vec2 cellCenter = vec2(u_spacing * 0.5);
  float dist = distance(cellPos, cellCenter);

  float darkness = 1.0 - lum;
  float maxRadius = u_dotSize * 0.5 * u_intensity;
  float radius = darkness * maxRadius;

  float edge = 0.5;
  float dotMask = 1.0 - smoothstep(radius - edge, radius + edge, dist);

  vec3 color = mix(u_bgColor, u_dotColor, dotMask);
  gl_FragColor = vec4(color, 1.0);
}
`;

export interface HalftoneWorkerOptions {
  dotSize: number;
  spacing: number;
  angle: number;
  intensity: number;
  backgroundColor: string;
  dotColor: string;
}

// Message types - no canvas transfer needed
export type HalftoneWorkerMessage =
  | { type: 'init'; width: number; height: number }
  | { type: 'render'; frame: ImageBitmap; options: HalftoneWorkerOptions }
  | { type: 'resize'; width: number; height: number }
  | { type: 'dispose' };

// Worker owns its own OffscreenCanvas (not transferred from main thread)
let internalCanvas: OffscreenCanvas | null = null;

// WebGL state
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let uniforms: {
  resolution: WebGLUniformLocation | null;
  dotSize: WebGLUniformLocation | null;
  spacing: WebGLUniformLocation | null;
  angle: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  dotColor: WebGLUniformLocation | null;
  bgColor: WebGLUniformLocation | null;
} = {
  resolution: null,
  dotSize: null,
  spacing: null,
  angle: null,
  intensity: null,
  dotColor: null,
  bgColor: null,
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1]!, 16) / 255,
      parseInt(result[2]!, 16) / 255,
      parseInt(result[3]!, 16) / 255,
    ];
  }
  return [0, 0, 0];
}

function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = glCtx.createShader(type);
  if (!shader) return null;

  glCtx.shaderSource(shader, source);
  glCtx.compileShader(shader);

  if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
    console.error('[HalftoneWorker] Shader error:', glCtx.getShaderInfoLog(shader));
    glCtx.deleteShader(shader);
    return null;
  }

  return shader;
}

function initWebGL(canvas: OffscreenCanvas): boolean {
  gl = canvas.getContext('webgl', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    console.error('[HalftoneWorker] WebGL not supported');
    return false;
  }

  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) return false;

  // Create program
  program = gl.createProgram();
  if (!program) return false;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[HalftoneWorker] Program link error:', gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);

  // Get locations
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

  uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    dotSize: gl.getUniformLocation(program, 'u_dotSize'),
    spacing: gl.getUniformLocation(program, 'u_spacing'),
    angle: gl.getUniformLocation(program, 'u_angle'),
    intensity: gl.getUniformLocation(program, 'u_intensity'),
    dotColor: gl.getUniformLocation(program, 'u_dotColor'),
    bgColor: gl.getUniformLocation(program, 'u_bgColor'),
  };

  // Position buffer (full-screen quad)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Texture coordinate buffer
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(texCoordLoc);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

  // Create texture
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return true;
}

function render(frame: ImageBitmap, options: HalftoneWorkerOptions): void {
  if (!gl || !program || !texture || !internalCanvas) return;

  const width = gl.canvas.width;
  const height = gl.canvas.height;

  gl.viewport(0, 0, width, height);

  // Update texture with frame
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);

  // Set uniforms
  gl.uniform2f(uniforms.resolution, width, height);
  gl.uniform1f(uniforms.dotSize, options.dotSize);
  gl.uniform1f(uniforms.spacing, options.spacing);
  gl.uniform1f(uniforms.angle, options.angle);
  gl.uniform1f(uniforms.intensity, options.intensity);

  const dotColor = hexToRgb(options.dotColor);
  gl.uniform3f(uniforms.dotColor, dotColor[0], dotColor[1], dotColor[2]);

  const bgColor = hexToRgb(options.backgroundColor);
  gl.uniform3f(uniforms.bgColor, bgColor[0], bgColor[1], bgColor[2]);

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Close the input ImageBitmap to free memory
  frame.close();

  // Create ImageBitmap from rendered result and send back to main thread
  createImageBitmap(internalCanvas)
    .then((bitmap) => {
      // Transfer the bitmap back (zero-copy)
      self.postMessage({ type: 'frame', bitmap }, [bitmap]);
    })
    .catch((err) => {
      console.error('[HalftoneWorker] Failed to create output bitmap:', err);
    });
}

function dispose(): void {
  if (gl) {
    if (texture) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    gl = null;
    program = null;
    texture = null;
  }
  internalCanvas = null;
}

// Message handler
self.onmessage = (e: MessageEvent<HalftoneWorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      // Create internal OffscreenCanvas - no transfer from main thread needed
      internalCanvas = new OffscreenCanvas(msg.width, msg.height);
      const success = initWebGL(internalCanvas);
      self.postMessage({ type: 'ready', success });
      break;
    }
    case 'render': {
      render(msg.frame, msg.options);
      break;
    }
    case 'resize': {
      if (internalCanvas) {
        internalCanvas.width = msg.width;
        internalCanvas.height = msg.height;
      }
      break;
    }
    case 'dispose': {
      dispose();
      break;
    }
  }
};

export {};
