export function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string, locations: {[attributeName: string]: number}): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  console.log(gl.getShaderInfoLog(vs));
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  console.log(gl.getShaderInfoLog(fs));

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  for (const attributeName in locations) {
    gl.bindAttribLocation(program, locations[attributeName], attributeName);
  }
  gl.linkProgram(program);
  console.log(gl.getProgramInfoLog(program));

  return program;
}

export function createVertexBuffer(gl: WebGLRenderingContext, vertexData: ArrayBuffer): WebGLBuffer {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vertexBuffer;
}

export function createIndexBuffer(gl: WebGLRenderingContext, indexData: ArrayBuffer): WebGLBuffer {
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return indexBuffer;
}