import { loadImage, createTexture, loadJson } from "./misc";
import { Actor } from "./scene";
import { mat4, vec4, vec2, vec3 } from "gl-matrix";
import { Mesh, IGeometry } from "./meshes";
import { Program, Material, CanopyProgram, WaterProgram, ParticleProgram, SpriteProgram, AtmosphereProgram } from "./programs";
import * as layouts from "./layouts";
import { createCanopyMesh } from "./geometries";
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
  private canopyProgram: Program;
  private waterProgram: Program;
  private particleProgram: Program;
  private spriteProgram: Program;
  private atmosphereProgram: Program;

  // Materials
  private canopy: Material;
  private water: Material;
  private smoke: Material;
  private fire: Material;

  // Geometries
  private canopyGeometry: IGeometry;
  private waterGeometry: IGeometry;
  private smokeGeometry: IGeometry;
  private fireGeometry: IGeometry;
  private quadGeometry: IGeometry;
  
  // Images and corresponding textures created from those images
  private leavesImage: HTMLImageElement;
  private leavesTexture: WebGLTexture;
  private wavesImage: HTMLImageElement;
  private wavesTexture: WebGLTexture;
  private smokeImage: HTMLImageElement;
  private smokeTexture: WebGLTexture;
  private fireImage: HTMLImageElement;
  private fireTexture: WebGLTexture;

  // Lake feature
  private middleCreek: any;
  private trees: any;

  // Wind
  windAngle: number;
  windSpeed: number;

  // Atmosphere
  sunElevation = 0.70;
  sunAzimuth = 0;
  sunColor = vec3.fromValues(1, 1, 0.79);
  skyColor = vec3.fromValues(0.92, 0.99, 1);
  sunElevationTarget = 0.70;
  sunAzimuthTarget = 0;
  sunColorTarget = vec3.fromValues(1, 1, 0.79);
  skyColorTarget = vec3.fromValues(0.92, 0.99, 1);

  // View - original
  center = vec2.fromValues(0, 0);
  rotation = 0;
  resolution = 1;
  pixelRatio: number;
  size = vec2.fromValues(0, 0);

  // View - processed
  translation = vec3.create();

  constructor(private backgroundColor?: vec4) {
  }

  async load() {
    this.leavesImage = await loadImage("assets/tree.png");
    this.wavesImage = await loadImage("assets/waves.png");
    this.smokeImage = await loadImage("assets/smoke.png");
    this.fireImage = await loadImage("assets/fire.jpg");
    this.middleCreek = await loadJson("assets/lake-polygon.json");
    this.trees = await loadJson("assets/tree-positions.json");

    function shuffle(a: any[]) {
      var j, x, i;
      for (i = a.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i + 1));
          x = a[i];
          a[i] = a[j];
          a[j] = x;
      }
    }

    shuffle(this.trees.points);
  }

  setWind(windAngle: number, windSpeed: number) {
    this.windAngle = windAngle;
    this.windSpeed = windSpeed;
  }

  setAtmosphere(sunElevation: number, sunAzimuth: number, sunColor: vec3, skyColor: vec3) {
    this.sunElevationTarget = sunElevation;
    this.sunAzimuthTarget = sunAzimuth;
    this.sunColorTarget = sunColor;
    this.skyColorTarget = skyColor;
  }

  setView(center: [number, number], rotation: number, resolution: number, pixelRatio: number, size: [number, number]) {
    this.center[0] = center[0];
    this.center[1] = center[1];
    this.rotation = rotation;
    this.resolution = resolution;
    this.pixelRatio = pixelRatio;
    this.size[0] = size[0];
    this.size[1] = size[1];
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
    this.sunElevation += 0.1 * (this.sunElevationTarget - this.sunElevation);
    this.sunAzimuth += 0.1 * (this.sunAzimuthTarget - this.sunAzimuth);
    this.sunColor[0] += 0.1 * (this.sunColorTarget[0] - this.sunColor[0]);
    this.sunColor[1] += 0.1 * (this.sunColorTarget[1] - this.sunColor[1]);
    this.sunColor[2] += 0.1 * (this.sunColorTarget[2] - this.sunColor[2]);
    this.skyColor[0] += 0.1 * (this.skyColorTarget[0] - this.skyColor[0]);
    this.skyColor[1] += 0.1 * (this.skyColorTarget[1] - this.skyColor[1]);
    this.skyColor[2] += 0.1 * (this.skyColorTarget[2] - this.skyColor[2]);
  }

  private sceneSetup() {
    // Atmosphere
    const atmosphere = new Actor(this.quadGeometry, this.atmosphereProgram);
    atmosphere.blendMode = "alpha";
    this.actors.push(atmosphere);
    
    // Water
    const water = new Actor(this.waterGeometry, this.waterProgram, this.water);
    water.blendMode = "alpha";
    this.actors.push(water);

    // Fires
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

    for (const point of fires) {
      const fire = new Actor(this.fireGeometry, this.spriteProgram, this.fire);
      fire.blendMode = "add";
      this.actors.push(fire);
      mat4.translate(fire.model, fire.model, [point[0] - origin[0], point[1] - origin[1], 0]);
    }

    // Canopy
    const canopy = new Actor(this.canopyGeometry, this.canopyProgram, this.canopy);
    canopy.blendMode = "alpha";
    this.actors.push(canopy);

    // Smoke
    for (const point of fires) {
      const smoke = new Actor(this.smokeGeometry, this.particleProgram, this.smoke);
      smoke.blendMode = "alpha";
      this.actors.push(smoke);
      mat4.translate(smoke.model, smoke.model, [point[0] - origin[0], point[1] - origin[1], 0]);
    }
  }

  private doInitialize(gl: WebGLRenderingContext) {
    // Textures
    this.leavesTexture = createTexture(gl, this.leavesImage);
    this.wavesTexture = createTexture(gl, this.wavesImage, false);
    this.smokeTexture = createTexture(gl, this.smokeImage);
    this.fireTexture = createTexture(gl, this.fireImage);

    // Materials
    this.canopy = {
      diffuse: this.leavesTexture
    };

    this.water = {
      waves: this.wavesTexture,
      diffuse: [25.0 / 255, 72.0 / 255, 75.0 / 255]
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
    this.canopyProgram = new CanopyProgram(gl);
    this.waterProgram = new WaterProgram(gl);
    this.particleProgram = new ParticleProgram(gl);
    this.spriteProgram = new SpriteProgram(gl);
    this.atmosphereProgram = new AtmosphereProgram(gl);
    
    // Load quad geometry (for atmosphere rendering)
    {
      this.quadGeometry = new Mesh(gl, layouts.P, new Float32Array([
        -1, -1, 0,
         1, -1, 0,
        -1,  1, 0,
         1,  1, 0
      ]).buffer, new Uint16Array([
        0, 1, 2,
        1, 3, 2
      ]).buffer).slice(0, 6);
    }

    // Load canopy geometry
    {
      const pointTrees: [number, number][] = this.trees.points;
      const trees = pointTrees.map(point => ({
        x: point[0] - origin[0],
        y: point[1] - origin[1]
      }));

      const particlesPerTree = 5;
      this.canopyGeometry = createCanopyMesh(gl, trees, particlesPerTree).slice(0, trees.length * particlesPerTree * 6);
    }

    // Load lake geometry
    {
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

    // Load smoke geometry
    {
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
    }

    // Load fire geometry
    {
      this.fireGeometry = new Mesh(gl, layouts.PO, new Float32Array([
        0, 0, 0.0, -0.5, -0.5,
        0, 0, 0.0,  0.5, -0.5,
        0, 0, 0.0, -0.5,  0.5,
        0, 0, 0.0,  0.5,  0.5
      ]).buffer, new Uint16Array([
        0, 1, 2,
        1, 3, 2
      ]).buffer).slice(0, 6);
    }

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
    mat4.rotateZ(this.view, this.view, -Math.PI * this.rotation / 180);
    this.translation[0] = -(this.center[0] - origin[0]);
    this.translation[1] = -(this.center[1] - origin[1]);
    this.translation[2] = -far;
    mat4.translate(this.view, this.view, this.translation);

    const W = (this.resolution * (this.size[0]) / (far / near));
    const H = (this.resolution * (this.size[1]) / (far / near));
    mat4.frustum(this.project, -W / 2, W / 2, -H / 2, H / 2, near, far);
    gl.viewport(0, 0, this.size[0] * this.pixelRatio, this.size[1] * this.pixelRatio);

    this.framePrograms.clear();

    for (const actor of this.actors) {
      if (actor.blendMode === "opaque") {
        gl.disable(gl.BLEND);
      } else {
        gl.enable(gl.BLEND);

        if (actor.blendMode === "add") {
          gl.blendFunc(gl.ONE, gl.ONE);
        } else if (actor.blendMode === "multiply") {
          gl.blendFunc(gl.ONE, gl.SRC_COLOR);
        }
        else if (actor.blendMode === "alpha") {
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }

        gl.blendEquation(gl.FUNC_ADD);
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

  // Dispose WebGL resources
  private doDispose(gl: WebGLRenderingContext) {
    gl.deleteTexture(this.leavesTexture);
    gl.deleteTexture(this.wavesTexture);
    gl.deleteTexture(this.smokeTexture);
    gl.deleteTexture(this.fireTexture);

    this.canopyGeometry.mesh.dispose(gl);
    this.waterGeometry.mesh.dispose(gl);
    this.smokeGeometry.mesh.dispose(gl);
    this.fireGeometry.mesh.dispose(gl);
    this.quadGeometry.mesh.dispose(gl);
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
      program.updateFrameSize(gl, this.size[0], this.size[1]);
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
