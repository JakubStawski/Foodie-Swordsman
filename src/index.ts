import { Loader } from "./core/Loader";
import { Stage } from "./core/Stage";
import { App } from "./core/App";
import { soundController } from "./core/SoundController";

import gfxConfig from "./config/gfx.json";
import sfxConfig from "./config/sfx.json";

const app = new App();
const loader = new Loader(gfxConfig);

await Promise.all([loader.loadAssets(), soundController.load(sfxConfig)]);
soundController.startMusic();

new Stage(app, loader);
