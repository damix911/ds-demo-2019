import { createProgram } from "./misc";
import { mat4 } from "gl-matrix";

export interface IProgram {
}

export class StandardProgram implements IProgram {
  private program: WebGLProgram;
  private modelLocation: WebGLUniformLocation;
  private viewLocation: WebGLUniformLocation;
  private projectLocation: WebGLUniformLocation;
  private normalLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.program = createProgram(gl, `
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

        vec3 eye = normalize(v_eye);
        
        vec3 light = eye;
        //vec3 light = vec3(0.0, 1.0, 0.0);

        float d = clamp(dot(normal, light), 0.0, 1.0);
        float s = pow(clamp(dot(reflect(-light, normal), eye), 0.0, 1.0), 10.0);

        gl_FragColor = vec4(vec3(0.3 + 0.3 * d + 0.4 * s), 1.0);
      }
    `, {
      "a_position": 0,
      "a_texcoord": 1,
      "a_tangent": 2,
      "a_binormal": 3,
      "a_normal": 4
    });

    this.modelLocation = gl.getUniformLocation(this.program, "u_model");
    this.viewLocation = gl.getUniformLocation(this.program, "u_view");
    this.projectLocation = gl.getUniformLocation(this.program, "u_project");
    this.normalLocation = gl.getUniformLocation(this.program, "u_normal");
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

  updateNormal(gl: WebGLRenderingContext, unit: number) {
    gl.uniform1i(this.normalLocation, unit);
  }
}

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