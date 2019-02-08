import { GrassProgram } from "./programs";
import { VertexBinding, VertexStream, IndexedVertexStream } from "./meshes";
import { createVertexBuffer, createIndexBuffer, loadTexture } from "./misc";
import { mat4 } from "gl-matrix";
import { Prop } from "./scene";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");

const standardMaterial = new GrassProgram(gl);

// const vertexBuffer = createVertexBuffer(gl, new Float32Array([
//   -0.5, -0.8, -0.5,   0, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
//    0.5, -0.8, -0.5,   1, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
//   -0.5, -0.8,  0.5,   0, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0,
//    0.5, -0.8,  0.5,   1, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0
// ]).buffer);

const vertexBuffer = createVertexBuffer(gl, new Float32Array([
  -0.5, -0.5, 0.0,   0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
   0.5, -0.5, 0.0,   1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
  -0.5,  0.5, 0.0,   0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
   0.5,  0.5, 0.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1
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

const stream = new VertexStream([binding]);

const indexedStream = new IndexedVertexStream(stream, indexBuffer);

const view = mat4.create();
mat4.identity(view);
const project = mat4.create();
mat4.perspective(project, 1, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

const props: Prop[] = [];
const prop1 = new Prop(indexedStream, standardMaterial);
props.push(prop1);
const prop2 = new Prop(indexedStream, standardMaterial);
props.push(prop2);
const prop3 = new Prop(indexedStream, standardMaterial);
props.push(prop3);

loadTexture(gl, "assets/wallbrickmixed256x256_2048x2048_02_nrm2.png").then(normal => {

  function frame() {
    gl.clearColor(0.2, 0.3, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    let i = 0;

    for (const prop of props) {
      const indexedStream = prop.indexedStream;
      const material = prop.material;

      indexedStream.bind(gl);
      material.use(gl);

      material.updateView(gl, view);
      material.updateProject(gl, project);


      mat4.identity(prop1.model);
      mat4.translate(prop1.model, prop1.model, [i - 1, 0, -2]);
      mat4.rotateY(prop1.model, prop1.model, 0.3 * Math.cos(performance.now() / 1000.0));
      mat4.rotateX(prop1.model, prop1.model, 0.3 * Math.cos(1.0 + 0.7 * performance.now() / 1000.0));
      material.updateModel(gl, prop1.model);
      
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, normal);
      material.updateNormal(gl, 1);
      
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      ++i;
    }

    requestAnimationFrame(frame);
  }
  
  requestAnimationFrame(frame);
});
