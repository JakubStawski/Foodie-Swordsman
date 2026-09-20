import { Container, SCALE_MODES, Text, TextStyle, Texture } from "pixi.js";
import { Background } from "../components/Background";
import { Character } from "../components/Character";
import { Food } from "../components/Food";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

const FOOD_SPAWN_INTERVAL = 90;
const CATCH_RADIUS = 65;
const FOOD_MARGIN = 24;
const FOOD_BOTTOM_PADDING = 48;
const SHAKE_DURATION = 12;
const SHAKE_MAGNITUDE = 4;
const POINTS_PER_FOOD = 10;
const CHARACTER_Y = DESIGN_HEIGHT - 120;
const HUD_Y = 20;
const HUD_MARGIN = 20;

/**
 * Playfield: background, character, falling food, HP and score. No logo.
 */
export class Game extends Container {
    private readonly _world: Container;
    private readonly _background: Background;
    private readonly _character: Character;
    private readonly _hpText: Text;
    private readonly _pointsText: Text;
    private readonly _foodTexture: Texture;
    private readonly _foods: Food[] = [];

    private _spawnTimer = 0;
    private _shakeElapsed = 0;
    private _shakeDuration = 0;

    constructor(loader: Loader) {
        super();
        this.name = "Game";

        this._world = new Container();
        this._world.name = "World";

        this._background = new Background([
            loader.getAsset("bg_01"),
            loader.getAsset("bg_02"),
            loader.getAsset("bg_03"),
            loader.getAsset("bg_04"),
        ]);
        this._character = new Character(loader.getAsset("character"));
        this._character.position.set(DESIGN_WIDTH / 2, CHARACTER_Y);
        this._foodTexture = loader.getAsset("food");

        this._world.addChild(this._background, this._character);

        const font = loader.getFont("pixelify_sans");
        this._hpText = this._hudText(this._hpLabel(gameStore.getState().hp), font);
        this._hpText.anchor.set(0, 0);
        this._hpText.position.set(HUD_MARGIN, HUD_Y);

        this._pointsText = this._hudText(this._pointsLabel(gameStore.getState().points), font);
        this._pointsText.anchor.set(1, 0);
        this._pointsText.position.set(DESIGN_WIDTH - HUD_MARGIN, HUD_Y);

        this.addChild(this._world, this._hpText, this._pointsText);

        gameStore.subscribe((state, prev) => {
            if (state.hp !== prev.hp) {
                this._hpText.text = this._hpLabel(state.hp);
            }
            if (state.points !== prev.points) {
                this._pointsText.text = this._pointsLabel(state.points);
            }
        });
    }

    /**
     * Clear food, reset the character, and sync the HUD for a new round.
     */
    public reset(): void {
        this._clearFoods();
        this._spawnTimer = FOOD_SPAWN_INTERVAL;
        this._shakeDuration = 0;
        this._world.position.set(0, 0);
        this._character.position.set(DESIGN_WIDTH / 2, CHARACTER_Y);
        this._character.setPaused(false);
        this._background.update(this._character.x);

        const { hp, points } = gameStore.getState();
        this._hpText.text = this._hpLabel(hp);
        this._pointsText.text = this._pointsLabel(points);
    }

    /**
     * Advance character, food, parallax, shake, and HUD.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._character.update(delta);
        this._background.update(this._character.x);
        this._updateFoods(delta);
        this._updateShake(delta);
    }

    /**
     * Spawn, fall, catch, and miss food.
     * @param delta ticker delta time
     */
    private _updateFoods(delta: number): void {
        this._spawnTimer += delta;
        if (this._spawnTimer >= FOOD_SPAWN_INTERVAL) {
            this._spawnTimer = 0;
            this._spawnFood();
        }

        for (let i = this._foods.length - 1; i >= 0; i--) {
            const food = this._foods[i];
            food.update(delta);

            if (
                this._character.isCatching &&
                !food.isHit &&
                !food.isMissed &&
                this._overlapsCatch(food)
            ) {
                food.hit();
                gameStore.getState().addPoints(POINTS_PER_FOOD);
                this._shake();
            }

            if (!food.isHit && !food.isMissed && food.y > DESIGN_HEIGHT - FOOD_BOTTOM_PADDING) {
                food.miss();
                gameStore.getState().loseHp();
            }

            if (food.isDone) {
                this._world.removeChild(food);
                food.destroy({ children: true });
                this._foods.splice(i, 1);
            }
        }
    }

    /**
     * Spawn a new food item at a random x.
     */
    private _spawnFood(): void {
        const food = new Food(this._foodTexture);
        const x = Math.round(FOOD_MARGIN + Math.random() * (DESIGN_WIDTH - FOOD_MARGIN * 2));
        food.position.set(x, -20);
        this._foods.push(food);
        this._world.addChild(food);
    }

    /**
     * Remove every food still on the world.
     */
    private _clearFoods(): void {
        for (const food of this._foods) {
            this._world.removeChild(food);
            food.destroy({ children: true });
        }
        this._foods.length = 0;
    }

    /**
     * Shake the playfield. This is camera shake simulation.
     */
    private _shake(): void {
        this._shakeElapsed = 0;
        this._shakeDuration = SHAKE_DURATION;
    }

    /**
     * Update the shake animation.
     * @param delta ticker delta time
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
     * @param food the food
     */
    private _overlapsCatch(food: Food): boolean {
        const dx = this._character.x - food.x;
        const dy = this._character.y - food.y;
        return dx * dx + dy * dy <= CATCH_RADIUS * CATCH_RADIUS;
    }

    private _hpLabel(hp: number): string {
        return `HP: ${hp}`;
    }

    private _pointsLabel(points: number): string {
        return `Score: ${points}`;
    }

    private _hudText(content: string, fontFamily: string): Text {
        const label = new Text(
            content,
            new TextStyle({
                fontFamily,
                fontSize: 28,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                padding: 8,
            }),
        );
        label.roundPixels = true;
        label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        return label;
    }
}
