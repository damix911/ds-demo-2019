import { createProgram } from "./misc";
import { mat4 } from "gl-matrix";

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
        float r = noise(a_position.xy);

        vec4 position = a_position;
        //position.xy += vec2(cos(u_time + r * 10.0), sin(u_time + r * 10.0));
        vec2 xAxis = normalize(vec2(-1.0, 1.0));
        vec2 yAxis = vec2(-xAxis.y, xAxis.x);
        vec2 dir = xAxis * cos(0.2 * cos(1.7 * u_time + r * 10.0)) + yAxis * sin(0.2 * cos(1.7 * u_time + r * 10.0));
        position.xy += 100.0 * cos(u_time + r * 10.0) * dir;
        position.xy += 100.0 * (a_random.xy - 0.5);
        position.xyz += a_offset;

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

        v_darken = 0.5 + 0.5 * r;
        
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
        gl_FragColor.rgb *= v_darken;
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
    gl.bindTexture(gl.TEXTURE_2D, material.diffuse);
    gl.uniform1i(this.diffuseLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, material.normal);
    gl.uniform1i(this.normalLocation, 1);
  }
}

export type Program = StandardProgram | CanopyProgram;

/*
export class ForestProgram implements IProgram {
  private program: WebGLProgram;
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.program = createProgram(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_normal;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform float u_time;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_normal;

      void main(void) {
        // Animation
        float h = a_texcoord.y;
        vec4 position = a_position + vec4(h * h * 0.1 * cos(u_time * 2.0), 0.0, 0.0, 0.0);







        mat4 viewModel = u_view * u_model;
        mat3 viewModel3 = mat3(viewModel);

        gl_Position = u_project * viewModel * position;
        
        v_texcoord = a_texcoord;




        


        

        v_eye = -(viewModel * a_position).xyz;
        v_normal = viewModel3 * a_normal;

        if (dot(v_eye, v_normal) < 0.0) {
          v_normal = -v_normal;
        }
      }
    `, `
      precision mediump float;

      uniform sampler2D u_texture;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_normal;

      void main(void) {
        vec4 color = texture2D(u_texture, v_texcoord);
        //color.rgb *= color.a;
        if (color.a < 0.9) {
          discard;
        }

        vec3 normal = v_normal;
        vec3 eye = normalize(v_eye);
        
        vec3 light = eye;
        //vec3 light = vec3(0.0, 1.0, 0.0);

        float d = clamp(dot(normal, light), 0.0, 1.0);
        float s = pow(clamp(dot(reflect(-light, normal), eye), 0.0, 1.0), 10.0);

        // gl_FragColor = vec4(vec3(0.3 + 0.3 * d + 0.4 * s), 1.0);


        
        

        gl_FragColor = color;
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_normal": 2
    });

    this.modelLocation = gl.getUniformLocation(this.program, "u_model");
    this.viewLocation = gl.getUniformLocation(this.program, "u_view");
    this.projectLocation = gl.getUniformLocation(this.program, "u_project");
    this.timeLocation = gl.getUniformLocation(this.program, "u_time");
    this.textureLocation = gl.getUniformLocation(this.program, "u_texture");
  }

  use(gl: WebGLRenderingContext) {
    gl.useProgram(this.program);
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

  updateTexture(gl: WebGLRenderingContext, unit: number) {
    gl.uniform1i(this.textureLocation, unit);
  }
}





export class CanopyProgram implements IProgram {
  private program: WebGLProgram;
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private timeLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.program = createProgram(gl, `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_normal;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_project;
      uniform float u_time;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_normal;

      void main(void) {
        // Animation
        float h = a_texcoord.y;
        vec4 position = a_position + vec4(h * h * 0.1 * cos(u_time * 2.0), 0.0, 0.0, 0.0);







        mat4 viewModel = u_view * u_model;
        mat3 viewModel3 = mat3(viewModel);

        gl_Position = u_project * viewModel * position;
        
        v_texcoord = a_texcoord;




        


        

        v_eye = -(viewModel * a_position).xyz;
        v_normal = viewModel3 * a_normal;

        if (dot(v_eye, v_normal) < 0.0) {
          v_normal = -v_normal;
        }
      }
    `, `
      precision mediump float;

      uniform sampler2D u_texture;

      varying vec2 v_texcoord;
      varying vec3 v_eye;
      varying vec3 v_normal;

      void main(void) {
        vec4 color = texture2D(u_texture, v_texcoord);
        //color.rgb *= color.a;
        if (color.a < 0.9) {
          discard;
        }

        vec3 normal = v_normal;
        vec3 eye = normalize(v_eye);
        
        vec3 light = eye;
        //vec3 light = vec3(0.0, 1.0, 0.0);

        float d = clamp(dot(normal, light), 0.0, 1.0);
        float s = pow(clamp(dot(reflect(-light, normal), eye), 0.0, 1.0), 10.0);

        // gl_FragColor = vec4(vec3(0.3 + 0.3 * d + 0.4 * s), 1.0);


        
        

        gl_FragColor = color;
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_normal": 2
    });

    this.modelLocation = gl.getUniformLocation(this.program, "u_model");
    this.viewLocation = gl.getUniformLocation(this.program, "u_view");
    this.projectLocation = gl.getUniformLocation(this.program, "u_project");
    this.timeLocation = gl.getUniformLocation(this.program, "u_time");
    this.textureLocation = gl.getUniformLocation(this.program, "u_texture");
  }

  use(gl: WebGLRenderingContext) {
    gl.useProgram(this.program);
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

  updateTexture(gl: WebGLRenderingContext, unit: number) {
    gl.uniform1i(this.textureLocation, unit);
  }
}
*/
