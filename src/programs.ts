import { createProgram } from "./misc";
import { mat4, vec3 } from "gl-matrix";

export type Material = any;

export class BaseProgram {
  private program: WebGLProgram;

  constructor(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string, public locations: {[attributeName: string]: number}) {
    this.program = createProgram(gl, vsSrc, fsSrc, locations);
  }

  use(gl: WebGLRenderingContext) {
    gl.useProgram(this.program);
  }

  protected getUniformLocation(gl: WebGLRenderingContext, name: string) {
    return gl.getUniformLocation(this.program, name);
  }
}

export abstract class MaterialProgram extends BaseProgram {
  private material: Material;

  updateMaterial(gl: WebGLRenderingContext, material: Material) {
    if (this.material === material) {
      return;
    }

    this.doUpdateMaterial(gl, material);
  }

  protected abstract doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void;
}

export class StandardProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private diffuseLocation: WebGLUniformLocation;
  private normalLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_tangent;
      attribute vec3 a_binormal;
      attribute vec3 a_normal;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_tangent;
      varying vec3 v_binormal;
      varying vec3 v_normal;

      void main(void) {
        mat4 viewModel = u_view * u_model;
        mat3 viewModel3 = mat3(viewModel);

        gl_Position = u_project * viewModel * a_position;
        
        v_texcoord = a_texcoord;
        

        v_eye = -(viewModel * a_position).xyz;
        v_tangent = viewModel3 * a_tangent;
        v_binormal = viewModel3 * a_binormal;
        v_normal = viewModel3 * a_normal;

        if (dot(v_eye, v_normal) < 0.0) {
          v_normal = -v_normal;
        }
      }
    `, `
      precision mediump float;

      uniform sampler2D u_diffuse;
      uniform sampler2D u_normal;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_tangent;
      varying vec3 v_binormal;
      varying vec3 v_normal;

      void main(void) {
        mat3 tbn = mat3(v_tangent, v_binormal, v_normal);
        vec3 sampled = texture2D(u_normal, v_texcoord).rgb;
        vec3 normal = normalize(tbn * (sampled * 2.0 - 1.0));
        vec4 diffuse = texture2D(u_diffuse, v_texcoord);

        vec3 eye = normalize(v_eye);
        
        vec3 light = eye;
        //vec3 light = vec3(0.0, 1.0, 0.0);

        float d = clamp(dot(normal, light), 0.0, 1.0);
        float s = pow(clamp(dot(reflect(-light, normal), eye), 0.0, 1.0), 10.0);

        gl_FragColor = vec4(diffuse.rgb * (0.3 + 0.3 * d) + vec3(0.4 * s), diffuse.a);
        gl_FragColor.rgb *= gl_FragColor.a;
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_tangent": 2,
      "a_binormal": 3,
      "a_normal": 4
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.diffuseLocation = this.getUniformLocation(gl, "u_diffuse");
    this.normalLocation = this.getUniformLocation(gl, "u_normal");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.diffuse);
    gl.uniform1i(this.diffuseLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, material.normal);
    gl.uniform1i(this.normalLocation, 1);
  }
}

export class CanopyProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private diffuseLocation: WebGLUniformLocation;
  private normalLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private windLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_tangent;
      attribute vec3 a_binormal;
      attribute vec3 a_normal;
      attribute vec3 a_offset;
      attribute vec3 a_random;

      uniform float u_time;
      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform vec2 u_wind;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_tangent;
      varying vec3 v_binormal;
      varying vec3 v_normal;
      varying float v_darken;
      varying vec3 v_random;

      float rand(vec2 n) { 
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
      }
      
      float noise(vec2 p){
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        
        float res = mix(
          mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
          mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
        return res*res;
      }

      void main(void) {
        float r = a_random.z;

        vec4 position = a_position;
        //position.xy += vec2(cos(u_time + r * 10.0), sin(u_time + r * 10.0));
        vec2 xAxis = normalize(vec2(-1.0, 1.0));
        vec2 yAxis = vec2(-xAxis.y, xAxis.x);
        // vec2 dir = xAxis * cos(0.2 * cos(1.7 * u_time + r * 10.0)) + yAxis * sin(0.2 * cos(1.7 * u_time + r * 10.0));
        // position.xy += 2.0 * cos(u_time + r * 10.0) * dir;
        // position.xy += 5.0 * (a_random.xy - 0.5);

        float bend = 0.03*(a_position.z / 10.0) * (cos(u_time) + 1.0);
        position.xy += bend * u_wind[1] * vec2(cos(-u_wind[0]), sin(-u_wind[0]));
        
        vec2 offset = a_offset.xy * (1.0 - a_position.z / 30.0);
        float c = cos(r * 2.0 * 3.1415);
        float s = sin(r * 2.0 * 3.1415);
        vec2 rotated_offset = vec2(
          c * offset.x + s * offset.y,
         -s * offset.x + c * offset.y
        );
        position.xyz += vec3(rotated_offset, a_offset.z);

        mat4 viewModel = u_view * u_model;
        mat3 viewModel3 = mat3(viewModel);

        gl_Position = u_project * viewModel * position;
        
        v_texcoord = a_texcoord;
        

        v_eye = -(viewModel * a_position).xyz;
        v_tangent = viewModel3 * a_tangent;
        v_binormal = viewModel3 * a_binormal;
        v_normal = viewModel3 * a_normal;

        if (dot(v_eye, v_normal) < 0.0) {
          v_normal = -v_normal;
        }

        v_darken = 1.0;//0.8 + 0.2 * r;
        
        v_random = a_random;
      }
    `, `
      precision mediump float;

      uniform float u_time;
      uniform sampler2D u_diffuse;
      uniform sampler2D u_normal;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_tangent;
      varying vec3 v_binormal;
      varying vec3 v_normal;
      varying float v_darken;
      varying vec3 v_random;

      void main(void) {
        mat3 tbn = mat3(v_tangent, v_binormal, v_normal);
        vec3 sampled = texture2D(u_normal, v_texcoord).rgb;
        vec3 normal = normalize(tbn * (sampled * 2.0 - 1.0));
        vec4 diffuse = texture2D(u_diffuse, v_texcoord);

        vec3 eye = normalize(v_eye);
        
        vec3 light = eye;
        //vec3 light = vec3(0.0, 1.0, 0.0);

        float d = clamp(dot(normal, light), 0.0, 1.0);
        float s = pow(clamp(dot(reflect(-light, normal), eye), 0.0, 1.0), 10.0);

        gl_FragColor = vec4(diffuse.rgb * (0.3 + 0.3 * d) + vec3(0.4 * s), diffuse.a);
        gl_FragColor = diffuse;
        //gl_FragColor.rgb *= v_darken;
        gl_FragColor.rgb *= gl_FragColor.a;
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_tangent": 2,
      "a_binormal": 3,
      "a_normal": 4,
      "a_offset": 5,
      "a_random": 6
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.diffuseLocation = this.getUniformLocation(gl, "u_diffuse");
    this.normalLocation = this.getUniformLocation(gl, "u_normal");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.windLocation = this.getUniformLocation(gl, "u_wind");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  updateTime(gl: WebGLRenderingContext, time: number) {
    gl.uniform1f(this.timeLocation, time);
  }

  updateWind(gl: WebGLRenderingContext, angle: number, speed: number) {
    gl.uniform2f(this.windLocation, angle, speed);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.diffuse);
    gl.uniform1i(this.diffuseLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, material.normal);
    gl.uniform1i(this.normalLocation, 1);
  }
}

export class WaterProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private wavesLocation: WebGLUniformLocation;
  private windLocation: WebGLUniformLocation;
  private sunColorLocation: WebGLUniformLocation;
  private skyColorLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision highp float;

      attribute vec4 a_position;
      attribute float a_scalar;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;

      varying vec2 v_position;
      varying float v_scalar;
      
      void main(void) {
        mat4 viewModel = u_view * u_model;
        gl_Position = u_project * viewModel * a_position;

        v_position = a_position.xy;
        v_scalar = a_scalar;
      }
    `, `
      precision highp float;

      varying vec2 v_position;
      varying float v_scalar;
      
      uniform float u_time;
      uniform sampler2D u_waves;
      uniform vec2 u_wind;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;
      // uniform float u_resolution;
      // uniform vec3 u_light_dir;
      // uniform float u_wind_angle;
      // uniform float u_wind_speed;
      
      const float u_resolution = 1.1943285668550503;//38.21851414253662;//9.554628535634155;//0.5971642835598172;
      const vec3 u_light_dir = normalize(vec3(1.0, 1.0, 1.0));

      const vec3 albedoDeep = vec3(25.0, 72.0, 75.0) / 255.0;
      const vec3 albedoShallow = vec3(41.0, 113.0, 117.0) / 255.0;
      const vec3 view = vec3(0.0, 0.0, 1.0);
      const float PI = 3.14159;

      float rand1(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
      }

      float rand2(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float rand3(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 109.66))) * 43758.5453);
      }

      float rand4(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 263.73))) * 43758.5453);
      }

      float rand5(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 446.15))) * 43758.5453);
      }

      float rand6(vec2 n) {
        return fract(sin(dot(n, vec2(12.9898, 521.64))) * 43758.5453);
      }

      float sampleCell(vec2 pos, vec2 cell, float cellSide) {
        float windAngle = u_wind[0] + (rand6(cell) - 0.5) * PI / 4.0;
        vec2 velocity = (1.0 + 0.2 * rand4(cell)) * vec2(cos(-windAngle), sin(-windAngle)) * u_wind[1];
        velocity *= 0.1;

        float phase = u_time / 3.0 + rand5(cell);
        float intensityFactor = 1.0 - pow(max(cos(2.0 * PI * phase), 0.0), 2.0);

        vec2 source = cell * cellSide + cellSide * vec2(rand1(cell), rand2(cell)) + velocity * mod(phase, 1.0);
        vec2 uv = (pos - source) / cellSide;

        float c = cos(windAngle - 1.0);
        float s = sin(windAngle - 1.0);
        uv = mat2(c, s, -s, c) * uv;
        uv += 0.5;

        float heightFactor = texture2D(u_waves, uv).r;
        float distanceFactor = exp(-1.0 * length(pos - source) / cellSide);

        return heightFactor * distanceFactor * intensityFactor * v_scalar;

        // return heightFactor;
      }

      float sampleCell_SIMPLE(vec2 pos, vec2 cell, float cellSide) {
        vec2 source = cell * cellSide + cellSide * vec2(0.5, 0.5);
        vec2 uv = (pos - source) / cellSide;
        float heightFactor = texture2D(u_waves, uv).r;

        return heightFactor;
      }

      float getPartialHeight(vec2 pos, float cellSide) {
        vec2 cell = floor(pos / cellSide);
        float s = 0.0;

        const int M = 3;

        for (int i = -M; i <= M; ++i) {
          for (int j = -M; j <= M; ++j) {
            s += sampleCell(pos, cell + vec2(i, j), cellSide);
          }
        }

        return s;
      }

      float getHeight(vec2 pos) {
        return getPartialHeight(pos, 60.0);
      }

      vec4 getDebugColor(vec2 pos) {
        float cellSide = 60.0;
        vec2 cell = floor(pos / cellSide);

        vec2 source = cell * cellSide;// + cellSide * vec2(0.5, 0.5);
        vec2 uv1 = (pos - source) / cellSide;
        vec2 uv0 = source / cellSide;
        vec4 color = vec4(uv1, 0.0, 1.0);
        color = texture2D(u_waves, uv1);
        
        return color;
      }

      void main() {
          float step = u_resolution;

          float hL = getHeight(v_position + vec2(-step, 0.0));
          float hR = getHeight(v_position + vec2(+step, 0.0));
          float hU = getHeight(v_position + vec2(0.0, -step));
          float hD = getHeight(v_position + vec2(0.0, +step));
          float dx = hR - hL;
          float dy = hU - hD;

          vec3 normal = normalize(vec3(-dx, -dy, 1.5));
          vec3 r = reflect(-u_light_dir, normal);
          float fresnel = 1.0 - dot(normal, view);
          float s = pow(clamp(dot(r, view), 0.0, 1.0), 5.0);
          // vec3 waterColor = mix(albedoShallow, albedoDeep, v_scalar) + s * u_sun;
          vec3 waterColor = mix(albedoShallow, u_skyColor, v_scalar) + s * u_sunColor;
          float alpha = clamp(v_scalar / 0.5, 0.0, 1.0);
          vec4 color = vec4(waterColor * alpha, alpha);
          gl_FragColor = color;

          // gl_FragColor = texture2D(u_waves, v_position / 5000.0);
          // gl_FragColor = vec4(0.5 * getHeight(v_position), 0.0, 0.0, 1.0);
          // gl_FragColor = getDebugColor(v_position);
      }
    `, {
      "a_position": 0,
      "a_scalar": 1
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.wavesLocation = this.getUniformLocation(gl, "u_waves");
    this.windLocation = this.getUniformLocation(gl, "u_wind");
    this.sunColorLocation = this.getUniformLocation(gl, "u_sunColor");
    this.skyColorLocation = this.getUniformLocation(gl, "u_skyColor");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  updateTime(gl: WebGLRenderingContext, time: number) {
    gl.uniform1f(this.timeLocation, time);
  }

  updateWind(gl: WebGLRenderingContext, angle: number, speed: number) {
    gl.uniform2f(this.windLocation, angle, speed);
  }

  updateAtmosphere(gl: WebGLRenderingContext, sunElevation: number, sunAzimuth: number, sunColor: vec3, skyColor: vec3) {
    gl.uniform3fv(this.sunColorLocation, sunColor);
    gl.uniform3fv(this.skyColorLocation, skyColor);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.waves);
    gl.uniform1i(this.wavesLocation, 0);
  }
}

export class GrassProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private grassLocation: WebGLUniformLocation;
  private dirtLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute float a_scalar;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;

      varying vec2 v_position;
      varying float v_scalar;

      void main(void) {
        mat4 viewModel = u_view * u_model;
        gl_Position = u_project * viewModel * a_position;
        v_position = a_position.xy;
        v_scalar = a_scalar;
      }
    `, `
      precision mediump float;

      varying vec2 v_position;
      varying float v_scalar;

      uniform float u_time;
      uniform sampler2D u_grass;
      uniform sampler2D u_dirt;
      
      void main() {
        vec3 grass = texture2D(u_grass, v_position / 150.0).rgb;
        vec3 dirt = texture2D(u_dirt, v_position / 150.0).rgb;
        vec3 mixed = mix(dirt, grass, v_scalar);
        float alpha = clamp(v_scalar / 0.5, 0.0, 1.0);
        vec4 color = vec4(mixed * alpha, alpha);

        gl_FragColor = color;
      }
    `, {
      "a_position": 0,
      "a_scalar": 1
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.grassLocation = this.getUniformLocation(gl, "u_grass");
    this.dirtLocation = this.getUniformLocation(gl, "u_dirt");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  updateTime(gl: WebGLRenderingContext, time: number) {
    gl.uniform1f(this.timeLocation, time);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.grass);
    gl.uniform1i(this.grassLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, material.dirt);
    gl.uniform1i(this.dirtLocation, 1);
  }
}

// export class AmbientProgram {
//   private modelLocation: WebGLUniformLocation;

//   constructor(gl: WebGLRenderingContext) {
//     super(gl, `
//       precision mediump float;

//       attribute vec4 a_position;

//       uniform mat4 u_model;

//       void main(void) {
//         gl_Position = u_model * a_position;
//         v_position = a_position.xy;
//         v_scalar = a_scalar;
//       }
//     `, `
//       precision mediump float;

//       varying vec2 v_position;
//       varying float v_scalar;

//       uniform float u_time;
//       uniform sampler2D u_grass;
//       uniform sampler2D u_dirt;
      
//       void main() {
//         vec3 grass = texture2D(u_grass, v_position / 150.0).rgb;
//         vec3 dirt = texture2D(u_dirt, v_position / 150.0).rgb;
//         vec3 mixed = mix(dirt, grass, v_scalar);
//         float alpha = clamp(v_scalar / 0.5, 0.0, 1.0);
//         vec4 color = vec4(mixed * alpha, alpha);

//         gl_FragColor = color;
//       }
//     `, {
//       "a_position": 0,
//       "a_scalar": 1
//     });

//     this.modelLocation = this.getUniformLocation(gl, "u_model");
//     this.viewLocation = this.getUniformLocation(gl, "u_view");
//     this.projectLocation = this.getUniformLocation(gl, "u_project");
//     this.timeLocation = this.getUniformLocation(gl, "u_time");
//     this.grassLocation = this.getUniformLocation(gl, "u_grass");
//     this.dirtLocation = this.getUniformLocation(gl, "u_dirt");
//   }

//   updateView(gl: WebGLRenderingContext, view: mat4) {
//     gl.uniformMatrix4fv(this.viewLocation, false, view);
//   }

//   updateModel(gl: WebGLRenderingContext, model: mat4) {
//     gl.uniformMatrix4fv(this.modelLocation, false, model);
//   }

//   updateProject(gl: WebGLRenderingContext, project: mat4) {
//     gl.uniformMatrix4fv(this.projectLocation, false, project);
//   }

//   updateTime(gl: WebGLRenderingContext, time: number) {
//     gl.uniform1f(this.timeLocation, time);
//   }

//   protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, material.grass);
//     gl.uniform1i(this.grassLocation, 0);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, material.dirt);
//     gl.uniform1i(this.dirtLocation, 1);
//   }
// }


// precision mediump float;

// attribute vec2 a_position;
// attribute vec2 a_offset;
// attribute vec4 a_random;
// attribute vec2 a_timespan;

// uniform vec4 u_tint;
// uniform mat3 u_transform;
// uniform mat3 u_display;
// uniform float u_current_time;
// uniform vec4 u_random;
// uniform vec2 u_velocity;
// uniform vec4 u_animation_parameters;
// uniform float u_radius;
// uniform float u_size;
// uniform float u_period;
// uniform float u_expansion_speed;
// uniform vec4 u_life_parameters;

// uniform vec2 u_size_values;
// uniform vec4 u_size_easing;
// uniform vec4 u_alpha_easing;
// uniform vec4 u_light_easing;
// uniform vec4 u_velocity_vectors;
// uniform vec4 u_velocity_easing;
// uniform vec4 u_life_easing;

// const float PI = 3.14159;

// varying vec2 v_offset;
// varying vec2 v_frame_coords;
// varying vec4 v_tint;

// float clamper(float v) {
//   return clamp(v, 0.0, 0.5);
// }

// float factor(float v) {
//   return 0.5 * cos(2.0 * PI * clamper(v)) + 0.5;
// }

// float easing(float x, vec4 abcd) {
//   return factor(-(x - abcd[0]) * abcd[1] / 2.0) * factor((x - abcd[2]) * abcd[3] / 2.0);
// }

// float ease1(float x, float y, float t, vec4 abcd) {
//   float f = easing(t, abcd);
//   return mix(x, y, f);
// }

// vec2 ease2(vec2 x, vec2 y, float t, vec4 abcd) {
//   float f = easing(t, abcd);
//   return mix(x, y, f);
// }

// void main() {
//   vec4 random = mod(a_random + u_random, 1.0);
//   float phase = mod(u_current_time / u_period + random.z, 1.0);
//   float life_time = clamp((u_current_time - a_timespan[0]) / (a_timespan[1] - a_timespan[0]), 0.0, 1.0);

//   // if (life_time == 0.0 || life_time == 1.0) {
//   //   gl_Position.z = -2.0;
//   //   return;
//   // }

//   float size = ease1(u_size_values[0], u_size_values[1], phase, u_size_easing);
//   float alpha = ease1(0.0, 1.0, phase, u_alpha_easing);
//   float light = ease1(0.0, 1.0, phase, u_light_easing);
//   vec2 velocity = ease2(u_velocity_vectors.xy, u_velocity_vectors.zw, phase, u_velocity_easing);




//   gl_Position.xy = (u_display * (u_transform * vec3(a_position + a_offset * size + velocity * phase, 1.0))).xy;
//   gl_Position.zw = vec2(0.0, 1.0);

//   // Tint
//   v_tint = vec4(vec3(light), alpha) * u_tint;
//   v_tint.a *= ease1(0.0, 1.0, life_time, u_life_easing);

//   // Offset
//   v_offset = a_offset;

//   // Animation frame
//   float frame = mod(floor(-u_current_time * u_animation_parameters[3] + random.w * u_animation_parameters[0]), u_animation_parameters[0]);
//   float bs = 1.0 / u_animation_parameters[1];
//   float bt = 1.0 / u_animation_parameters[2];
//   float is = mod(frame, u_animation_parameters[1]);
//   float it = floor(frame / u_animation_parameters[2]);
//   v_frame_coords = vec2(is * bs, it * bt);

//   /*
//   float life_time = clamp((u_current_time - a_timespan[0]) / (a_timespan[1] - a_timespan[0]), 0.0, 1.0);
//   float life = 1.0 - pow(max(0.0, cos(u_life_parameters[0] * (life_time + u_life_parameters[1]) * 2.0 * 3.14159)), u_life_parameters[2]);
//   vec4 random = mod(a_random + u_random, 1.0);
//   float phase = u_current_time / u_period + random.z;
//   v_alpha = 1.0 - pow(max(cos(2.0 * PI * phase), 0.0), 10.0);
//   v_alpha *= life;
//   phase = mod(phase, 1.0);
//   float local_time = phase * u_period;
//   vec2 displacement = 2.0 * (random.xy - 0.5) * u_radius;
//   vec2 velocity = u_velocity + 2.0 * (random.xy - 0.5) * u_expansion_speed;
//   vec2 move = a_offset * u_size + displacement + velocity * local_time;
//   // gl_Position.xy = (u_display * (u_transform * vec3(a_position, 1.0) + vec3(move, 0.0))).xy;
//   gl_Position.xy = (u_display * (u_transform * vec3(a_position + move, 1.0))).xy;
//   gl_Position.zw = vec2(0.0, 1.0);
//   v_offset = a_offset;
//   float frame = mod(floor(-u_current_time * u_animation_parameters[3] + random.w * u_animation_parameters[0]), u_animation_parameters[0]);
//   float bs = 1.0 / u_animation_parameters[1];
//   float bt = 1.0 / u_animation_parameters[2];
//   float is = mod(frame, u_animation_parameters[1]);
//   float it = floor(frame / u_animation_parameters[2]);
//   v_frame_coords = vec2(is * bs, it * bt);
//   */
// }






export class SmokeProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;
  private animationParametersLocation: WebGLUniformLocation;
  private frameSizeLocation: WebGLUniformLocation;
  private windLocation: WebGLUniformLocation;
  private periodLocation: WebGLUniformLocation;
  private sizeValuesLocation: WebGLUniformLocation;
  private sizeEasingLocation: WebGLUniformLocation;
  private alphaEasingLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_offset;
      attribute vec4 a_random;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform float u_time;
      uniform vec4 u_animation_parameters;
      uniform vec2 u_frame_size;
      uniform vec2 u_wind;
      uniform float u_period;
      uniform vec2 u_size_values;
      uniform vec4 u_size_easing;
      uniform vec4 u_alpha_easing;

      varying vec2 v_offset;
      varying vec2 v_frame_coords;
      varying vec4 v_tint;

      const float PI = 3.14159;

      float clamper(float v) {
        return clamp(v, 0.0, 0.5);
      }

      float factor(float v) {
        return 0.5 * cos(2.0 * PI * clamper(v)) + 0.5;
      }

      float easing(float x, vec4 abcd) {
        return factor(-(x - abcd[0]) * abcd[1] / 2.0) * factor((x - abcd[2]) * abcd[3] / 2.0);
      }

      float ease1(float x, float y, float t, vec4 abcd) {
        float f = easing(t, abcd);
        return mix(x, y, f);
      }

      vec2 ease2(vec2 x, vec2 y, float t, vec4 abcd) {
        float f = easing(t, abcd);
        return mix(x, y, f);
      }

      void main(void) {
        vec4 random = a_random;
        float phase = mod(u_time / u_period + random.z, 1.0);
        
        float alpha = ease1(0.0, 0.3, phase, u_alpha_easing);
        float size = ease1(u_size_values[0], u_size_values[1], phase, u_size_easing);

        mat4 viewModel = u_view * u_model;
        gl_Position = u_project * viewModel * a_position;
        gl_Position.xy += 2.0 * (a_offset * size / u_frame_size) * gl_Position.w;
        float windAngle = u_wind[0] + (random.y - 0.5) * PI / 8.0;
        gl_Position.xy += 0.1 * phase * u_wind[1] * vec2(cos(-windAngle), sin(-windAngle));
        v_offset = a_offset;
        v_tint = vec4(1.0, 1.0, 1.0, alpha);

        // Animation frame
        float frame = mod(floor(u_time * u_animation_parameters[3] + random.y * u_animation_parameters[0]), u_animation_parameters[0]);
        float bs = 1.0 / u_animation_parameters[1];
        float bt = 1.0 / u_animation_parameters[2];
        float is = mod(frame, u_animation_parameters[1]);
        float it = floor(frame / u_animation_parameters[2]);
        // v_frame_coords = vec2(is * bs, it * bt);
        v_frame_coords = vec2(is * bs, 1.0 - (1.0 + it) * bt);
        //v_frame_coords = vec2(0.0, 0.0);
      }
    `, `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform vec4 u_animation_parameters;
      
      varying vec2 v_offset;
      varying vec2 v_frame_coords;
      varying vec4 v_tint;
      
      const float PI = 3.14159;
      
      void main() {
          vec2 baseUV = v_offset + 0.5;
          vec4 color = texture2D(u_texture, baseUV / u_animation_parameters.yz + v_frame_coords);
          color *= v_tint;
          color.rgb *= color.a;
          gl_FragColor = color;
          // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `, {
      "a_position": 0,
      "a_offset": 1,
      "a_random": 2
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.textureLocation = this.getUniformLocation(gl, "u_texture");
    this.animationParametersLocation = this.getUniformLocation(gl, "u_animation_parameters");
    this.frameSizeLocation = this.getUniformLocation(gl, "u_frame_size");
    this.windLocation = this.getUniformLocation(gl, "u_wind");
    this.periodLocation = this.getUniformLocation(gl, "u_period");
    this.sizeValuesLocation = this.getUniformLocation(gl, "u_size_values");
    this.sizeEasingLocation = this.getUniformLocation(gl, "u_size_easing");
    this.alphaEasingLocation = this.getUniformLocation(gl, "u_alpha_easing");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  updateTime(gl: WebGLRenderingContext, time: number) {
    gl.uniform1f(this.timeLocation, time);
  }

  updateFrameSize(gl: WebGLRenderingContext, width: number, height: number) {
    gl.uniform2f(this.frameSizeLocation, width, height);
  }

  updateWind(gl: WebGLRenderingContext, angle: number, speed: number) {
    gl.uniform2f(this.windLocation, angle, speed);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.uniform4f(this.animationParametersLocation,
      material.animationParameters.frames,
      material.animationParameters.rows,
      material.animationParameters.cols,
      material.animationParameters.fps
    );

    gl.uniform1f(this.periodLocation, material.period);
    gl.uniform2fv(this.sizeValuesLocation, material.sizeValues);
    gl.uniform4fv(this.sizeEasingLocation, material.sizeEasing);
    gl.uniform4fv(this.alphaEasingLocation, material.alphaEasing);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.texture);
    gl.uniform1i(this.textureLocation, 0);
  }
}

export class SpriteProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;
  private animationParametersLocation: WebGLUniformLocation;
  private frameSizeLocation: WebGLUniformLocation;
  private sizeLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_offset;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform float u_time;
      uniform vec4 u_animation_parameters;
      uniform vec2 u_frame_size;
      uniform vec2 u_size;

      varying vec2 v_offset;
      varying vec2 v_frame_coords;

      void main(void) {
        mat4 viewModel = u_view * u_model;
        gl_Position = u_project * viewModel * a_position;
        gl_Position.xy += 2.0 * (a_offset * u_size / u_frame_size) * gl_Position.w;
        v_offset = a_offset;

        // Animation frame
        float frame = mod(floor(u_time * u_animation_parameters[3]), u_animation_parameters[0]);
        float bs = 1.0 / u_animation_parameters[1];
        float bt = 1.0 / u_animation_parameters[2];
        float is = mod(frame, u_animation_parameters[1]);
        float it = floor(frame / u_animation_parameters[2]);
        v_frame_coords = vec2(is * bs, 1.0 - (1.0 + it) * bt);
      }
    `, `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform vec4 u_animation_parameters;
      
      varying vec2 v_offset;
      varying vec2 v_frame_coords;
      
      void main() {
          vec2 baseUV = v_offset + 0.5;
          vec4 color = texture2D(u_texture, baseUV / u_animation_parameters.yz + v_frame_coords);
          color.rgb *= color.a;
          gl_FragColor = color;
      }
    `, {
      "a_position": 0,
      "a_offset": 1
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.textureLocation = this.getUniformLocation(gl, "u_texture");
    this.animationParametersLocation = this.getUniformLocation(gl, "u_animation_parameters");
    this.frameSizeLocation = this.getUniformLocation(gl, "u_frame_size");
    this.sizeLocation = this.getUniformLocation(gl, "u_size");
  }

  updateView(gl: WebGLRenderingContext, view: mat4) {
    gl.uniformMatrix4fv(this.viewLocation, false, view);
  }

  updateModel(gl: WebGLRenderingContext, model: mat4) {
    gl.uniformMatrix4fv(this.modelLocation, false, model);
  }

  updateProject(gl: WebGLRenderingContext, project: mat4) {
    gl.uniformMatrix4fv(this.projectLocation, false, project);
  }

  updateTime(gl: WebGLRenderingContext, time: number) {
    gl.uniform1f(this.timeLocation, time);
  }

  updateFrameSize(gl: WebGLRenderingContext, width: number, height: number) {
    gl.uniform2f(this.frameSizeLocation, width, height);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.uniform4f(this.animationParametersLocation,
      material.animationParameters.frames,
      material.animationParameters.rows,
      material.animationParameters.cols,
      material.animationParameters.fps
    );

    gl.uniform2fv(this.sizeLocation, material.size);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.texture);
    gl.uniform1i(this.textureLocation, 0);
  }
}

export type Program = StandardProgram | CanopyProgram | WaterProgram | GrassProgram | SmokeProgram | SpriteProgram;
