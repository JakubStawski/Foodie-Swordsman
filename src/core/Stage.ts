import { Sprite } from "pixi.js";
import { App } from "./App";
import { Loader } from "./Loader";

export class Stage {
    private _app: App;
    private _loader: Loader;

    constructor(app: App, loader: Loader) {
        this._app = app;
        this._loader = loader;

        this._initGame();
    }

    private _initGame(): void {
        this._app.start();

        const character = new Sprite(this._loader.getAsset("character"));
        this._app.stage.addChild(character);
    }
}
