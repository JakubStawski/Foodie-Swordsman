import { Container, Graphics, Rectangle } from "pixi.js";
import { Button, BUTTON_GAP } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

/**
 * Dim overlay on top of the game: logo, Resume, Exit.
 */
export class Pause extends Container {
    private readonly _logo: Logo;

    constructor(loader: Loader) {
        super();
        this.name = "Pause";

        const dim = new Graphics();
        dim.beginFill(0x000000, 0.5);
        dim.drawRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        dim.endFill();
        dim.eventMode = "static";
        dim.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("character"));
        this._logo.position.set(DESIGN_WIDTH / 2, 80);

        const plaque = loader.getAsset("button");
        const resume = new Button("Resume", font, plaque, () => gameStore.getState().resume());
        resume.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.48);

        const exit = new Button("Exit", font, plaque, () => gameStore.getState().quit());
        exit.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.48 + BUTTON_GAP);

        this.addChild(dim, this._logo, resume, exit);
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }
}
