import { IndexedVertexStream } from "./meshes";
import { mat4 } from "gl-matrix";
import { Program, Material } from "./programs";

export class Actor {
  public model = mat4.create();

  constructor(public indexedStream: IndexedVertexStream, public indexFrom: number, public indexCount: number, public program: Program, public material: Material) {
  }
}