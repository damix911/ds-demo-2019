export interface IAttribute {
  name: string;
  size: number;
  type: number;
  normalized: boolean;
  stride: number;
  offset: number;
}

export type VertexLayout = (gl: WebGLRenderingContext) => IAttribute[];

export const PTTBNOR = (gl: WebGLRenderingContext) => [
  {
    name: "a_position",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 0
  },
  {
    name: "a_texcoord",
    size: 2,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 12
  },
  {
    name: "a_tangent",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 20
  },
  {
    name: "a_binormal",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 32
  },
  {
    name: "a_normal",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 44
  },
  {
    name: "a_offset",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 56
  },
  {
    name: "a_random",
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 80,
    offset: 68
  }
];

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
