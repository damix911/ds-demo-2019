import { StandardProgram, ForestProgram } from "./programs";
import { VertexBinding, VertexStream, IndexedVertexStream } from "./meshes";
import { createVertexBuffer, createIndexBuffer, loadTexture } from "./misc";
import { mat4 } from "gl-matrix";
import { Prop } from "./scene";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");

const standardMaterial = new StandardProgram(gl);
const forestMaterial = new ForestProgram(gl);

const vertexBuffer1 = createVertexBuffer(gl, new Float32Array([
  -0.5, 0, -0.5,   0, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
   0.5, 0, -0.5,   1, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
  -0.5, 0,  0.5,   0, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0,
   0.5, 0,  0.5,   1, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0
]).buffer);

// const vertexBuffer = createVertexBuffer(gl, new Float32Array([
//   -0.5, -0.5, 0.0,   0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
//    0.5, -0.5, 0.0,   1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
//   -0.5,  0.5, 0.0,   0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
//    0.5,  0.5, 0.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1
// ]).buffer);

const indexBuffer1 = createIndexBuffer(gl, new Uint16Array([
  0, 1, 2,
  1, 3, 2
]).buffer);

const forestVertices: number[] = [];
const forestIndices: number[] = [];

for (let j = 0; j < 11; ++j) {
  for (let i = 0; i < 11; ++i) {
    forestVertices.push(
      -0.03 + i * 0.1 - 0.5, 0, j * 0.1 - 0.5,   0, 0,      0, 0, 1,
      0.03 + i * 0.1 - 0.5, 0, j * 0.1 - 0.5,   1, 0,       0, 0, 1,
     -0.03 + i * 0.1 - 0.5, 0.2, j * 0.1 - 0.5,   0, 0.5,   0, 0, 1,
      0.03 + i * 0.1 - 0.5, 0.2, j * 0.1 - 0.5,   1, 0.5,   0, 0, 1,
      -0.03 + i * 0.1 - 0.5, 0.4, j * 0.1 - 0.5,   0, 1,    0, 0, 1,
      0.03 + i * 0.1 - 0.5, 0.4, j * 0.1 - 0.5,   1, 1,     0, 0, 1
    );
    const baseVertex = (i + j * 11) * 6;
    forestIndices.push(baseVertex + 0, baseVertex + 1, baseVertex + 2, baseVertex + 1, baseVertex + 3, baseVertex + 2);
    forestIndices.push(baseVertex + 2, baseVertex + 3, baseVertex + 4, baseVertex + 3, baseVertex + 5, baseVertex + 4);
  }
}



const vertexBuffer2 = createVertexBuffer(gl, new Float32Array(forestVertices).buffer);

const indexBuffer2 = createIndexBuffer(gl, new Uint16Array(forestIndices).buffer);

const binding1 = new VertexBinding(vertexBuffer1, [
  {
    location: 0,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 0
  },
  {
    location: 1,
    size: 2,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 12
  },
  {
    location: 2,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 20
  },
  {
    location: 3,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 32
  },
  {
    location: 4,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 56,
    offset: 44
  }
]);

const binding2 = new VertexBinding(vertexBuffer2, [
  {
    location: 0,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 0
  },
  {
    location: 1,
    size: 2,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 12
  },
  {
    location: 2,
    size: 3,
    type: gl.FLOAT,
    normalized: false,
    stride: 32,
    offset: 20
  }
]);

const indexedStream1 = new IndexedVertexStream(new VertexStream([binding1]), indexBuffer1);
const indexedStream2 = new IndexedVertexStream(new VertexStream([binding2]), indexBuffer2);

const view = mat4.create();
mat4.identity(view);
const project = mat4.create();
mat4.perspective(project, 1, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

const props: Prop[] = [];
const prop1 = new Prop(indexedStream1, standardMaterial, 0, 6);
props.push(prop1);
const prop2 = new Prop(indexedStream2, forestMaterial, 0, forestIndices.length);
props.push(prop2);

Promise.all([
  loadTexture(gl, "assets/grass-blade.png"),
  loadTexture(gl, "assets/wallbrickmixed256x256_2048x2048_02_nrm2.png")
]).then(values => {
  const texture = values[0];
  const normal = values[1];

  function frame() {
    gl.clearColor(0.2, 0.3, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.disable(gl.BLEND);
    // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // gl.enable(gl.DEPTH_TEST);

    for (const prop of props) {
      const indexedStream = prop.indexedStream;
      const material = prop.material as any;

      indexedStream.bind(gl);
      material.use(gl);

      material.updateView(gl, view);
      material.updateProject(gl, project);


      mat4.identity(prop.model);
      mat4.translate(prop.model, prop.model, [0, -0.8, -2]);
      mat4.rotateY(prop.model, prop.model, 0.3 * Math.cos(performance.now() / 1000.0));
      mat4.rotateX(prop.model, prop.model, 0.3 * Math.cos(1.0 + 0.7 * performance.now() / 1000.0));
      material.updateModel(gl, prop.model);
      
      if (material.updateTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        material.updateTexture(gl, 0);
      }

      if (material.updateNormal) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normal);
        material.updateNormal(gl, 1);
      }

      if (material.updateTime) {
        material.updateTime(gl, performance.now() / 1000.0);
      }
      
      gl.drawElements(gl.TRIANGLES, prop.indexCount, gl.UNSIGNED_SHORT, 2 * prop.indexFrom);
    }

    requestAnimationFrame(frame);
  }
  
  requestAnimationFrame(frame);
});
