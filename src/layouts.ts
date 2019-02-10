export const PTTBN = (gl: WebGLRenderingContext) => [
  {
    name: "a_position",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 0
  },
  {
    name: "a_texcoord",
    size: 2,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 12
  },
  {
    name: "a_tangent",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 20
  },
  {
    name: "a_binormal",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 32
  },
  {
    name: "a_normal",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 44
  }
];

export const PTN = (gl: WebGLRenderingContext) => [
  {
    name: "a_position",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 0
  },
  {
    name: "a_texcoord",
    size: 2,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 12
  },
  {
    name: "a_normal",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 20
  }
];
