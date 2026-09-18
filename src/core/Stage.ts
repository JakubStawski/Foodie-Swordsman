import { App } from "./App";
import { Loader } from "./Loader";
import { Character } from "../components/Character";

const DESIGN_WIDTH = 450;
const DESIGN_HEIGHT = 800;

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

        const character = new Character(this._loader.getAsset("character"));
        character.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        this._app.stage.addChild(character);

        this._app.ticker.add((delta) => {
            character.update(delta);
        });
    }
}
