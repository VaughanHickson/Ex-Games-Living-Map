import type {
  CustomLayerInterface,
  Map,
} from 'maplibre-gl'

const vertexShaderSource = `#version 300 es
precision highp float;

out vec2 v_uv;

void main() {
  vec2 position;

  if (gl_VertexID == 0) {
    position = vec2(-1.0, -1.0);
  } else if (gl_VertexID == 1) {
    position = vec2(3.0, -1.0);
  } else {
    position = vec2(-1.0, 3.0);
  }

  v_uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_world_origin;
uniform float u_world_scale;

in vec2 v_uv;
out vec4 outColor;

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));

  return mix(
    mix(a, b, local.x),
    mix(c, d, local.x),
    local.y
  );
}

float layeredNoise(
  vec2 position,
  float time
) {
  float broad =
    sin(
      position.x * 2.3 +
      position.y * 1.4 +
      time * 0.34
    ) * 0.30 +
    cos(
      position.x * 1.5 -
      position.y * 2.7 -
      time * 0.25
    ) * 0.25;

  float medium =
    sin(
      (position.x + position.y) * 4.4 +
      time * 0.21
    ) * 0.18 +
    cos(
      (position.x - position.y) * 5.8 -
      time * 0.16
    ) * 0.14;

  float irregular =
    valueNoise(
      position * 0.72 +
      vec2(
        time * 0.018,
        -time * 0.013
      )
    ) - 0.5;

  return broad +
    medium +
    irregular * 0.34;
}

vec3 livingWater(
  vec2 worldPosition,
  float time
) {
  vec2 flow = vec2(
    sin(
      worldPosition.y * 0.78 +
      time * 0.19
    ),
    cos(
      worldPosition.x * 0.84 -
      time * 0.17
    )
  );

  vec2 position =
    worldPosition +
    flow * 0.32;

  float broad =
    layeredNoise(
      position * 0.64,
      time
    );

  float medium =
    layeredNoise(
      position * 1.42 +
      vec2(7.3, -4.1),
      time * 1.13
    );

  float fine =
    layeredNoise(
      position * 3.85 +
      vec2(-11.0, 8.4),
      time * 0.86
    );

  vec3 oceanBlue =
    vec3(31.0, 101.0, 128.0) / 255.0;

  vec3 blueGreen =
    vec3(44.0, 137.0, 128.0) / 255.0;

  vec3 livingGreen =
    vec3(88.0, 176.0, 103.0) / 255.0;

  vec3 softSage =
    vec3(145.0, 200.0, 166.0) / 255.0;

  float detailStrength =
    1.0 - smoothstep(
      0.006,
      0.055,
      u_world_scale
    );

  vec3 colour = oceanBlue;

  colour = mix(
    colour,
    blueGreen,
    smoothstep(-0.42, 0.58, broad) * 0.46 * detailStrength
  );

  colour = mix(
    colour,
    livingGreen,
    smoothstep(0.02, 0.72, medium) * 0.16 * detailStrength
  );

  colour = mix(
    colour,
    softSage,
    smoothstep(0.36, 0.82, fine) * 0.065 * detailStrength
  );

  return colour;
}

void main() {
  vec2 sampleUv = v_uv;

  vec4 scene =
    texture(u_scene, sampleUv);

  vec3 sourceWater =
    vec3(158.0, 189.0, 255.0) / 255.0;

  float colourDistance =
    distance(
      scene.rgb,
      sourceWater
    );

  float waterMask =
    1.0 - smoothstep(
      0.035,
      0.105,
      colourDistance
    );

  vec2 pixel =
    v_uv * u_resolution;

  vec2 worldPosition =
    u_world_origin +
    pixel * u_world_scale;

  vec3 water =
    livingWater(
      worldPosition,
      u_time
    );

  outColor = vec4(
    mix(
      scene.rgb,
      water,
      waterMask
    ),
    scene.a
  );
}
`

const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type)

  if (!shader) {
    throw new Error(
      'Unable to create living-water shader.',
    )
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (
    !gl.getShaderParameter(
      shader,
      gl.COMPILE_STATUS,
    )
  ) {
    const message =
      gl.getShaderInfoLog(shader) ??
      'Unknown shader compilation failure.'

    gl.deleteShader(shader)
    throw new Error(message)
  }

  return shader
}

const createProgram = (
  gl: WebGL2RenderingContext,
): WebGLProgram => {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource,
  )

  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  )

  const program = gl.createProgram()

  if (!program) {
    throw new Error(
      'Unable to create living-water program.',
    )
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS,
    )
  ) {
    const message =
      gl.getProgramInfoLog(program) ??
      'Unknown shader-link failure.'

    gl.deleteProgram(program)
    throw new Error(message)
  }

  return program
}

class WorldWaterLayer
implements CustomLayerInterface {
  readonly id = 'living-water-world'
  readonly type = 'custom' as const
  readonly renderingMode = '2d' as const

  private map?: Map
  private program?: WebGLProgram
  private sceneTexture?: WebGLTexture
  private vertexArray?: WebGLVertexArrayObject
  private startedAt = performance.now()

  private sceneLocation?: WebGLUniformLocation | null
  private resolutionLocation?: WebGLUniformLocation | null
  private timeLocation?: WebGLUniformLocation | null
  private originLocation?: WebGLUniformLocation | null
  private scaleLocation?: WebGLUniformLocation | null

  onAdd(
    map: Map,
    gl: WebGL2RenderingContext,
  ): void {
    this.map = map
    this.program = createProgram(gl)

    this.sceneTexture =
      gl.createTexture() ?? undefined

    this.vertexArray =
      gl.createVertexArray() ?? undefined

    if (
      !this.sceneTexture ||
      !this.vertexArray
    ) {
      throw new Error(
        'Unable to create living-water GL resources.',
      )
    }

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    )

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR,
    )

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl.LINEAR,
    )

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE,
    )

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl.CLAMP_TO_EDGE,
    )

    this.sceneLocation =
      gl.getUniformLocation(
        this.program,
        'u_scene',
      )

    this.resolutionLocation =
      gl.getUniformLocation(
        this.program,
        'u_resolution',
      )

    this.timeLocation =
      gl.getUniformLocation(
        this.program,
        'u_time',
      )

    this.originLocation =
      gl.getUniformLocation(
        this.program,
        'u_world_origin',
      )

    this.scaleLocation =
      gl.getUniformLocation(
        this.program,
        'u_world_scale',
      )
  }

  render(
    gl: WebGL2RenderingContext,
  ): void {
    if (
      !this.map ||
      !this.program ||
      !this.sceneTexture ||
      !this.vertexArray
    ) {
      return
    }

    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    )

    gl.copyTexImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      0,
      0,
      width,
      height,
      0,
    )

    gl.useProgram(this.program)
    gl.bindVertexArray(this.vertexArray)

    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
gl.blendFunc(
  gl.SRC_ALPHA,
  gl.ONE_MINUS_SRC_ALPHA,
)

    gl.uniform1i(
      this.sceneLocation ?? null,
      0,
    )

    gl.uniform2f(
      this.resolutionLocation ?? null,
      width,
      height,
    )

    gl.uniform1f(
      this.timeLocation ?? null,
      (
        performance.now() -
        this.startedAt
      ) / 1000,
    )

    const centre = this.map.getCenter()
    const zoom = this.map.getZoom()

    const worldScale =
      0.0045 /
      Math.pow(2, zoom - 9.5)

    gl.uniform2f(
      this.originLocation ?? null,
      centre.lng * 0.31,
      centre.lat * -0.31,
    )

    gl.uniform1f(
      this.scaleLocation ?? null,
      worldScale,
    )

    gl.drawArrays(
      gl.TRIANGLES,
      0,
      3,
    )

    gl.bindVertexArray(null)
    this.map.triggerRepaint()
  }

  onRemove(
    _map: Map,
    gl: WebGL2RenderingContext,
  ): void {
    if (this.program) {
      gl.deleteProgram(this.program)
    }

    if (this.sceneTexture) {
      gl.deleteTexture(
        this.sceneTexture,
      )
    }

    if (this.vertexArray) {
      gl.deleteVertexArray(
        this.vertexArray,
      )
    }

    this.map = undefined
    this.program = undefined
    this.sceneTexture = undefined
    this.vertexArray = undefined
  }
}

export const installLivingWater = (
  map: Map,
): void => {
  if (!map.getLayer('water')) {
    throw new Error(
      'Liberty water layer was not found.',
    )
  }

  map.addLayer(
    new WorldWaterLayer(),
    'landcover_sand',
  )
}
