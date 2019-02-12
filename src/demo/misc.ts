import { Mesh } from "../meshes";
import { PTTBNOR } from "../layouts";

function noise() {
  return Math.random() * 0.1 - 0.05;
}

export function createCanopyMesh(gl: WebGLRenderingContext, trees: number, particlesPerTree: number): Mesh {
  const x = -10538200;
  const y = 4650950;

  const vertexData: number[] = [];
  const indexData: number[] = [];

  for (let i = 0; i < trees; ++i) {
    const px = x + 1000 * (Math.random() * 2 - 1);
    const py = y + 1000 * (Math.random() * 2 - 1);

    for (let j = 0; j < particlesPerTree; ++j) {
      const r0 = Math.random();
      const r1 = Math.random();
      const r2 = Math.random();

      const tbn = [
        1 + noise(), 0, 0,
        0, 1 + noise(), 0,
        0, 0, 1 + noise()
      ];
      vertexData.push(
        px, py, 70.0 + i / 100.0,     0, 0,     tbn[0], tbn[1], tbn[2],    tbn[3], tbn[4], tbn[5],    tbn[6], tbn[7], tbn[8],    -200, -200, 0, r0, r1, r2,
        px, py, 70.0 + i / 100.0,     1, 0,     tbn[0], tbn[1], tbn[2],    tbn[3], tbn[4], tbn[5],    tbn[6], tbn[7], tbn[8],     200, -200, 0, r0, r1, r2,
        px, py, 70.0 + i / 100.0,     0, 1,     tbn[0], tbn[1], tbn[2],    tbn[3], tbn[4], tbn[5],    tbn[6], tbn[7], tbn[8],    -200,  200, 0, r0, r1, r2,
        px, py, 70.0 + i / 100.0,     1, 1,     tbn[0], tbn[1], tbn[2],    tbn[3], tbn[4], tbn[5],    tbn[6], tbn[7], tbn[8],     200,  200, 0, r0, r1, r2,
      );

      const baseVertex = i * 4;

      indexData.push(
        baseVertex + 0, baseVertex + 1, baseVertex + 2,
        baseVertex + 1, baseVertex + 3, baseVertex + 2
      );
    }
  }

  const mesh = new Mesh(gl, PTTBNOR, new Float32Array(vertexData).buffer, new Uint16Array(indexData).buffer);

  return mesh;
}