import { Application, Container, Ticker } from "pixi.js";

const DESIGN_WIDTH = 450;
const DESIGN_HEIGHT = 800;
const ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

export class App {
    private _app: Application;

    constructor() {
        this._app = new Application({
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            antialias: false,
            backgroundAlpha: 0,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
        });

        this._prepareCanvas();

        window.addEventListener('resize', this._resize.bind(this));
        this._resize();

        // @ts-ignore
        globalThis.__PIXI_APP__ = this._app;
    }

    public get stage(): Container {
        return this._app.stage;
    }

    public get ticker(): Ticker {
        return this._app.ticker;
    }

    /**
     * Add canvas if it doesn't exist
     */
    private _prepareCanvas(): void {
        const existingCanvas = document.querySelector('canvas');

        if (!existingCanvas) {
            const root = document.querySelector('#app') || document.body;
            const canvas = this._app.view as HTMLCanvasElement;
            canvas.classList.add('gameContainer__canvas');
            root.appendChild(canvas);
        }
    }

    /**
     * Resize the canvas to the window size and scale stage content
     * to the design resolution
     */
    private _resize(): void {
        let width = window.innerWidth;
        let height = width / ASPECT;

        if (height > window.innerHeight) {
            height = window.innerHeight;
            width = height * ASPECT;
        }

        width = Math.floor(width);
        height = Math.floor(height);

        this._app.renderer.resize(width, height);

        const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        this._app.stage.scale.set(scale);
    }

    /**
     * Initialize the stage
     */
    public async start(): Promise<void> {
        await this._app.start();

        this._prepareCanvas();
    }
}