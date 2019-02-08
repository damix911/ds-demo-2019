import { StandardMaterialProgram } from "./programs";
import { VertexBinding, VertexStream, IndexedVertexStream } from "./meshes";
import { createVertexBuffer, createIndexBuffer } from "./misc";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");

gl.clearColor(0.2, 0.3, 0.5, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

const standardMaterial = new StandardMaterialProgram(gl);

const vertexBuffer = createVertexBuffer(gl, new Float32Array([
  -0.5, -1, -0.5 - 1,
   0.5, -1, -0.5 - 1,
  -0.5, -1,  0.5 - 1,
   0.5, -1,  0.5 - 1
]).buffer);

const indexBuffer = createIndexBuffer(gl, new Uint16Array([
  0, 1, 2,
  1, 3, 2
]).buffer);

const binding = new VertexBinding(vertexBuffer, [
  {
    location: 0,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 12,
    offset: 0
  }
]);

const stream = new VertexStream([binding]);

const indexedStream = new IndexedVertexStream(stream, indexBuffer);

indexedStream.bind(gl);

standardMaterial.use(gl);
standardMaterial.setUniforms(gl);

gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);