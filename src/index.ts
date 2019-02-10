import { Application } from "./app";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");
const app = new Application();

function render() {
  app.render(gl);
  requestAnimationFrame(render);
}

app.load().then(() => {
  requestAnimationFrame(render);
});
