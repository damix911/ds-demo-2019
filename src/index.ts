import { Application } from "./app";
import { vec4 } from "gl-matrix";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");
const app = new Application(vec4.fromValues(0.2, 0.3, 0.5, 1.0));

function render() {
  app.setView([-10539183.811482586 + 1000 * Math.cos(performance.now() / 2000), 4651153.046248602 + 1000 * Math.sin(performance.now() / 1000)], 0, 4.777);
  app.render(gl);
  requestAnimationFrame(render);
}

app.load().then(() => {
  requestAnimationFrame(render);
});
