export interface IAttribute {
  location: number;
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

  bind(gl: WebGLRenderingContext) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    for (const attribute of this.attributes) {
      gl.enableVertexAttribArray(attribute.location);
      gl.vertexAttribPointer(attribute.location, attribute.size, attribute.type, attribute.normalized, attribute.stride, attribute.offset);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

export class VertexStream {
  private vertexBindings: VertexBinding[];

  constructor(vertexBindings: VertexBinding[]) {
    this.vertexBindings = vertexBindings;
  }

  bind(gl: WebGLRenderingContext) {
    for (const binding of this.vertexBindings) {
      binding.bind(gl);
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

  bind(gl: WebGLRenderingContext) {
    this.vertexStream.bind(gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }
}
