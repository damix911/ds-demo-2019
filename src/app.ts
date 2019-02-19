import { loadImage, createTexture, createIndexBuffer, createVertexBuffer, loadJson } from "./misc";
import { Actor } from "./scene";
import { mat4, vec4, vec2, vec3 } from "gl-matrix";
import { Mesh, IGeometry } from "./meshes";
import { StandardProgram, Program, Material, CanopyProgram, WaterProgram, GrassProgram, SmokeProgram, SpriteProgram } from "./programs";
import * as layouts from "./layouts";
import { createCanopyMesh } from "./demo/misc";
import { origin } from "./defs";
import earcut from "earcut";

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
  private waterGeometry: IGeometry;
  private grassMesh: Mesh;
  private smokeGeometry: IGeometry;
  private fireGeometry: IGeometry;
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
  private grassImage: HTMLImageElement;
  private grassTexture: WebGLTexture;
  private dirtImage: HTMLImageElement;
  private dirtTexture: WebGLTexture;
  private fireImage: HTMLImageElement;
  private fireTexture: WebGLTexture;
  private middleCreek: any;

  // Wind
  windAngle: number;
  windSpeed: number;

  // Atmosphere
  sunElevation: number;
  sunAzimuth: number;
  sunColor: vec3;
  skyColor: vec3;

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
    this.leavesImage = await loadImage("assets/Tree.png");
    this.wavesImage = await loadImage("assets/000.png");
    this.smokeImage = await loadImage("assets/Smoke45Frames.png");
    this.grassImage = await loadImage("assets/grass.jpg");
    this.dirtImage = await loadImage("assets/dirt.png");
    this.fireImage = await loadImage("assets/13221-v6.jpg");
    this.middleCreek = await loadJson("assets/MiddleCreek.json");
  }

  setWind(windAngle: number, windSpeed: number) {
    this.windAngle = windAngle;
    this.windSpeed = windSpeed;
  }

  setAtmosphere(sunElevation: number, sunAzimuth: number, sunColor: vec3, skyColor: vec3) {
    this.sunElevation = sunElevation;
    this.sunAzimuth = sunAzimuth;
    this.sunColor = sunColor;
    this.skyColor = skyColor;
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
    // const actor1 = new Actor(this.groundMesh.slice(0, 18), this.standardProgram, this.rock);
    // this.actors.push(actor1);


    const fires = [
      [-10539069.286145981, 4651690.313822922],
      [-10539274.561368467, 4651743.013570938],
      [-10539221.41374723, 4651711.36386391],
      [-10539168.863290278, 4651686.880128284],
      [-10539137.21358325, 4651681.5056497315],
      [-10539030.321176492, 4651747.790885207],
      [-10538992.102662344, 4651800.938506444],
      [-10538974.78489812, 4651836.171199174]
    ];

    const water = new Actor(this.waterGeometry, this.waterProgram, this.water);
    water.blendMode = "alpha";
    this.actors.push(water);

    for (const point of fires) {
      const fire = new Actor(this.fireGeometry, this.spriteProgram, this.fire);
      fire.blendMode = "add";
      this.actors.push(fire);
      mat4.translate(fire.model, fire.model, [point[0] - origin[0], point[1] - origin[1], 0]);
    }

    const actor2 = new Actor(this.canopyGeometry, this.canopyProgram, this.canopy);
    actor2.blendMode = "alpha";
    this.actors.push(actor2);

    // const grass = new Actor(this.grassMesh.slice(0, 30), this.grassProgram, this.grass);
    // grass.blendMode = "alpha";
    // this.actors.push(grass);







    for (const point of fires) {
      const smoke = new Actor(this.smokeGeometry, this.smokeProgram, this.smoke);
      smoke.blendMode = "alpha";
      this.actors.push(smoke);
      mat4.translate(smoke.model, smoke.model, [point[0] - origin[0], point[1] - origin[1], 0]);
    }

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
    this.wavesTexture = createTexture(gl, this.wavesImage, false);
    this.smokeTexture = createTexture(gl, this.smokeImage);
    this.grassTexture = createTexture(gl, this.grassImage);
    this.dirtTexture = createTexture(gl, this.dirtImage);
    this.fireTexture = createTexture(gl, this.fireImage);

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
      grass: this.grassTexture,
      dirt: this.dirtTexture
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
      size: [10, 10],
      texture: this.fireTexture,
      animationParameters: {
        frames: 16,
        rows: 4,
        cols: 4,
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
      {x: -85, y: -120},
      {x: -85, y: -40},
      {x: -115, y: -40},
      {x: -85, y: -40},
      {x: -55, y: -20},
      {x: -115, y: -60},
      // {x: -85, y: -40},
      // {x: -85, y: -40},
      // {x: -85, y: -120},
      // {x: -85, y: -120},
      // {x: -85, y: -120}
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
    // for (let i = 0; i < 1; ++i) {
    //   for (let j = 0; j < 1; ++j) {
    //     trees.push({"x":-50+(x + i * 20)+200,"y":-50+(y + j * 20)-300});
    //   }
    // }
    const particlesPerTree = 5;
    this.canopyMesh = createCanopyMesh(gl, trees, particlesPerTree);
    this.canopyGeometry = this.canopyMesh.slice(0, trees.length * particlesPerTree * 6);













    // {
    //   const x = 0;
    //   const y = 0;
    //   this.waterMesh = new Mesh(gl, layouts.PS, new Float32Array([
    //     -50+x+100, -50+y-300, 0.1, 1,
    //     50+x+100, -50+y-300, 0.1, 1,
    //     -50+x+100,  50+y-300, 0.1, 1,
    //     50+x+100,  50+y-300, 0.1, 1,

    //     -80+x+100, -80+y-300, 0.1, 0,
    //     80+x+100, -80+y-300, 0.1, 0,
    //     -80+x+100,  80+y-300, 0.1, 0,
    //     80+x+100,  80+y-300, 0.1, 0
    //   ]).buffer, new Uint16Array([
    //     0, 1, 2,
    //     1, 3, 2,

    //     4, 1, 0,
    //     4, 5, 1,

    //     5, 3, 1,
    //     5, 7, 3,
        
    //     7, 2, 3,
    //     7, 6, 2,

    //     6, 4, 0,
    //     6, 0, 2
    //   ]).buffer);
    // }

    {
      // this.middleCreek
      // const lake = earcut();
      const flattened = earcut.flatten(this.middleCreek.feature.geometry.rings);
      const indices = earcut(flattened.vertices, flattened.holes, flattened.dimensions);
      const vertices: number[] = [];
      for (let i = 0; i < flattened.vertices.length; i += 2) {
        const x = flattened.vertices[i + 0] - origin[0];
        const y = flattened.vertices[i + 1] - origin[1];
        vertices.push(x, y, 0.1, 1);
      }
      this.waterGeometry = new Mesh(gl, layouts.PS, new Float32Array(vertices).buffer, new Uint16Array(indices).buffer).slice(0, indices.length);
    }
















    this.grassMesh = new Mesh(gl, layouts.PS, new Float32Array([
      x-200, y-490, 0.0, 1,
      x+320, y-490, 0.0, 1,
      x-200, y-200, 0.0, 1,
      x+320, y-200, 0.0, 1,

      x-230, y-520, 0.0, 0,
      x+350, y-520, 0.0, 0,
      x-230, y-170, 0.0, 0,
      x+350, y-170, 0.0, 0
    ]).buffer, new Uint16Array([
      0, 1, 2,
      1, 3, 2,

      4, 1, 0,
      4, 5, 1,

      5, 3, 1,
      5, 7, 3,
      
      7, 2, 3,
      7, 6, 2,

      6, 4, 0,
      6, 0, 2
    ]).buffer);

    const smokeParticles = 30;
    const smokeVertexData: number[] = [];
    const smokeIndexData: number[] = [];
    for (let i = 0; i < smokeParticles; ++i) {
      const r0 = Math.random();
      const r1 = Math.random();
      const r2 = Math.random();
      const r3 = Math.random();

      smokeVertexData.push(
        0, 0, 0.2, -0.5, -0.5, r0, r1, r2, r3,
        0, 0, 0.2,  0.5, -0.5, r0, r1, r2, r3,
        0, 0, 0.2, -0.5,  0.5, r0, r1, r2, r3,
        0, 0, 0.2,  0.5,  0.5, r0, r1, r2, r3
      );

      const baseVertex = i * 4;

      smokeIndexData.push(
        baseVertex + 0, baseVertex + 1, baseVertex + 2,
        baseVertex + 1, baseVertex + 3, baseVertex + 2
      );
    }
    this.smokeGeometry = new Mesh(gl, layouts.POR, new Float32Array(smokeVertexData).buffer, new Uint16Array(smokeIndexData).buffer).slice(0, smokeParticles * 6);

    this.fireGeometry = new Mesh(gl, layouts.PO, new Float32Array([
      0, 0, 0.0, -0.5, -0.5,
      0, 0, 0.0,  0.5, -0.5,
      0, 0, 0.0, -0.5,  0.5,
      0, 0, 0.0,  0.5,  0.5
    ]).buffer, new Uint16Array([
      0, 1, 2,
      1, 3, 2
    ]).buffer).slice(0, 6);

    // We are done
    this.initialized = true;
  }

  private doRender(gl: WebGLRenderingContext) {
    if (this.backgroundColor) {
      const bg = this.backgroundColor;
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    const near = 0.1;
    const far = 100;

    mat4.identity(this.view);
    //const d = 840 * this.resolution;
    mat4.rotateZ(this.view, this.view, -Math.PI * this.rotation / 180);
    this.translation[0] = -(this.center[0] - origin[0]);
    this.translation[1] = -(this.center[1] - origin[1]);
    this.translation[2] = -far;
    mat4.translate(this.view, this.view, this.translation);
    
    // console.log("W,H", gl.canvas.width, gl.canvas.height);
    const Wover2 = this.resolution * (gl.canvas.width / 2) / (far / near);
    const Hover2 = this.resolution * (gl.canvas.height / 2) / (far / near);
    mat4.frustum(this.project, -Wover2, Wover2, -Hover2, Hover2, near,far);
    // mat4.perspective(this.project, 1, gl.canvas.width / gl.canvas.height, d - 100, d + 100);

    this.framePrograms.clear();

    // gl.enable(gl.DEPTH_TEST);

    for (const actor of this.actors) {
      if (actor.blendMode === "opaque") {
        gl.disable(gl.BLEND);
      } else {
        gl.enable(gl.BLEND);

        if (actor.blendMode === "add") {
          gl.blendFunc(gl.ONE, gl.ONE);
        } else if (actor.blendMode === "alpha") {
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }
      }

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
    // this.waterMesh.dispose(gl);
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

    if ("updateAtmosphere" in program) {
      program.updateAtmosphere(gl, this.sunElevation, this.sunAzimuth, this.sunColor, this.skyColor);
    }
  }

  private updateActorUniforms(gl: WebGLRenderingContext, program: Program, actor: Actor) {
    if ("updateModel" in program) {
      program.updateModel(gl, actor.model);
    }
  }
}
