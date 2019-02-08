import { IndexedVertexStream } from "./meshes";
import { mat4 } from "gl-matrix";
import { GrassProgram } from "./programs";

export class Prop {
  public model = mat4.create();

  constructor(public indexedStream: IndexedVertexStream, public material: GrassProgram) {
  }
}