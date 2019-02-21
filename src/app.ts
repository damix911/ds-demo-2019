import { loadImage, createTexture, createIndexBuffer, createVertexBuffer, loadJson } from "./misc";
import { Actor } from "./scene";
import { mat4, vec4, vec2, vec3 } from "gl-matrix";
import { Mesh, IGeometry } from "./meshes";
import { StandardProgram, Program, Material, CanopyProgram, WaterProgram, GrassProgram, SmokeProgram, SpriteProgram } from "./programs";
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
  pixelRatio: number;
  size = vec2.fromValues(0, 0);
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

  setPixelRatio(pixelRatio: number): void {
    // console.log("pixelRatio", pixelRatio);
    this.pixelRatio = pixelRatio;
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
    
    const pointTrees: [number, number][] = [[-10539104.22025657,4651835.12616169],[-10539116.760706525,4651833.334668839],[-10539127.50966363,4651827.363026003],[-10539136.467127884,4651814.822576049],[-10539147.813249271,4651808.253768929],[-10539178.268627733,4651799.296304676],[-10539218.27863473,4651848.263775928],[-10539224.84744185,4651827.363026003],[-10539234.402070386,4651819.599890317],[-10539266.051777415,4651964.113646938],[-10539091.082642334,4651778.992719035],[-10539103.623092288,4651773.0210762],[-10539131.092649331,4651771.229583349],[-10539144.23026357,4651768.840926214],[-10539134.675635032,4651757.494804827],[-10538733.978400765,4652021.441418157],[-10538747.713179287,4652019.649925306],[-10538745.921686437,4652006.512311068],[-10538753.684822123,4652011.88678962],[-10538754.281986406,4651995.763353964],[-10538750.101836422,4651977.848425457],[-10538755.476314973,4651936.046925608],[-10538759.059300674,4651914.5490114],[-10538766.82243636,4651878.719154387],[-10538775.182736332,4651856.624075894],[-10538791.903336272,4651819.002726031],[-10538798.47214339,4651793.9218261205],[-10538804.443786226,4651773.021076196],[-10538805.040950509,4651758.689133391],[-10538808.62393621,4651741.371369167],[-10538806.83244336,4651721.067783526],[-10538802.652293375,4651700.764197886],[-10538799.666471956,4651678.669119393],[-10538784.737364868,4651676.877626543],[-10538779.362886315,4651664.337176588],[-10538798.47214339,4651657.171205185],[-10538797.277814822,4651633.284633843],[-10538783.5430363,4651639.256276679],[-10538787.126022002,4651617.161198188],[-10538781.154379167,4651601.634926815],[-10538768.613929212,4651586.705819726],[-10538753.684822123,4651572.9710412035],[-10538733.978400765,4651570.582384069],[-10538754.281986406,4651592.080298278],[-10538712.480486557,4651564.610741234],[-10538570.35538707,4651680.460612245],[-10538556.620608548,4651672.697476558],[-10538581.701508457,4651650.602398067],[-10538531.539708639,4651688.820912214],[-10538530.345380072,4651713.901812124],[-10538543.48299431,4651715.096140691],[-10538503.472987311,4651704.944347871],[-10538490.932537356,4651737.191219183],[-10538502.278658744,4651738.982712033],[-10538501.084330177,4651757.494804824],[-10538508.250301579,4651700.167033602],[-10538602.602258382,4651650.005233783],[-10538616.934201188,4651642.83926238],[-10538627.085994009,4651639.853440963],[-10538642.015101098,4651629.701648142],[-10538647.38957965,4651625.521498157],[-10538664.110179588,4651615.96686962],[-10538681.427943813,4651609.995226785],[-10538696.357050901,4651609.398062501],[-10538704.120186588,4651621.341348172],[-10538708.897500856,4651630.298812426],[-10538717.257800825,4651652.991055201],[-10538728.603922212,4651677.474790826],[-10538728.603922212,4651698.972705035],[-10538732.186907915,4651708.527333572],[-10538727.409593645,4651725.247933512],[-10538722.035115095,4651746.74584772],[-10538721.43795081,4651766.452269077],[-10538725.020936511,4651784.964361868],[-10538725.020936511,4651800.49063324],[-10538713.674815124,4651836.320490254],[-10538731.589743631,4651825.57153315],[-10538733.381236482,4651793.9218261205],[-10538738.755715033,4651692.403897917],[-10538738.755715033,4651708.5273335725], [-10538590.061808426,4651632.090305279],[-10538608.573901216,4651619.549855324],[-10538633.654801127,4651609.398062504],[-10538661.721522452,4651593.871791132],[-10538708.897500854,4651580.734176893],[-10538773.391243478,4651624.327169593],[-10538787.126022,4651699.569869322],[-10538784.140200581,4651716.887633545],[-10538785.931693433,4651741.371369171],[-10538781.751543447,4651767.646597648],[-10538773.98840776,4651808.850933214],[-10538763.83661494,4651832.737504556],[-10538760.850793524,4651859.609897316],[-10538752.490493553,4651888.273782927],[-10538744.727357868,4651919.923489955],[-10538742.935865017,4651945.601554149],[-10538717.854965104,4651962.9193183705],[-10538723.229443656,4651982.028575445],[-10538725.61810079,4651999.346339668],[-10538712.480486553,4652002.929325369],[-10538714.869143687,4651982.625739728],[-10538711.883322269,4651968.8909612065],[-10538710.091829417,4651952.1703612665],[-10538711.286157986,4651925.297968507],[-10538725.61810079,4651873.344675837],[-10538733.381236477,4651850.652433062],[-10538741.741536446,4651836.917654539],[-10538755.47631497,4651799.893468959],[-10538761.447957804,4651776.006897616],[-10538762.045122087,4651752.717490558],[-10538765.62810779,4651735.399726335],[-10538766.822436357,4651698.972705037],[-10538757.864972103,4651666.128669442],[-10538757.267807819,4651642.2420981],[-10538742.935865015,4651630.895976712],[-10538739.352879312,4651611.786719638],[-10538725.020936508,4651592.677462564],[-10538710.091829417,4651593.274626847],[-10538604.39375123,4651675.683297979],[-10538571.549715634,4651699.569869322],[-10538533.331201486,4651727.039426365], [-10538907.75320728,4651899.022740031],[-10538928.05679292,4651910.368861418],[-10538944.77739286,4651918.131997105],[-10538945.971721428,4651936.644089895],[-10538930.445450054,4651943.810061297],[-10538917.307835817,4651929.478118492],[-10538902.975893011,4651928.283789925],[-10538900.587235877,4651940.82423988],[-10538910.739028698,4651964.113646938],[-10538901.781564444,4651987.403053997],[-10538898.198578743,4652001.13783252],[-10538928.653957205,4651989.194546849],[-10538932.236942906,4651965.905139789],[-10538948.360378562,4651976.654096893],[-10538956.123514248,4651992.77753255],[-10538981.801578442,4651981.431411162],[-10538993.744864112,4651998.152011101],[-10539021.214421157,4651997.554846818],[-10539061.821592439,4651999.943503953],[-10539313.824920101,4651666.725833726],[-10538781.75154345,4652001.734996803],[-10538781.154379165,4651980.8342468785],[-10538775.18273633,4651962.919318371],[-10538772.196914911,4651945.004389864],[-10538775.779900612,4651928.880954209],[-10538781.75154345,4651910.368861418],[-10538790.111843418,4651886.482290076],[-10538798.47214339,4651866.178704435],[-10538810.41542906,4651842.292133093],[-10538819.970057597,4651818.40556175],[-10538828.92752185,4651796.907647542],[-10538834.302000402,4651776.604061901],[-10538837.884986103,4651755.703311976],[-10538840.870807521,4651736.594054902],[-10538836.690657536,4651718.679126396],[-10538834.302000402,4651694.195390769],[-10538831.913343268,4651675.68329798],[-10538825.941700432,4651653.588219487],[-10538819.372893313,4651638.061948115],[-10538812.20692191,4651615.966869623],[-10538806.832443358,4651601.037762534],[-10538800.263636239,4651585.511491162],[-10538787.723186284,4651568.193726938],[-10538780.557214882,4651563.41641267],[-10538764.433779225,4651553.26461985],[-10538745.921686435,4651549.681634148],[-10538732.186907914,4651547.890141297],[-10538717.854965108,4651549.681634148],[-10538702.328693734,4651552.667455566],[-10538686.205258079,4651559.236262685],[-10538668.290329572,4651568.193726938],[-10538652.166893916,4651581.928505461],[-10538633.057636842,4651593.274626848],[-10538616.337036902,4651602.829255385],[-10538600.81076553,4651612.981048206],[-10538591.256136993,4651622.535676742],[-10538584.687329873,4651632.6874695625],[-10539315.019248668,4651639.8534409655],[-10539301.88163443,4651639.8534409655],[-10539262.468791714,4651645.8250838015],[-10539252.914163178,4651654.782548055],[-10539269.037598833,4651670.905983711],[-10539307.853277264,4651694.792555053],[-10539295.31282731,4651703.152855023],[-10539273.814913101,4651684.043597949],[-10539257.094313161,4651703.152855023],[-10539291.132677326,4651720.470619246],[-10539291.132677326,4651737.1912191855],[-10539310.839098683,4651716.290469261],[-10539308.450441549,4651756.897640543],[-10539295.909991594,4651746.148683439],[-10539301.88163443,4651776.006897617],[-10539311.436262967,4651792.727497557],[-10539312.03342725,4651828.55735457],[-10539312.03342725,4651859.012733032],[-10539309.644770116,4651879.913482957],[-10539311.436262967,4651910.368861418],[-10539312.03342725,4651925.297968507],[-10539310.2419344,4651945.601554148],[-10539315.019248668,4651970.682454058],[-10539280.383720221,4651985.611561147],[-10539287.549691623,4651954.559018401],[-10539297.104320161,4651942.018568447],[-10539254.108491745,4651976.654096893],[-10539254.108491745,4651987.403053997],[-10539293.52133446,4651891.856768628],[-10539275.009241669,4651808.253768929],[-10539282.772377355,4651841.694968808],[-10539280.980884505,4651859.6098973155],[-10539266.051777415,4651880.51064724],[-10539270.829091685,4651895.43975433],[-10539287.549691623,4651912.160354269],[-10539266.6489417,4651934.25543276],[-10539257.691477446,4651910.966025702],[-10539239.776548939,4651918.131997105],[-10539215.889977597,4651900.814232881],[-10539241.56804179,4651883.496468658],[-10539251.71983461,4651880.51064724],[-10539256.497148879,4651841.097804525],[-10539231.41624897,4651842.889297376],[-10539232.610577537,4651831.543175988],[-10539249.331177477,4651796.310483258],[-10539253.51132746,4651778.395554751],[-10539226.041770417,4651762.272119096],[-10539218.875799015,4651785.561526154],[-10539205.738184776,4651761.077790529],[-10539196.780720523,4651796.907647542],[-10539171.699820613,4651825.571533153],[-10539160.950863509,4651839.903475958],[-10539142.438770719,4651836.320490257],[-10539162.145192076,4651859.6098973155],[-10539180.060120583,4651871.553182987],[-10539141.244442152,4651868.567361569],[-10539166.922506345,4651900.814232881],[-10539187.226091987,4651900.814232881],[-10539196.18355624,4651929.478118492],[-10539223.055948999,4651954.559018401],[-10539230.221920403,4651973.071111192],[-10539205.141020494,4651970.682454058],[-10539198.572213374,4651992.77753255],[-10539181.25444915,4651964.113646938],[-10539166.922506345,4651988.000218281],[-10539144.827427853,4651992.77753255],[-10539149.007577838,4651970.682454058],[-10539181.25444915,4651940.227075596],[-10539153.187727824,4651952.767525551],[-10539159.756534941,4651918.131997105],[-10539173.491313463,4651930.672447059],[-10539150.201906405,4651900.217068598],[-10539141.244442152,4651923.506475656],[-10539148.410413554,4651942.61573273],[-10539135.8699636,4651959.33633267],[-10539124.523842212,4651983.222904013],[-10539111.386227975,4651970.085289774],[-10539116.760706525,4651949.781704133],[-10539126.315335063,4651930.672447059],[-10539125.718170779,4651921.117818522],[-10539136.467127884,4651907.980204284],[-10539139.4529493,4651890.662440061],[-10539141.841606434,4651874.539004405],[-10539150.799070688,4651860.207061599],[-10539140.050113585,4651853.63825448],[-10539126.912499346,4651864.984375868],[-10539121.538020795,4651878.121990106],[-10539123.92667793,4651903.800054299],[-10539108.400406556,4651912.160354269],[-10539093.471299468,4651928.880954209],[-10539092.2769709,4651942.61573273],[-10539071.376220975,4651964.113646938],[-10539067.19607099,4651937.838418462],[-10539087.49965663,4651916.937668538],[-10539096.457120884,4651898.425575747],[-10539117.955035092,4651881.704975807],[-10539123.329513645,4651872.747511554],[-10539134.07847075,4651864.3872115845],[-10539114.372049391,4651851.2495973455],[-10539101.234435154,4651855.429747331],[-10539097.651449451,4651872.15034727],[-10539080.930849513,4651897.23124718],[-10539078.542192377,4651919.923489955],[-10539058.238606736,4651917.534832821],[-10539037.935021097,4651921.117818522],[-10539039.726513946,4651885.287961509],[-10539051.669799618,4651869.164525853],[-10539079.736520946,4651871.553182987],[-10539103.025928004,4651849.458104495],[-10539079.139356662,4651839.306311674],[-10539072.570549542,4651837.514818824],[-10539057.044278169,4651853.63825448],[-10539061.224428155,4651875.136168689],[-10539009.271135485,4651912.757518552],[-10539032.560542544,4651920.520654239], [-10539144.23026357,4651735.399726335],[-10539144.827427853,4651757.494804827],[-10539112.580556542,4651759.8834619615],[-10539114.969213676,4651737.1912191855],[-10539097.651449451,4651721.664947813],[-10539081.528013796,4651739.57987632],[-10539063.613085289,4651754.508983409],[-10539056.447113886,4651765.257940513],[-10539074.362042394,4651774.81256905],[-10539245.748191774,4651730.622412067],[-10539232.013413252,4651718.081962112],[-10539207.529677628,4651717.484797829],[-10539199.766541941,4651698.972705038],[-10539156.17354924,4651670.308819427],[-10539123.329513645,4651675.68329798],[-10539085.708163781,4651680.460612248],[-10539067.793235274,4651654.185383771],[-10539042.712335365,4651736.594054902],[-10539011.062628336,4651780.187047603],[-10538978.21859274,4651810.04526178],[-10538982.995907009,4651832.140340272],[-10538972.844114188,4651863.1928830175],[-10539221.861620432,4651632.6874695625],[-10539215.889977597,4651626.715826727],[-10539196.780720523,4651623.132841026],[-10539181.851613434,4651618.355526757],[-10539159.159370659,4651612.981048206],[-10539138.258620733,4651605.815076803],[-10539113.774885109,4651601.634926817],[-10539086.902492348,4651605.815076803],[-10539080.930849513,4651618.952691041],[-10539073.76487811,4651632.6874695625],[-10539062.418756722,4651647.616576652],[-10539053.461292468,4651659.559862323],[-10539045.100992499,4651679.266283681],[-10539045.100992499,4651694.792555053],[-10539032.560542544,4651709.124497859],[-10539025.39457114,4651722.85927638],[-10539009.271135485,4651736.594054902],[-10538999.119342664,4651746.148683439],[-10538991.953371262,4651759.286297678],[-10538982.995907009,4651770.632419066],[-10538975.829935607,4651789.144511855],[-10538965.678142786,4651800.490633244],[-10538962.692321368,4651810.642426063],[-10538954.929185681,4651823.182876019],[-10538950.749035696,4651835.723325973],[-10538942.388735726,4651852.4439259125],[-10538938.208585741,4651858.4155687485],[-10538932.236942906,4651863.790047301], [-10539175.282806315,4651741.968533454],[-10539171.102656329,4651759.8834619615],[-10539173.491313463,4651776.006897617],[-10539149.007577838,4651791.53316899],[-10539132.286977898,4651784.367197587],[-10539113.177720824,4651786.755854721],[-10539113.177720824,4651807.656604646],[-10539092.874135183,4651813.628247482],[-10539079.139356662,4651804.670783228],[-10539053.461292468,4651799.893468959]];
    const trees = pointTrees.map(point => ({
      x: point[0] - origin[0],
      y: point[1] - origin[1]
    }));


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
    mat4.rotateZ(this.view, this.view, -Math.PI * this.rotation / 180);
    this.translation[0] = -(this.center[0] - origin[0]);
    this.translation[1] = -(this.center[1] - origin[1]);
    this.translation[2] = -far;
    mat4.translate(this.view, this.view, this.translation);

    const W = (this.resolution * (this.size[0]) / (far / near)) * this.pixelRatio;
    const H = (this.resolution * (this.size[1]) / (far / near)) * this.pixelRatio;
    // const Wover2 = (this.resolution * (gl.canvas.width / 2) / (far / near)) / this.pixelRatio;
    // const Hover2 = (this.resolution * (gl.canvas.height / 2) / (far / near)) / this.pixelRatio;
    mat4.frustum(this.project, -W / 2, W / 2, -H / 2, H / 2, near, far);
    gl.viewport(0, 0, this.size[0] * this.pixelRatio, this.size[1] * this.pixelRatio);

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
