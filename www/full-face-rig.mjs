import {
  FaceLandmarker,
  FilesetResolver
} from "./mediapipe/vision_bundle.mjs";

const MOUTH_INNER_LOOP = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415,
  308, 324, 318, 402, 317, 14, 87, 178, 88, 95
];

const RIGHT_IRIS = [468, 469, 470, 471, 472];
const LEFT_IRIS = [473, 474, 475, 476, 477];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function uniqueIndices(connections) {
  return [
    ...new Set(
      connections.flatMap(connection => [connection.start, connection.end])
    )
  ];
}

function orderedLoop(connections) {
  const neighbours = new Map();

  for (const { start, end } of connections) {
    if (!neighbours.has(start)) neighbours.set(start, []);
    if (!neighbours.has(end)) neighbours.set(end, []);
    neighbours.get(start).push(end);
    neighbours.get(end).push(start);
  }

  const first = connections[0]?.start;
  if (first === undefined) return [];

  const loop = [first];
  let previous = null;
  let current = first;

  while (loop.length <= neighbours.size) {
    const next = (neighbours.get(current) || []).find(
      candidate => candidate !== previous
    );

    if (next === undefined || next === first) break;
    loop.push(next);
    previous = current;
    current = next;
  }

  return loop;
}

function trianglesFromTessellation(connections) {
  const indices = [];

  for (let index = 0; index + 2 < connections.length; index += 3) {
    const vertices = [
      ...new Set([
        connections[index].start,
        connections[index].end,
        connections[index + 1].start,
        connections[index + 1].end,
        connections[index + 2].start,
        connections[index + 2].end
      ])
    ];

    if (vertices.length === 3) indices.push(...vertices);
  }

  return indices;
}

function addTriangleFan(indices, loop, centerIndex) {
  for (let index = 0; index < loop.length; index += 1) {
    indices.push(
      centerIndex,
      loop[index],
      loop[(index + 1) % loop.length]
    );
  }
}

function averagePoint(points, indices) {
  let x = 0;
  let y = 0;

  for (const index of indices) {
    x += points[index]?.x || 0;
    y += points[index]?.y || 0;
  }

  const count = Math.max(1, indices.length);
  return { x: x / count, y: y / count };
}

function boundsFor(points, indices) {
  let minimumX = 1;
  let minimumY = 1;
  let maximumX = 0;
  let maximumY = 0;

  for (const index of indices) {
    const point = points[index];
    if (!point) continue;
    minimumX = Math.min(minimumX, point.x);
    minimumY = Math.min(minimumY, point.y);
    maximumX = Math.max(maximumX, point.x);
    maximumY = Math.max(maximumY, point.y);
  }

  return {
    left: minimumX,
    top: minimumY,
    right: maximumX,
    bottom: maximumY,
    width: Math.max(0.0001, maximumX - minimumX),
    height: Math.max(0.0001, maximumY - minimumY),
    centerX: (minimumX + maximumX) / 2,
    centerY: (minimumY + maximumY) / 2
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Shader-Fehler";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec2 a_position;
      attribute vec2 a_texture;
      attribute float a_alpha;
      varying vec2 v_texture;
      varying float v_alpha;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texture = a_texture;
        v_alpha = a_alpha;
      }
    `
  );

  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform sampler2D u_image;
      varying vec2 v_texture;
      varying float v_alpha;

      void main() {
        vec4 colour = texture2D(u_image, v_texture);
        gl_FragColor = vec4(colour.rgb, colour.a * v_alpha);
      }
    `
  );

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "WebGL-Programmfehler";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

class FullFaceRig {
  constructor({ image, canvas, wrapper, onStatus }) {
    this.image = image;
    this.canvas = canvas;
    this.wrapper = wrapper;
    this.onStatus = onStatus || (() => {});
    this.gl = null;
    this.landmarker = null;
    this.ready = false;
    this.analysisGeneration = 0;
    this.sourcePoints = [];
    this.sourceCoordinates = null;
    this.destinationCoordinates = null;
    this.vertexData = null;
    this.alphaValues = null;
    this.indices = null;
    this.virtualPointLoops = [];
    this.lastFrameAt = 0;
    this.nextBlinkAt = 0;
    this.blinkStartedAt = 0;
    this.blinkDuration = 180;

    this.lipIndices = uniqueIndices(FaceLandmarker.FACE_LANDMARKS_LIPS);
    this.lipIndexSet = new Set(this.lipIndices);
    this.faceOvalIndices = uniqueIndices(
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL
    );
    this.faceOvalIndexSet = new Set(this.faceOvalIndices);
    this.leftEyeLoop = orderedLoop(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
    this.rightEyeLoop = orderedLoop(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
    this.leftEyeIndexSet = new Set(this.leftEyeLoop);
    this.rightEyeIndexSet = new Set(this.rightEyeLoop);
    this.leftBrowIndices = uniqueIndices(
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW
    );
    this.rightBrowIndices = uniqueIndices(
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW
    );
  }

  async initialize() {
    this.initializeWebGl();
    this.onStatus({ state: "loading" });

    const wasmRoot = new URL("./mediapipe/wasm", import.meta.url).href;
    const modelPath = new URL(
      "./mediapipe/face_landmarker.task",
      import.meta.url
    ).href;
    const vision = await FilesetResolver.forVisionTasks(wasmRoot);

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU"
      },
      runningMode: "IMAGE",
      numFaces: 1,
      minFaceDetectionConfidence: 0.55,
      minFacePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    });
  }

  initializeWebGl() {
    const gl =
      this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance"
      }) ||
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance"
      });

    if (!gl) throw new Error("WebGL ist auf diesem Gerät nicht verfügbar.");

    this.gl = gl;
    this.program = createProgram(gl);
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.texture = gl.createTexture();
    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.textureLocation = gl.getAttribLocation(this.program, "a_texture");
    this.alphaLocation = gl.getAttribLocation(this.program, "a_alpha");

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_image"), 0);
  }

  async setImage() {
    const generation = ++this.analysisGeneration;
    this.ready = false;
    this.clear();
    this.canvas.style.display = "none";
    this.onStatus({ state: "analysing" });

    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const result = this.landmarker.detect(this.image);
      if (generation !== this.analysisGeneration) return false;

      const landmarks = result.faceLandmarks?.[0];
      if (!landmarks || landmarks.length < 468) {
        this.onStatus({ state: "fallback", reason: "no-face" });
        return false;
      }

      const faceBounds = boundsFor(landmarks, this.faceOvalIndices);
      if (faceBounds.width < 0.12 || faceBounds.height < 0.12) {
        this.onStatus({ state: "fallback", reason: "face-too-small" });
        return false;
      }

      this.prepareMesh(landmarks);
      this.uploadTexture();
      this.resize();
      this.ready = true;
      this.lastFrameAt = 0;
      this.nextBlinkAt = performance.now() + 1400 + Math.random() * 1200;
      this.canvas.style.display = "block";
      this.render({ openness: 0, wideness: 0, roundness: 0 }, true);
      this.onStatus({ state: "ready" });
      return true;
    } catch (error) {
      console.warn("Lokaler Vollgesichtsmodus:", error);
      this.onStatus({ state: "fallback", reason: "analysis-error" });
      return false;
    }
  }

  prepareMesh(landmarks) {
    this.sourcePoints = landmarks.slice(0, 478).map(point => ({
      x: clamp(point.x, 0, 1),
      y: clamp(point.y, 0, 1)
    }));

    const indices = trianglesFromTessellation(
      FaceLandmarker.FACE_LANDMARKS_TESSELATION
    );

    if (this.sourcePoints.length >= 478) {
      addTriangleFan(indices, RIGHT_IRIS.slice(1), RIGHT_IRIS[0]);
      addTriangleFan(indices, LEFT_IRIS.slice(1), LEFT_IRIS[0]);
    }

    this.virtualPointLoops = [];
    for (const loop of [
      MOUTH_INNER_LOOP,
      this.leftEyeLoop,
      this.rightEyeLoop
    ]) {
      const centerIndex = this.sourcePoints.length;
      this.sourcePoints.push(averagePoint(this.sourcePoints, loop));
      this.virtualPointLoops.push({ centerIndex, loop });
      addTriangleFan(indices, loop, centerIndex);
    }

    const pointCount = this.sourcePoints.length;
    this.sourceCoordinates = new Float32Array(pointCount * 2);
    this.destinationCoordinates = new Float32Array(pointCount * 2);
    this.vertexData = new Float32Array(pointCount * 5);
    this.alphaValues = new Float32Array(pointCount);
    this.alphaValues.fill(1);

    for (let index = 0; index < pointCount; index += 1) {
      this.sourceCoordinates[index * 2] = this.sourcePoints[index].x;
      this.sourceCoordinates[index * 2 + 1] = this.sourcePoints[index].y;
    }

    for (const index of this.faceOvalIndices) {
      this.alphaValues[index] = 0.08;
    }

    this.indices = new Uint16Array(indices);
    this.faceBounds = boundsFor(this.sourcePoints, this.faceOvalIndices);
    this.mouthBounds = boundsFor(this.sourcePoints, this.lipIndices);
    this.leftEyeBounds = boundsFor(this.sourcePoints, this.leftEyeLoop);
    this.rightEyeBounds = boundsFor(this.sourcePoints, this.rightEyeLoop);

    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }

  uploadTexture() {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.image
    );
  }

  resize() {
    if (!this.gl || !this.image.complete) return;

    const imageRect = this.image.getBoundingClientRect();
    const wrapperRect = this.wrapper.getBoundingClientRect();
    if (imageRect.width <= 0 || imageRect.height <= 0) return;

    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const renderWidth = Math.max(1, Math.round(imageRect.width * pixelRatio));
    const renderHeight = Math.max(1, Math.round(imageRect.height * pixelRatio));

    this.canvas.style.left = `${imageRect.left - wrapperRect.left}px`;
    this.canvas.style.top = `${imageRect.top - wrapperRect.top}px`;
    this.canvas.style.width = `${imageRect.width}px`;
    this.canvas.style.height = `${imageRect.height}px`;

    if (
      this.canvas.width !== renderWidth ||
      this.canvas.height !== renderHeight
    ) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
      this.gl.viewport(0, 0, renderWidth, renderHeight);
    }
  }

  blinkValue(timestamp) {
    if (!this.blinkStartedAt && timestamp >= this.nextBlinkAt) {
      this.blinkStartedAt = timestamp;
      this.blinkDuration = 165 + Math.random() * 45;
    }

    if (!this.blinkStartedAt) return 0;

    const progress = (timestamp - this.blinkStartedAt) / this.blinkDuration;
    if (progress >= 1) {
      this.blinkStartedAt = 0;
      this.nextBlinkAt = timestamp + 3200 + Math.random() * 3000;
      return 0;
    }

    return Math.pow(Math.sin(Math.PI * clamp(progress, 0, 1)), 1.7);
  }

  movePoint(index, deltaX, deltaY) {
    if (index < 0 || index * 2 + 1 >= this.destinationCoordinates.length) {
      return;
    }
    this.destinationCoordinates[index * 2] += deltaX;
    this.destinationCoordinates[index * 2 + 1] += deltaY;
  }

  animateEye(loop, bounds, blink) {
    const amount = blink * 0.58;
    for (const index of loop) {
      const sourceY = this.sourceCoordinates[index * 2 + 1];
      this.destinationCoordinates[index * 2 + 1] +=
        (bounds.centerY - sourceY) * amount;
    }
  }

  updateVirtualPoints() {
    for (const { centerIndex, loop } of this.virtualPointLoops) {
      let x = 0;
      let y = 0;
      for (const index of loop) {
        x += this.destinationCoordinates[index * 2];
        y += this.destinationCoordinates[index * 2 + 1];
      }
      this.destinationCoordinates[centerIndex * 2] = x / loop.length;
      this.destinationCoordinates[centerIndex * 2 + 1] = y / loop.length;
    }
  }

  applyMotion({ openness, wideness, roundness }, timestamp) {
    this.destinationCoordinates.set(this.sourceCoordinates);

    const open = clamp(openness, 0, 0.9);
    const wide = clamp(wideness, 0, 1);
    const round = clamp(roundness, 0, 1);
    const mouth = this.mouthBounds;
    const face = this.faceBounds;
    const verticalTravel =
      Math.min(face.height * 0.010, mouth.height * 0.31) * open;
    const upperTravel = verticalTravel * 0.24;
    const lowerTravel = verticalTravel * 0.76;
    const shapeScale = clamp(1 + wide * 0.028 - round * 0.038, 0.96, 1.03);

    for (const index of this.lipIndices) {
      const sourceX = this.sourceCoordinates[index * 2];
      const sourceY = this.sourceCoordinates[index * 2 + 1];
      const cornerDistance = clamp(
        Math.abs(sourceX - mouth.centerX) / (mouth.width * 0.52),
        0,
        1
      );
      const centerWeight = 1 - cornerDistance * 0.42;
      const destinationX = mouth.centerX +
        (sourceX - mouth.centerX) * shapeScale;
      const destinationY = sourceY < mouth.centerY
        ? sourceY - upperTravel * centerWeight
        : sourceY + lowerTravel * centerWeight;

      this.destinationCoordinates[index * 2] = destinationX;
      this.destinationCoordinates[index * 2 + 1] = destinationY;
    }

    for (let index = 0; index < Math.min(468, this.sourcePoints.length); index += 1) {
      if (
        this.lipIndexSet.has(index) ||
        this.leftEyeIndexSet.has(index) ||
        this.rightEyeIndexSet.has(index) ||
        this.faceOvalIndexSet.has(index)
      ) {
        continue;
      }

      const sourceX = this.sourceCoordinates[index * 2];
      const sourceY = this.sourceCoordinates[index * 2 + 1];
      const normalX = (sourceX - mouth.centerX) / (face.width * 0.27);
      const normalY = (sourceY - mouth.centerY) / (face.height * 0.22);
      const cheekInfluence = Math.exp(
        -(normalX * normalX + normalY * normalY) * 1.55
      );
      const direction = Math.sign(sourceX - mouth.centerX);

      this.movePoint(
        index,
        direction * verticalTravel * wide * 0.035 * cheekInfluence,
        verticalTravel * 0.028 * cheekInfluence
      );
    }

    for (const index of this.faceOvalIndices) {
      const sourceY = this.sourceCoordinates[index * 2 + 1];
      const lowerFaceWeight = clamp(
        (sourceY - mouth.bottom) / Math.max(0.0001, face.bottom - mouth.bottom),
        0,
        1
      );
      this.movePoint(index, 0, verticalTravel * 0.045 * lowerFaceWeight);
    }

    const blink = this.blinkValue(timestamp);
    this.animateEye(this.leftEyeLoop, this.leftEyeBounds, blink);
    this.animateEye(this.rightEyeLoop, this.rightEyeBounds, blink);

    for (const index of this.leftBrowIndices) {
      this.movePoint(index, 0, this.leftEyeBounds.height * blink * 0.035);
    }
    for (const index of this.rightBrowIndices) {
      this.movePoint(index, 0, this.rightEyeBounds.height * blink * 0.035);
    }

    const gazeX = Math.sin(timestamp * 0.00037) * face.width * 0.0008;
    const gazeY = Math.sin(timestamp * 0.00029 + 1.3) * face.height * 0.00045;
    for (const index of [...RIGHT_IRIS, ...LEFT_IRIS]) {
      this.movePoint(index, gazeX, gazeY);
    }

    const microX = Math.sin(timestamp * 0.00053) * face.width * 0.00045;
    const microY = Math.sin(timestamp * 0.00041 + 0.8) * face.height * 0.00030;
    for (let index = 0; index < Math.min(468, this.sourcePoints.length); index += 1) {
      if (this.faceOvalIndexSet.has(index)) continue;
      const sourceX = this.sourceCoordinates[index * 2];
      const sourceY = this.sourceCoordinates[index * 2 + 1];
      const radius = Math.hypot(
        (sourceX - face.centerX) / (face.width * 0.52),
        (sourceY - face.centerY) / (face.height * 0.52)
      );
      const influence = Math.pow(1 - clamp(radius, 0, 1), 1.8);
      this.movePoint(index, microX * influence, microY * influence);
    }

    this.updateVirtualPoints();
  }

  updateVertexBuffer() {
    const pointCount = this.sourceCoordinates.length / 2;

    for (let index = 0; index < pointCount; index += 1) {
      const targetOffset = index * 5;
      const sourceOffset = index * 2;
      this.vertexData[targetOffset] =
        this.destinationCoordinates[sourceOffset] * 2 - 1;
      this.vertexData[targetOffset + 1] =
        1 - this.destinationCoordinates[sourceOffset + 1] * 2;
      this.vertexData[targetOffset + 2] = this.sourceCoordinates[sourceOffset];
      this.vertexData[targetOffset + 3] =
        this.sourceCoordinates[sourceOffset + 1];
      this.vertexData[targetOffset + 4] = this.alphaValues[index];
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(
      this.positionLocation,
      2,
      gl.FLOAT,
      false,
      stride,
      0
    );
    gl.enableVertexAttribArray(this.textureLocation);
    gl.vertexAttribPointer(
      this.textureLocation,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.enableVertexAttribArray(this.alphaLocation);
    gl.vertexAttribPointer(
      this.alphaLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      4 * Float32Array.BYTES_PER_ELEMENT
    );
  }

  render(motion, force = false) {
    if (!this.ready || !this.indices) return false;

    const timestamp = Number(motion?.timestamp) || performance.now();
    if (!force && timestamp - this.lastFrameAt < 30) return true;
    this.lastFrameAt = timestamp;

    this.resize();
    this.applyMotion(
      {
        openness: motion?.openness,
        wideness: motion?.wideness,
        roundness: motion?.roundness
      },
      timestamp
    );
    this.updateVertexBuffer();

    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    return true;
  }

  clear() {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.lastFrameAt = 0;
  }

  disable() {
    this.analysisGeneration += 1;
    this.ready = false;
    this.clear();
    this.canvas.style.display = "none";
    this.onStatus({ state: "off" });
  }
}

export async function createFullFaceRig(options) {
  const rig = new FullFaceRig(options);
  await rig.initialize();
  return rig;
}
