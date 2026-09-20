import { Container } from "pixi.js";
import { Button, BUTTON_GAP } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

/**
 * Title screen: logo, Play!, Help, Credits. Scenery lives on the stage.
 */
export class MainMenu extends Container {
    private readonly _logo: Logo;

    constructor(loader: Loader) {
        super();
        this.name = "MainMenu";

        const font = loader.getFont("pixelify_sans");
        const plaque = loader.getAsset("button");
        const play = new Button("Play!", font, plaque, () => gameStore.getState().start());
        play.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.42);

        const help = new Button("Help", font, plaque, () => gameStore.getState().openHelp());
        help.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.42 + BUTTON_GAP);

        const credits = new Button("Credits", font, plaque, () => gameStore.getState().openCredits());
        credits.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.42 + BUTTON_GAP * 2);

        this._logo = new Logo(font, loader.getAsset("character"));
        this._logo.position.set(DESIGN_WIDTH / 2, 80);

        this.addChild(this._logo, play, help, credits);
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }
}
