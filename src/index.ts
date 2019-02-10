import { Application } from "./app";
import { vec4 } from "gl-matrix";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");
const app = new Application(vec4.fromValues(0.2, 0.3, 0.5, 1.0));

app.setView([0, 0], 0, 1);

function render() {
  app.render(gl);
  requestAnimationFrame(render);
}

app.load().then(() => {
  requestAnimationFrame(render);
});
