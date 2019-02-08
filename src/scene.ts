import { IndexedVertexStream } from "./meshes";
import { mat4 } from "gl-matrix";
import { IProgram } from "./programs";

export class Prop {
  public model = mat4.create();

  constructor(public indexedStream: IndexedVertexStream, public material: IProgram, public indexFrom: number, public indexCount: number) {
  }
}