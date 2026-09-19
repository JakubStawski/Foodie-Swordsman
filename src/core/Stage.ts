import { Container } from "pixi.js";
import { App } from "./App";
import { Loader } from "./Loader";
import { Character } from "../components/Character";
import { Food } from "../components/Food";

const DESIGN_WIDTH = 450;
const DESIGN_HEIGHT = 800;
const FOOD_SPAWN_INTERVAL = 90;
const CATCH_RADIUS = 55;
const FOOD_MARGIN = 24;
const FOOD_BOTTOM_PADDING = 48;
const SHAKE_DURATION = 10;
const SHAKE_MAGNITUDE = 4;

/**
 * The main stage of the game.
 */
export class Stage {
    private _app: App;
    private _loader: Loader;
    private readonly _world: Container;
    private readonly _foods: Food[] = [];
    private _spawnTimer = 0;
    private _shakeElapsed = 0;
    private _shakeDuration = 0;

    constructor(app: App, loader: Loader) {
        this._app = app;
        this._loader = loader;
        this._world = new Container();
        this._world.name = "World";

        this._initGame();
    }

    /**
     * Initialize the game and all its elements.
     */
    private _initGame(): void {
        this._app.start();
        this._app.stage.addChild(this._world);

        const character = new Character(this._loader.getAsset("character"));
        character.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 120);
        this._world.addChild(character);

        this._spawnFood();

        this._app.ticker.add((delta) => {
            character.update(delta);
            this._updateFoods(delta, character);
            this._updateShake(delta);
        });
    }

    /**
     * Update the foods on the stage.
     * @param delta the delta time
     * @param character the character
     */
    private _updateFoods(delta: number, character: Character): void {
        this._spawnTimer += delta;
        if (this._spawnTimer >= FOOD_SPAWN_INTERVAL) {
            this._spawnTimer = 0;
            this._spawnFood();
        }

        for (let i = this._foods.length - 1; i >= 0; i--) {
            const food = this._foods[i];
            food.update(delta);

            if (
                character.isCatching &&
                !food.isHit &&
                !food.isMissed &&
                this._overlapsCatch(character, food)
            ) {
                food.hit();
                this._shake();
            }

            if (!food.isHit && !food.isMissed && food.y > DESIGN_HEIGHT - FOOD_BOTTOM_PADDING) {
                food.miss();
            }

            if (food.isDone) {
                this._world.removeChild(food);
                food.destroy({ children: true });
                this._foods.splice(i, 1);
            }
        }
    }

    /**
     * Spawn a new food item on the stage.
     */
    private _spawnFood(): void {
        const food = new Food(this._loader.getAsset("food"));
        const x = Math.round(FOOD_MARGIN + Math.random() * (DESIGN_WIDTH - FOOD_MARGIN * 2));
        food.position.set(x, -20);
        this._foods.push(food);
        this._world.addChild(food);
    }

    /**
     * Shake the stage. This is camera shake simulation
     */
    private _shake(): void {
        this._shakeElapsed = 0;
        this._shakeDuration = SHAKE_DURATION;
    }

    /**
     * Update the shake animation.
     * @param delta the delta time
     */
    private _updateShake(delta: number): void {
        if (this._shakeDuration <= 0) {
            this._world.position.set(0, 0);
            return;
        }

        this._shakeElapsed += delta;
        if (this._shakeElapsed >= this._shakeDuration) {
            this._shakeDuration = 0;
            this._world.position.set(0, 0);
            return;
        }

        const t = 1 - this._shakeElapsed / this._shakeDuration;
        const mag = SHAKE_MAGNITUDE * t;
        this._world.x = Math.round((Math.random() * 2 - 1) * mag);
        this._world.y = Math.round((Math.random() * 2 - 1) * mag);
    }

    /**
     * Check if the character overlaps the food.
     * @param character the character
     * @param food the food
     * @returns true if the character overlaps the food
     */
    private _overlapsCatch(character: Character, food: Food): boolean {
        const dx = character.x - food.x;
        const dy = character.y - food.y;
        return dx * dx + dy * dy <= CATCH_RADIUS * CATCH_RADIUS;
    }
}
