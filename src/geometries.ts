// Create

import { Mesh } from "./meshes";
import { PTOR } from "./layouts";

function noise() {
  return Math.random() * 0.1 - 0.05;
}

function uniformCircle() {
  let rx = Math.random() * 2 - 1;
  let ry = Math.random() * 2 - 1;

  do {
    rx = Math.random() * 2 - 1;
    ry = Math.random() * 2 - 1;
  } while (rx * rx + ry * ry > 1);

  return [rx, ry];
}

export function createCanopyMesh(gl: WebGLRenderingContext, trees: any[], particlesPerTree: number): Mesh {
  const vertexData: number[] = [];
  const indexData: number[] = [];

  for (let i = 0; i < trees.length; ++i) {
    const px = trees[i].x;
    const py = trees[i].y;

    for (let j = 0; j < particlesPerTree; ++j) {
      const [r0, r1] = uniformCircle();
      const r2 = Math.random();

      const tbn = [
        1 + noise(), 0, 0,
        0, 1 + noise(), 0,
        0, 0, 1 + noise()
      ];
      vertexData.push(
        px, py, 10 * j / particlesPerTree,     0, 0,     -15, -15, 0, r0, r1, r2,
        px, py, 10 * j / particlesPerTree,     1, 0,      15, -15, 0, r0, r1, r2,
        px, py, 10 * j / particlesPerTree,     0, 1,     -15,  15, 0, r0, r1, r2,
        px, py, 10 * j / particlesPerTree,     1, 1,      15,  15, 0, r0, r1, r2,
      );

      const baseVertex = (i * particlesPerTree + j) * 4;

      indexData.push(
        baseVertex + 0, baseVertex + 1, baseVertex + 2,
        baseVertex + 1, baseVertex + 3, baseVertex + 2
      );
    }
  }

  const mesh = new Mesh(gl, PTOR, new Float32Array(vertexData).buffer, new Uint16Array(indexData).buffer);

  return mesh;
}
