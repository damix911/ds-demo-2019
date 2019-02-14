import { loadImage, createTexture, createIndexBuffer, createVertexBuffer } from "./misc";
import { Actor } from "./scene";
import { mat4, vec4, vec2, vec3 } from "gl-matrix";
import { Mesh, IGeometry } from "./meshes";
import { StandardProgram, Program, Material, CanopyProgram, WaterProgram, GrassProgram, SmokeProgram, SpriteProgram } from "./programs";
import * as layouts from "./layouts";
import { createCanopyMesh } from "./demo/misc";
import { origin } from "./defs";

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
  private canopyProgram: Program;
  private waterProgram: Program;
  private grassProgram: Program;
  private smokeProgram: Program;
  private spriteProgram: Program;

  // Materials
  private rock: Material;
  private canopy: Material;
  private water: Material;
  private grass: Material;
  private smoke: Material;
  private fire: Material;

  private groundMesh: Mesh;
  private canopyMesh: Mesh;
  private canopyGeometry: IGeometry;
  private waterMesh: Mesh;
  private grassMesh: Mesh;
  private smokeGeometry: IGeometry;
  private diffuseImage: HTMLImageElement;
  private diffuseTexture: WebGLTexture;
  private normalImage: HTMLImageElement;
  private normalTexture: WebGLTexture;
  private leavesImage: HTMLImageElement;
  private leavesTexture: WebGLTexture;
  private wavesImage: HTMLImageElement;
  private wavesTexture: WebGLTexture;
  private smokeImage: HTMLImageElement;
  private smokeTexture: WebGLTexture;

  // Wind
  windAngle: number;
  windSpeed: number;

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
    this.leavesImage = await loadImage("assets/leaves.png");
    this.wavesImage = await loadImage("assets/000.png");
    this.smokeImage = await loadImage("assets/Smoke45Frames.png");
  }

  setWind(windAngle: number, windSpeed: number) {
    this.windAngle = windAngle;
    this.windSpeed = windSpeed;
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
    const actor1 = new Actor(this.groundMesh.slice(0, 18), this.standardProgram, this.rock);
    this.actors.push(actor1);

    const actor2 = new Actor(this.canopyGeometry, this.canopyProgram, this.canopy);
    this.actors.push(actor2);

    const actor3 = new Actor(this.waterMesh.slice(0, 6), this.waterProgram, this.water);
    this.actors.push(actor3);

    const actor4 = new Actor(this.grassMesh.slice(0, 6), this.grassProgram, this.grass);
    this.actors.push(actor4);

    const actor5 = new Actor(this.smokeGeometry, this.smokeProgram, this.smoke);
    this.actors.push(actor5);
    mat4.translate(actor5.model, actor5.model, [200, -900, 0]);

    // const actor6 = new Actor(this.smokeMesh.slice(0, 6), this.smokeProgram, this.smoke);
    // this.actors.push(actor6);
    // mat4.translate(actor6.model, actor6.model, [0, 120, 0]);

    // const actor7 = new Actor(this.smokeMesh.slice(0, 6), this.smokeProgram, this.smoke);
    // this.actors.push(actor7);
    // mat4.translate(actor7.model, actor7.model, [0, 240, 0]);
  }

  private doInitialize(gl: WebGLRenderingContext) {
    // Textures
    this.diffuseTexture = createTexture(gl, this.diffuseImage);
    this.normalTexture = createTexture(gl, this.normalImage);
    this.leavesTexture = createTexture(gl, this.leavesImage);
    this.wavesTexture = createTexture(gl, this.wavesImage);
    this.smokeTexture = createTexture(gl, this.smokeImage);

    // Materials
    this.rock = {
      diffuse: this.diffuseTexture,
      normal: this.normalTexture
    };

    this.canopy = {
      diffuse: this.leavesTexture,
      normal: this.normalTexture
    };

    this.water = {
      waves: this.wavesTexture
    };

    this.grass = {
    };

    this.smoke = {
      texture: this.smokeTexture,
      animationParameters: {
        frames: 45,
        rows: 7,
        cols: 7,
        fps: -10
      },
      period: 10,
      sizeValues: [20, 300],
      sizeEasing: [0.65, 1.64, 1.16, 1.27],
      alphaEasing: [0.1, 10, 0.22, 2.27]
    };

    this.fire = {
      texture: this.smokeTexture,
      animationParameters: {
        frames: 45,
        rows: 7,
        cols: 7,
        fps: -10
      }
    };

    // Programs
    this.standardProgram = new StandardProgram(gl);
    this.canopyProgram = new CanopyProgram(gl);
    this.waterProgram = new WaterProgram(gl);
    this.grassProgram = new GrassProgram(gl);
    this.smokeProgram = new SmokeProgram(gl);
    this.spriteProgram = new SpriteProgram(gl);

    // Meshes
    const pttbn = layouts.PTTBN(gl);
    
    // Ground mesh
    const x = -10539183.811482586 - origin[0];
    const y = 4651153.046248602 - origin[1];
    this.groundMesh = new Mesh(gl, layouts.PTTBN, new Float32Array([
      -50+x + 400, -50+y, 70.0,       0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
       50+x + 400, -50+y, 70.0,     1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      -50+x + 400,  50+y, 70.0,     0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
       50+x + 400,  50+y, 70.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      
      -50+x + 400, -50+y, 0.0,       0, 0,   1, 0, 0,   0, 0, .1,   0, -1, 0,
       50+x + 400, -50+y, 0.0,     1, 0,   1, 0, 0,   0, 0, .1,   0, -1, 0,
      -50+x + 400, -50+y, 70.0,     0, .1,   1, 0, 0,   0, 0, .1,   0, -1, 0,
       50+x + 400, -50+y, 70.0,   1, .1,   1, 0, 0,   0, 0, .1,   0, -1, 0,

      -50+x + 400, 50+y, 0.0,       0, 0,   1, 0, 0,   0, 0, .1,   0, 1, 0,
       50+x + 400, 50+y, 0.0,     1, 0,   1, 0, 0,   0, 0, .1,   0, 1, 0,
      -50+x + 400, 50+y, 70.0,     0, .1,   1, 0, 0,   0, 0, .1,   0, 1, 0,
       50+x + 400, 50+y, 70.0,   1, .1,   1, 0, 0,   0, 0, .1,   0, 1, 0,

      // -0.5, -0.5, 0.0,   0, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      //  0.5, -0.5, 0.0,   1, 0,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      // -0.5,  0.5, 0.0,   0, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1,
      //  0.5,  0.5, 0.0,   1, 1,   1, 0, 0,   0, 1, 0,   0, 0, 1

      // -0.5, 0, -0.5,   0, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      //  0.5, 0, -0.5,   1, 0,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      // -0.5, 0,  0.5,   0, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0,
      //  0.5, 0,  0.5,   1, 1,   1, 0, 0,   0, 0, -1,   0, 1, 0
    ]).buffer, new Uint16Array([
      0, 1, 2,
      1, 3, 2,

      4, 5, 6,
      5, 7, 6,

      8, 9, 10,
      9, 11, 10
    ]).buffer);

    const trees: {x: number, y: number}[] = [
      // {"x": -10538970.571200622, "y": 4651862.067061024},
      // {"x":-10538977.289298838,"y":4651829.223025421},
      // {"x":-10538975.79638813,"y":4651811.606679063},
      // {"x":-10538994.308480913,"y":4651795.781825556},
      // {"x":-10539005.953184437,"y":4651779.658389907},
      // {"x":-10539083.435250213,"y":4651680.97699204},
      // {"x":-10539043.425243216,"y":4651732.93028471},
      // {"x":-10539117.473614376,"y":4651669.630870652},
      // {"x":-10539199.285121225,"y":4651695.906099129},
      // {"x":-10539205.853928344,"y":4651716.806849053},
      // {"x":-10539226.157513985,"y":4651715.015356203},
      // {"x":-10539244.669606775,"y":4651727.555806157}
    ];
    for (let i = 0; i < 10; ++i) {
      for (let j = 0; j < 10; ++j) {
        trees.push({"x":-50+(x + i * 10)+200,"y":-50+(y + j * 10)-300});
      }
    }
    const particlesPerTree = 100;
    this.canopyMesh = createCanopyMesh(gl, trees, particlesPerTree);
    this.canopyGeometry = this.canopyMesh.slice(0, trees.length * particlesPerTree * 6);

    this.waterMesh = new Mesh(gl, layouts.P, new Float32Array([
      -50+x-100, -50+y-300, 0.0,
      50+x-100, -50+y-300, 0.0,
      -50+x-100,  50+y-300, 0.0,
      50+x-100,  50+y-300, 0.0
    ]).buffer, new Uint16Array([
      0, 1, 2,
      1, 3, 2
    ]).buffer);

    this.grassMesh = new Mesh(gl, layouts.P, new Float32Array([
      -50+x+50, -50+y-300, 0.0,
      50+x+50, -50+y-300, 0.0,
      -50+x+50,  50+y-300, 0.0,
      50+x+50,  50+y-300, 0.0
    ]).buffer, new Uint16Array([
      0, 1, 2,
      1, 3, 2
    ]).buffer);

    const smokeParticles = 100;
    const smokeVertexData: number[] = [];
    const smokeIndexData: number[] = [];
    for (let i = 0; i < smokeParticles; ++i) {
      const r0 = Math.random();
      const r1 = Math.random();
      const r2 = Math.random();
      const r3 = Math.random();

      smokeVertexData.push(
        0, 0, 0.0, -0.5, -0.5, r0, r1, r2, r3,
        0, 0, 0.0,  0.5, -0.5, r0, r1, r2, r3,
        0, 0, 0.0, -0.5,  0.5, r0, r1, r2, r3,
        0, 0, 0.0,  0.5,  0.5, r0, r1, r2, r3
      );

      const baseVertex =  i * 4;

      smokeIndexData.push(
        baseVertex + 0, baseVertex + 1, baseVertex + 2,
        baseVertex + 1, baseVertex + 3, baseVertex + 2
      );
    }
    this.smokeGeometry = new Mesh(gl, layouts.POR, new Float32Array(smokeVertexData).buffer, new Uint16Array(smokeIndexData).buffer).slice(0, smokeParticles * 6);

    // We are done
    this.initialized = true;
  }

  private doRender(gl: WebGLRenderingContext) {
    if (this.backgroundColor) {
      const bg = this.backgroundColor;
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    mat4.identity(this.view);
    const d = 1000 * this.resolution;
    mat4.rotateZ(this.view, this.view, -Math.PI * this.rotation / 180);
    this.translation[0] = -(this.center[0] - origin[0]);
    this.translation[1] = -(this.center[1] - origin[1]);
    this.translation[2] = -d;
    mat4.translate(this.view, this.view, this.translation);
    
    mat4.perspective(this.project, 1, gl.canvas.width / gl.canvas.height, d - 100, d + 100);

    this.framePrograms.clear();

    gl.enable(gl.DEPTH_TEST);

    for (const actor of this.actors) {
      const mesh = actor.geometry.mesh;
      const program = actor.program;
      
      program.use(gl);
      mesh.bindToProgram(gl, program);

      if (!this.framePrograms.has(program)) {
        this.framePrograms.add(program);
        this.updateFrameUniforms(gl, program);
      }
  
      if ("updateMaterial" in program && actor.material) {
        program.updateMaterial(gl, actor.material);
      }
      
      this.updateActorUniforms(gl, program, actor);
      
      gl.depthFunc(gl.LEQUAL);
      actor.draw(gl);
    }
  }

  private doDispose(gl: WebGLRenderingContext) {
    gl.deleteTexture(this.diffuseTexture);
    gl.deleteTexture(this.normalTexture);
    gl.deleteTexture(this.leavesTexture);
    gl.deleteTexture(this.wavesTexture);
    gl.deleteTexture(this.smokeTexture);
    this.groundMesh.dispose(gl);
    this.canopyMesh.dispose(gl);
    this.waterMesh.dispose(gl);
    this.grassMesh.dispose(gl);
    //this.smokeMesh.dispose(gl);
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

    if ("updateFrameSize" in program) {
      program.updateFrameSize(gl, gl.canvas.width, gl.canvas.height);
    }

    if ("updateWind" in program) {
      program.updateWind(gl, this.windAngle, this.windSpeed);
    }
  }

  private updateActorUniforms(gl: WebGLRenderingContext, program: Program, actor: Actor) {
    if ("updateModel" in program) {
      program.updateModel(gl, actor.model);
    }
  }
}
