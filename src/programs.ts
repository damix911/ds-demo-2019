import { createProgram } from "./misc";

export class StandardMaterialProgram {
  private program: WebGLProgram;
  private projectViewModelLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.program = createProgram(gl, `
      precision mediump float;

      attribute vec4 a_position;

      uniform mat4 u_projectViewModel;

      void main(void) {
        gl_Position = u_projectViewModel * a_position;
      }
    `, `
      precision mediump float;

      void main(void) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `, {
      "a_position": 0
    });

    this.projectViewModelLocation = gl.getUniformLocation(this.program, "u_projectViewModel");
  }

  use(gl: WebGLRenderingContext) {
    gl.useProgram(this.program);
  }

  setUniforms(gl: WebGLRenderingContext) {
    const n = 0.1;
    const f = 100.0;
    const r = 16 / 9.0;
    const t = 1.0;

    gl.uniformMatrix4fv(this.projectViewModelLocation, false, new Float32Array([
      n / r, 0, 0, 0, 0, n / t, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0
    ]));
  }
}