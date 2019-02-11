import { loadImage, createTexture, createIndexBuffer, createVertexBuffer } from "./misc";
import { Actor } from "./scene";
import { mat4, vec4, vec2, vec3 } from "gl-matrix";
import { IndexedVertexStream, VertexStream, VertexBinding } from "./meshes";
import { StandardProgram, Program, Material } from "./programs";
import * as layouts from "./layouts";

export class Application {
  private initialized = false;
  private disposed = false;

  // All the objects in the scene
  private actors: Actor[] = [];

  // Per-frame uniforms
  private view: mat4 = mat4.create();
  private project: mat4 = mat4.create();

  // Programs whose per-frame uniforms have been set
  private framePrograms = new Set<Program>();

  // Programs
  private standardProgram: Program;

  // Materials
  private rock: Material;

  private meshGround: IndexedVertexStream;
  private vbGround: WebGLBuffer;
  private ibGround: WebGLBuffer;
  private diffuseImage: HTMLImageElement;
  private diffuseTexture: WebGLTexture;
  private normalImage: HTMLImageElement;
  private normalTexture: WebGLTexture;

  // View - original
  center = vec2.fromValues(0, 0);
  rotation = 0;
  resolution = 1;
  // View - processed
  translation = vec3.create();

  constructor(private backgroundColor?: vec4) {
  }

  async load() {
    this.diffuseImage = await loadImage("assets/60b963f8b67ad2df8c49e82e9ef625fb.jpg");
    this.normalImage = await loadImage("assets/wallbrickmixed256x256_2048x2048_02_nrm2.png");
  }

  setView(center: [number, number], rotation: number, resolution: number) {
    this.center[0] = center[0];
    this.center[1] = center[1];
    this.rotation = rotation;
    this.resolution = resolution;
  }

  render(gl: WebGLRenderingContext) {
    if (this.initialized && this.disposed) {
      this.doDispose(gl);
      return;
    }

    if (this.disposed) {
      return;
    }

    if (!this.initialized && !this.disposed) {
      this.doInitialize(gl);
      this.sceneSetup();
    }

    this.doUpdate();
    this.doRender(gl);
  }

  dispose() {
    this.disposed = true;
  }

  private doUpdate() {
    const actor = this.actors[0];

    mat4.identity(actor.model);
    mat4.translate(actor.model, actor.model, [0, 0, 0]);
    // mat4.rotateY(actor.model, actor.model, 0.1 * Math.cos(performance.now() / 1000.0));
    // mat4.rotateX(actor.model, actor.model, 0.1 * Math.cos(1.0 + 0.7 * performance.now() / 1000.0));
  }

  private sceneSetup() {
    const actor = new Actor(this.meshGround, 0, 18, this.standardProgram, this.rock);
    
    this.actors.push(actor);
  }

  private doInitialize(gl: WebGLRenderingContext) {
    // Textures
    this.diffuseTexture = createTexture(gl, this.diffuseImage);
    this.normalTexture = createTexture(gl, this.normalImage);

    // Materials
    this.rock = {
      diffuse: this.diffuseTexture,
      normal: this.normalTexture
    };

    // Programs
    this.standardProgram = new StandardProgram(gl);

    // Meshes
    const pttbn = layouts.PTTBN(gl);
    
    // Ground mesh
    const x = -10539183.811482586;
    const y = 4651153.046248602;
    this.vbGround = createVertexBuffer(gl, new Float32Array([
      -500+x, -500+y, 70.0,       0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
       500+x, -500+y, 70.0,     1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      -500+x,  500+y, 70.0,     0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
       500+x,  500+y, 70.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      
      -500+x, -500+y, 0.0,       0, 0,   1, 0, 0,   0, 0, .1,   0, -1, 0,
       500+x, -500+y, 0.0,     1, 0,   1, 0, 0,   0, 0, .1,   0, -1, 0,
      -500+x, -500+y, 70.0,     0, .1,   1, 0, 0,   0, 0, .1,   0, -1, 0,
       500+x, -500+y, 70.0,   1, .1,   1, 0, 0,   0, 0, .1,   0, -1, 0,

       -500+x, 500+y, 0.0,       0, 0,   1, 0, 0,   0, 0, .1,   0, 1, 0,
       500+x, 500+y, 0.0,     1, 0,   1, 0, 0,   0, 0, .1,   0, 1, 0,
      -500+x, 500+y, 70.0,     0, .1,   1, 0, 0,   0, 0, .1,   0, 1, 0,
       500+x, 500+y, 70.0,   1, .1,   1, 0, 0,   0, 0, .1,   0, 1, 0,

      // -0.5, -0.5, 0.0,   0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      //  0.5, -0.5, 0.0,   1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      // -0.5,  0.5, 0.0,   0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      //  0.5,  0.5, 0.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1

      // -0.5, 0, -0.5,   0, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      //  0.5, 0, -0.5,   1, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      // -0.5, 0,  0.5,   0, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      //  0.5, 0,  0.5,   1, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0
    ]).buffer);
    this.ibGround = createIndexBuffer(gl, new Uint16Array([
      0, 1, 2,
      1, 3, 2,

      4, 5, 6,
      5, 7, 6,

      8, 9, 10,
      9, 11, 10
    ]).buffer);
    const bindingGround = new VertexBinding(this.vbGround, pttbn);
    this.meshGround = new IndexedVertexStream(new VertexStream([bindingGround]), this.ibGround);

    // We are done
    this.initialized = true;
  }

  private doRender(gl: WebGLRenderingContext) {
    if (this.backgroundColor) {
      const bg = this.backgroundColor;
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    mat4.identity(this.view);
    const d = 850 * this.resolution;
    mat4.rotateZ(this.view, this.view, -Math.PI * this.rotation / 180);
    this.translation[0] = -this.center[0];
    this.translation[1] = -this.center[1];
    this.translation[2] = -d;
    mat4.translate(this.view, this.view, this.translation);
    
    mat4.perspective(this.project, 1, gl.canvas.width / gl.canvas.height, d - 100, d + 100);

    this.framePrograms.clear();

    gl.enable(gl.DEPTH_TEST);

    for (const actor of this.actors) {
      const indexedStream = actor.indexedStream;
      const program = actor.program;
      
      program.use(gl);
      indexedStream.bindToProgram(gl, program);

      if (!this.framePrograms.has(program)) {
        this.framePrograms.add(program);
        this.updateFrameUniforms(gl, program);
      }
  
      if ("applyMaterial" in program) {
        program.applyMaterial(gl, actor.material);
      }
      
      this.updateActorUniforms(gl, program, actor);
      
      gl.drawElements(gl.TRIANGLES, actor.indexCount, gl.UNSIGNED_SHORT, 2 * actor.indexFrom);
    }
  }

  private doDispose(gl: WebGLRenderingContext) {
    gl.deleteTexture(this.diffuseTexture);
    gl.deleteTexture(this.normalTexture);
  }

  private updateFrameUniforms(gl: WebGLRenderingContext, program: Program) {
    if ("updateView" in program) {
      program.updateView(gl, this.view);
    }

    if ("updateProject" in program) {
      program.updateProject(gl, this.project);
    }

    if ("updateTime" in program) {
      program.updateTime(gl, performance.now() / 1000.0);
    }
  }

  private updateActorUniforms(gl: WebGLRenderingContext, program: Program, actor: Actor) {
    if ("updateModel" in program) {
      program.updateModel(gl, actor.model);
    }
  }
}
