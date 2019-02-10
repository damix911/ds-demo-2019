import { Program } from "./programs";

export interface IAttribute {
  name: string;
  size: number;
  type: number;
  normalized: boolean;
  stride: number;
  offset: number;
}

export class VertexBinding {
  private vertexBuffer: WebGLBuffer;
  private attributes: IAttribute[];

  constructor(vertexBuffer: WebGLBuffer, attributes: IAttribute[]) {
    this.vertexBuffer = vertexBuffer;
    this.attributes = attributes;
  }

  bindToProgram(gl: WebGLRenderingContext, program: Program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    for (const attribute of this.attributes) {
      const location = program.locations[attribute.name];
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, attribute.size, attribute.type, attribute.normalized, attribute.stride, attribute.offset);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

export class VertexStream {
  private vertexBindings: VertexBinding[];

  constructor(vertexBindings: VertexBinding[]) {
    this.vertexBindings = vertexBindings;
  }

  bindToProgram(gl: WebGLRenderingContext, program: Program) {
    for (let i = 0; i < 8; ++i) {
      gl.disableVertexAttribArray(i);
    }

    for (const binding of this.vertexBindings) {
      binding.bindToProgram(gl, program);
    }
  }
}

export class IndexedVertexStream {
  private vertexStream: VertexStream;
  private indexBuffer: WebGLBuffer;

  constructor(vertexStream: VertexStream, indexBuffer: WebGLBuffer) {
    this.vertexStream = vertexStream;
    this.indexBuffer = indexBuffer;
  }

  bindToProgram(gl: WebGLRenderingContext, program: Program) {
    this.vertexStream.bindToProgram(gl, program);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }
}
