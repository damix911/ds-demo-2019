import { IGeometry } from "./meshes";
import { mat4 } from "gl-matrix";
import { Program, Material } from "./programs";

export class Actor {
  public model = mat4.create();
  public blendMode: "opaque" | "add" | "alpha" = "opaque";

  constructor(public geometry: IGeometry, public program: Program, public material?: Material) {
  }

  draw(gl: WebGLRenderingContext) {
    this.geometry.draw(gl);
  }
}
