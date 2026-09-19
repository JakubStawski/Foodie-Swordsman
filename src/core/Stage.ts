import { App } from "./App";
import { Loader } from "./Loader";
import { Character } from "../components/Character";
import { Food } from "../components/Food";

const DESIGN_WIDTH = 450;
const DESIGN_HEIGHT = 800;
const FOOD_SPAWN_INTERVAL = 90;
const CATCH_RADIUS = 55;
const FOOD_MARGIN = 24;

export class Stage {
    private _app: App;
    private _loader: Loader;
    private readonly _foods: Food[] = [];
    private _spawnTimer = 0;

    constructor(app: App, loader: Loader) {
        this._app = app;
        this._loader = loader;

        this._initGame();
    }

    private _initGame(): void {
        this._app.start();

        const character = new Character(this._loader.getAsset("character"));
        character.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 120);
        this._app.stage.addChild(character);

        this._spawnFood();

        this._app.ticker.add((delta) => {
            character.update(delta);
            this._updateFoods(delta, character);
        });
    }

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
                this._overlapsCatch(character, food)
            ) {
                food.hit();
            }

            if (food.isDone || food.y > DESIGN_HEIGHT + 40) {
                this._app.stage.removeChild(food);
                food.destroy({ children: true });
                this._foods.splice(i, 1);
            }
        }
    }

    private _spawnFood(): void {
        const food = new Food(this._loader.getAsset("food"));
        const x = FOOD_MARGIN + Math.random() * (DESIGN_WIDTH - FOOD_MARGIN * 2);
        food.position.set(x, -20);
        this._foods.push(food);
        this._app.stage.addChild(food);
    }

    private _overlapsCatch(character: Character, food: Food): boolean {
        const dx = character.x - food.x;
        const dy = character.y - food.y;
        return dx * dx + dy * dy <= CATCH_RADIUS * CATCH_RADIUS;
    }
}
