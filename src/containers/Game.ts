import { Container, Graphics, SCALE_MODES, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Background, VEGETATION_LAYER } from "../components/Background";
import { Character } from "../components/Character";
import { Food } from "../components/Food";
import { Hearts } from "../components/Hearts";
import { PointsPopup } from "../components/PointsPopup";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import {
    canSpawnFood,
    difficultyFromElapsed,
    MAX_FOOD_SPREAD,
    rollFallSpeed,
    shouldDoubleSpawn,
    spawnInterval,
} from "../config/difficulty";
import { gameStore } from "../store/gameStore";
import { SOUND, soundController } from "../core/SoundController";

const CATCH_RADIUS = 65;
const FOOD_MARGIN = 24;
const FOOD_BOTTOM_PADDING = 48;
const SHAKE_DURATION = 12;
const SHAKE_MAGNITUDE = 4;
const HURT_SHAKE_DURATION = 18;
const HURT_SHAKE_MAGNITUDE = 8;
const HURT_FLASH_DURATION = 16;
const HURT_FLASH_ALPHA = 0.28;
const HURT_FLASH_COLOR = 0xcc1a1a;
const POINTS_PER_FOOD = 10;
const CHARACTER_Y = DESIGN_HEIGHT - 120;
const HUD_Y = 20;
const HUD_MARGIN = 20;

/**
 * Playfield: character, falling food, HP and score. Shares the stage scenery.
 */
export class Game extends Container {
    private readonly _world: Container;
    private readonly _background: Background;
    private readonly _foodLayer: Container;
    private readonly _foodMask: Sprite;
    private readonly _character: Character;
    private readonly _hearts: Hearts;
    private readonly _pointsText: Text;
    private readonly _flash: Graphics;
    private readonly _font: string;
    private readonly _foodTexture: Texture;
    private readonly _foods: Food[] = [];
    private readonly _popups: PointsPopup[] = [];

    private _spawnTimer = 0;
    private _elapsed = 0;
    private _shakeElapsed = 0;
    private _shakeDuration = 0;
    private _shakeMagnitude = SHAKE_MAGNITUDE;
    private _flashElapsed = 0;
    private _flashDuration = 0;

    constructor(loader: Loader, background: Background) {
        super();
        this.name = "Game";

        this._world = new Container();
        this._world.name = "World";
        this._background = background;
        this._character = new Character(loader.getAsset("character"));
        this._character.position.set(DESIGN_WIDTH / 2, CHARACTER_Y);
        this._foodTexture = loader.getAsset("food");

        this._foodLayer = new Container();
        this._foodLayer.name = "FoodLayer";
        // Pixi shows the layer where the mask is opaque. Food stays visible in
        // the open air and hides behind the canopy as the background parallaxes.
        this._foodMask = this._background.createTrackingSprite(
            loader.getAsset("bg_mask"),
            VEGETATION_LAYER,
        );
        this._foodMask.name = "FoodMask";
        this._foodMask.renderable = false;
        this._foodLayer.mask = this._foodMask;

        this._world.addChild(this._foodLayer, this._foodMask, this._character);

        const font = loader.getFont("pixelify_sans");
        this._font = font;
        this._hearts = new Hearts(loader.getAsset("heart"));
        this._hearts.position.set(HUD_MARGIN, HUD_Y);
        this._hearts.setHp(gameStore.getState().hp);

        this._pointsText = this._hudText(this._pointsLabel(gameStore.getState().points), font);
        this._pointsText.anchor.set(1, 0);
        this._pointsText.position.set(DESIGN_WIDTH - HUD_MARGIN, HUD_Y);

        this._flash = new Graphics();
        this._flash.beginFill(HURT_FLASH_COLOR);
        this._flash.drawRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this._flash.endFill();
        this._flash.alpha = 0;
        this._flash.eventMode = "none";

        this.addChild(this._world, this._hearts, this._pointsText, this._flash);

        gameStore.subscribe((state, prev) => {
            if (state.hp !== prev.hp) {
                this._hearts.setHp(state.hp);
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
        this._clearPopups();
        this._elapsed = 0;
        this._spawnTimer = spawnInterval(0);
        this._shakeDuration = 0;
        this._flashDuration = 0;
        this._flash.alpha = 0;
        this._world.position.set(0, 0);
        this._character.position.set(DESIGN_WIDTH / 2, CHARACTER_Y);
        this._character.setPaused(false);

        const { hp, points } = gameStore.getState();
        this._hearts.setHp(hp);
        this._pointsText.text = this._pointsLabel(points);
    }

    /**
     * Seat the shared scenery in the playfield so shake and the canopy mask stay aligned.
     */
    public mountBackground(): void {
        this._world.addChildAt(this._background, 0);
    }

    /**
     * Advance character, food, parallax, shake, and HUD.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._character.update(delta);
        this._background.update(this._character.x);
        this._updateFoods(delta);
        this._updatePopups(delta);
        this._updateShake(delta);
        this._updateFlash(delta);
    }

    /**
     * Spawn, fall, catch, and miss food.
     * @param delta ticker delta time
     */
    private _updateFoods(delta: number): void {
        this._elapsed += delta;
        const difficulty = difficultyFromElapsed(this._elapsed);

        this._spawnTimer += delta;
        if (this._spawnTimer >= spawnInterval(difficulty) && canSpawnFood(this._foods.length)) {
            this._spawnTimer = 0;
            const first = this._spawnFood(difficulty);
            if (first && shouldDoubleSpawn(difficulty, this._foods.length)) {
                this._spawnFood(difficulty);
            }
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
                soundController.play(SOUND.CATCH);
                this._spawnPopup(food.x, food.y);
                this._shake();
            }

            if (!food.isHit && !food.isMissed && food.y > DESIGN_HEIGHT - FOOD_BOTTOM_PADDING) {
                food.miss();
                gameStore.getState().loseHp();
                soundController.play(SOUND.MISS);
                this._hurt();
            }

            if (food.isDone) {
                this._foodLayer.removeChild(food);
                food.destroy({ children: true });
                this._foods.splice(i, 1);
            }
        }
    }

    /**
     * Spawn a new food item at a random x, with fall speed from the current difficulty.
     * @param difficulty 0–1 ramp value
     */
    private _spawnFood(difficulty: number): Food | null {
        if (!canSpawnFood(this._foods.length)) {
            return null;
        }

        const food = new Food(this._foodTexture, rollFallSpeed(difficulty));
        food.position.set(this._randomFoodX(), -20);
        this._foods.push(food);
        this._foodLayer.addChild(food);
        return food;
    }

    /**
     * Pick a spawn x. Alone it can be anywhere; with food still falling it stays in that cluster.
     */
    private _randomFoodX(): number {
        const min = FOOD_MARGIN;
        const max = DESIGN_WIDTH - FOOD_MARGIN;
        const xs = this._foods
            .filter((food) => !food.isHit && !food.isMissed)
            .map((food) => food.x);

        if (xs.length === 0) {
            return Math.round(min + Math.random() * (max - min));
        }

        const center = (Math.min(...xs) + Math.max(...xs)) / 2;
        const half = MAX_FOOD_SPREAD / 2;
        const bandMin = Math.max(min, center - half);
        const bandMax = Math.min(max, center + half);

        return Math.round(bandMin + Math.random() * (bandMax - bandMin));
    }

    /**
     * Remove every food still on the world.
     */
    private _clearFoods(): void {
        for (const food of this._foods) {
            this._foodLayer.removeChild(food);
            food.destroy({ children: true });
        }
        this._foods.length = 0;
    }

    /**
     * Pop "+N" beside a caught food. Lives on the world so the canopy mask does not clip it.
     * @param foodX food world x
     * @param foodY food world y
     */
    private _spawnPopup(foodX: number, foodY: number): void {
        const popup = new PointsPopup(POINTS_PER_FOOD, this._font);
        popup.placeAt(foodX, foodY);
        this._popups.push(popup);
        this._world.addChild(popup);
    }

    /**
     * Drift popups up and drop them when they fade out.
     * @param delta ticker delta time
     */
    private _updatePopups(delta: number): void {
        for (let i = this._popups.length - 1; i >= 0; i--) {
            const popup = this._popups[i];
            popup.update(delta);
            if (popup.isDone) {
                this._world.removeChild(popup);
                popup.destroy({ children: true });
                this._popups.splice(i, 1);
            }
        }
    }

    /**
     * Remove every points popup still on the world.
     */
    private _clearPopups(): void {
        for (const popup of this._popups) {
            this._world.removeChild(popup);
            popup.destroy({ children: true });
        }
        this._popups.length = 0;
    }

    /**
     * Shake the playfield. This is camera shake simulation.
     * @param duration how long the shake lasts, in ticker ticks
     * @param magnitude max offset in pixels
     */
    private _shake(duration = SHAKE_DURATION, magnitude = SHAKE_MAGNITUDE): void {
        this._shakeElapsed = 0;
        this._shakeDuration = duration;
        this._shakeMagnitude = magnitude;
    }

    /**
     * Hit feedback when a life is lost: stronger shake plus a brief red veil.
     */
    private _hurt(): void {
        this._shake(HURT_SHAKE_DURATION, HURT_SHAKE_MAGNITUDE);
        this._flashElapsed = 0;
        this._flashDuration = HURT_FLASH_DURATION;
        this._flash.alpha = HURT_FLASH_ALPHA;
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
        const mag = this._shakeMagnitude * t;
        this._world.x = Math.round((Math.random() * 2 - 1) * mag);
        this._world.y = Math.round((Math.random() * 2 - 1) * mag);
    }

    /**
     * Fade the hurt flash back to clear.
     * @param delta ticker delta time
     */
    private _updateFlash(delta: number): void {
        if (this._flashDuration <= 0) {
            this._flash.alpha = 0;
            return;
        }

        this._flashElapsed += delta;
        if (this._flashElapsed >= this._flashDuration) {
            this._flashDuration = 0;
            this._flash.alpha = 0;
            return;
        }

        const t = 1 - this._flashElapsed / this._flashDuration;
        this._flash.alpha = HURT_FLASH_ALPHA * t;
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
