import { Loader } from "./core/Loader";
import { Stage } from "./core/Stage";
import { App } from "./core/App";

import gfxConfig from "./config/gfx.json";

const app = new App();
const loader = new Loader(gfxConfig);

await loader.loadAssets();

new Stage(app, loader);
