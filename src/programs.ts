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

  dispose(gl: WebGLRenderingContext) {
    gl.deleteProgram(this.program);
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

export class CanopyProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private diffuseLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private windLocation: WebGLUniformLocation;
  private sunAzimuthLocation: WebGLUniformLocation;
  private sunElevationLocation: WebGLUniformLocation;
  private sunColorLocation: WebGLUniformLocation;
  private skyColorLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_offset;
      attribute vec3 a_random;

      uniform float u_time;
      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform vec2 u_wind;
      uniform float u_sunAzimuth;
      uniform float u_sunElevation;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;

      varying vec2 v_offset;
      varying vec2 v_texcoord;
      varying vec3 v_eye;
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

        float bend = 0.01*(a_position.z / 10.0) * (cos(u_time + r * 10.0) + 1.0);
        position.xy += bend * u_wind[1] * vec2(cos(-u_wind[0]), sin(-u_wind[0]));
        
        vec2 offset = a_offset.xy * (1.0 - a_position.z / 30.0);
        float c = cos(r * 2.0 * 3.1415 + 0.1 * cos(0.5 * u_time + r * 10.0));
        float s = sin(r * 2.0 * 3.1415 + 0.1 * cos(0.5 * u_time + r * 10.0));
        vec2 rotated_offset = vec2(
          c * offset.x + s * offset.y,
         -s * offset.x + c * offset.y
        );
        position.xyz += vec3(rotated_offset, a_offset.z);

        mat4 viewModel = u_view * u_model;
        mat3 viewModel3 = mat3(viewModel);

        gl_Position = u_project * viewModel * position;
        
        v_offset = rotated_offset;
        v_texcoord = a_texcoord;
        

        v_eye = -(viewModel * a_position).xyz;
        
        v_random = a_random;
      }
    `, `
      precision mediump float;

      uniform float u_time;
      uniform sampler2D u_diffuse;
      uniform float u_sunElevation;
      uniform float u_sunAzimuth;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;

      varying vec2 v_offset;
      varying vec2 v_texcoord;
      varying vec3 v_random;

      void main(void) {
        vec3 light_dir = normalize(vec3(cos(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunElevation)));
        float d = clamp(dot(normalize(light_dir.xy), normalize(v_offset)), 0.0, 1.0);
        
        vec4 diffuse = texture2D(u_diffuse, v_texcoord);
        vec3 color = diffuse.rgb * (d * u_sunColor + u_skyColor);
        gl_FragColor = vec4(color, diffuse.a);
        gl_FragColor.rgb *= gl_FragColor.a;
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_offset": 2,
      "a_random": 3
    });

    this.modelLocation = this.getUniformLocation(gl, "u_model");
    this.viewLocation = this.getUniformLocation(gl, "u_view");
    this.projectLocation = this.getUniformLocation(gl, "u_project");
    this.diffuseLocation = this.getUniformLocation(gl, "u_diffuse");
    this.timeLocation = this.getUniformLocation(gl, "u_time");
    this.windLocation = this.getUniformLocation(gl, "u_wind");
    this.sunAzimuthLocation = this.getUniformLocation(gl, "u_sunAzimuth");
    this.sunElevationLocation = this.getUniformLocation(gl, "u_sunElevation");
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
    gl.uniform1f(this.sunElevationLocation, sunElevation);
    gl.uniform1f(this.sunAzimuthLocation, sunAzimuth);
    gl.uniform3fv(this.sunColorLocation, sunColor);
    gl.uniform3fv(this.skyColorLocation, skyColor);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.diffuse);
    gl.uniform1i(this.diffuseLocation, 0);
  }
}

export class WaterProgram extends MaterialProgram {
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private wavesLocation: WebGLUniformLocation;
  private diffuseLocation: WebGLUniformLocation;
  private windLocation: WebGLUniformLocation;
  private sunElevationLocation: WebGLUniformLocation;
  private sunAzimuthLocation: WebGLUniformLocation;
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
      uniform vec3 u_diffuse;
      uniform vec2 u_wind;
      uniform float u_sunElevation;
      uniform float u_sunAzimuth;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;
      
      const float u_resolution = 0.5971642835598172;
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
          vec3 light_dir = normalize(vec3(cos(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunElevation)));

          float step = u_resolution;

          float hL = getHeight(v_position + vec2(-step, 0.0));
          float hR = getHeight(v_position + vec2(+step, 0.0));
          float hU = getHeight(v_position + vec2(0.0, -step));
          float hD = getHeight(v_position + vec2(0.0, +step));
          float dx = hR - hL;
          float dy = hU - hD;


          vec3 normal = normalize(vec3(-dx, -dy, 0.2));
          vec3 r = reflect(-light_dir, normal);
          float fresnel = 1.0;//pow(1.0 - dot(normal, view), 1.0);
          float s = fresnel * pow(clamp(dot(r, view), 0.0, 1.0), 5.0);
          // vec3 waterColor = mix(albedoShallow, albedoDeep, v_scalar) + s * u_sun;
          // vec3 waterColor = mix(albedoShallow, u_skyColor, v_scalar) + s * u_sunColor;
          vec3 waterColor = u_diffuse + s * u_sunColor;
          float alpha = clamp(v_scalar / 0.5, 0.0, 1.0);
          vec4 color = vec4(waterColor * alpha, alpha);
          gl_FragColor = color;

          // gl_FragColor = texture2D(u_waves, v_position / 5000.0);
          // gl_FragColor = vec4(0.5 * getHeight(v_position), 0.0, 0.0, 1.0);
          // gl_FragColor = getDebugColor(v_position);

          // gl_FragColor = vec4(fresnel, 0.0, 0.0, 1.0);
          // gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
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
    this.diffuseLocation = this.getUniformLocation(gl, "u_diffuse");
    this.windLocation = this.getUniformLocation(gl, "u_wind");
    this.sunAzimuthLocation = this.getUniformLocation(gl, "u_sunAzimuth");
    this.sunElevationLocation = this.getUniformLocation(gl, "u_sunElevation");
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
    gl.uniform1f(this.sunElevationLocation, sunElevation);
    gl.uniform1f(this.sunAzimuthLocation, sunAzimuth);
    gl.uniform3fv(this.sunColorLocation, sunColor);
    gl.uniform3fv(this.skyColorLocation, skyColor);
  }

  protected doUpdateMaterial(gl: WebGLRenderingContext, material: Material): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, material.waves);
    gl.uniform1i(this.wavesLocation, 0);

    gl.uniform3fv(this.diffuseLocation, material.diffuse);
  }
}

export class ParticleProgram extends MaterialProgram {
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
        
        float alpha = ease1(0.0, 0.1, phase, u_alpha_easing);
        float size = ease1(u_size_values[0], u_size_values[1], phase, u_size_easing);

        mat4 viewModel = u_view * u_model;
        vec4 position = a_position + vec4(a_offset * size, 0.0, 0.0);
        float windAngle = u_wind[0] + (random.y - 0.5) * PI / 8.0;
        position.xy += 0.1 * phase * u_wind[1] * vec2(cos(-windAngle), sin(-windAngle));
        gl_Position = u_project * viewModel * position;
        v_offset = a_offset;
        v_tint = vec4(1.0, 1.0, 1.0, alpha);

        // Animation frame
        float frame = mod(floor(u_time * u_animation_parameters[3] + random.y * u_animation_parameters[0]), u_animation_parameters[0]);
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
      varying vec4 v_tint;
      
      const float PI = 3.14159;
      
      void main() {
          vec2 baseUV = v_offset + 0.5;
          vec4 color = texture2D(u_texture, baseUV / u_animation_parameters.yz + v_frame_coords);
          color *= v_tint;
          color.rgb *= color.a;
          gl_FragColor = color;
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
        vec4 position = a_position + vec4(a_offset * u_size, 0.0, 0.0);
        gl_Position = u_project * viewModel * position;
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

export class AtmosphereProgram extends BaseProgram {
  private sunElevationLocation: WebGLUniformLocation;
  private sunAzimuthLocation: WebGLUniformLocation;
  private sunColorLocation: WebGLUniformLocation;
  private skyColorLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, `
      precision highp float;

      attribute vec4 a_position;

      uniform float u_sunElevation;
      uniform float u_sunAzimuth;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;

      varying vec4 v_color;

      void main(void) {
        vec3 light_dir = normalize(vec3(cos(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunAzimuth) * cos(u_sunElevation), sin(u_sunElevation)));

        float alpha = 0.2;
        v_color = vec4(u_skyColor * alpha, alpha);

        gl_Position = a_position;
      }
    `, `
      precision highp float;

      varying vec4 v_color;

      void main() {
          gl_FragColor = v_color;
      }
    `, {
      "a_position": 0
    });

    this.sunAzimuthLocation = this.getUniformLocation(gl, "u_sunAzimuth");
    this.sunElevationLocation = this.getUniformLocation(gl, "u_sunElevation");
    this.sunColorLocation = this.getUniformLocation(gl, "u_sunColor");
    this.skyColorLocation = this.getUniformLocation(gl, "u_skyColor");
  }

  updateAtmosphere(gl: WebGLRenderingContext, sunElevation: number, sunAzimuth: number, sunColor: vec3, skyColor: vec3) {
    gl.uniform1f(this.sunElevationLocation, sunElevation);
    gl.uniform1f(this.sunAzimuthLocation, sunAzimuth);
    gl.uniform3fv(this.sunColorLocation, sunColor);
    gl.uniform3fv(this.skyColorLocation, skyColor);
  }
}

export type Program = CanopyProgram | WaterProgram | ParticleProgram | SpriteProgram | AtmosphereProgram;
