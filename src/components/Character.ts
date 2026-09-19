import { AnimatedSprite, Container, Texture } from "pixi.js";
import { sliceFrames, type FrameRange, type SpriteSheetLayout } from "../utils/animations";

/** Sprite sheet layout for the character, change this if ever character spritesheet changes */
const SHEET_LAYOUT: SpriteSheetLayout = {
    cols: 8,
    frameWidth: 84,
    frameHeight: 84,
};
const WALK_SPEED = 2.5;
const ANIM_SPEED = 0.18;
const CATCH_ANIM_SPEED = 0.25;

/** Frame ranges on character_bitmap (left-to-right, top-to-bottom) */
const IDLE_RANGE: FrameRange = [0, 3];
const WALK_RIGHT_RANGE: FrameRange = [14, 19];
const WALK_LEFT_RANGE: FrameRange = [20, 25];
const CATCH_RANGE: FrameRange = [30, 31];

/** Available animations */
type AnimName = "idle" | "walkLeft" | "walkRight" | "catch";

/**
 * Player character with left/right walk animation.
 * Move with Arrow keys or A / D. Catch (attack) with Space or Enter.
 */
export class Character extends Container {
    private readonly _sprite: AnimatedSprite;
    private readonly _anims: Record<AnimName, Texture[]>;
    private readonly _keys = new Set<string>();
    private _currentAnim: AnimName = "idle";
    private _isCatching = false;
    private _speed = WALK_SPEED;

    constructor(sheet: Texture) {
        super();

        this._anims = {
            idle: sliceFrames(sheet, ...IDLE_RANGE, SHEET_LAYOUT),
            walkRight: sliceFrames(sheet, ...WALK_RIGHT_RANGE, SHEET_LAYOUT),
            walkLeft: sliceFrames(sheet, ...WALK_LEFT_RANGE, SHEET_LAYOUT),
            catch: sliceFrames(sheet, ...CATCH_RANGE, SHEET_LAYOUT),
        };

        this._sprite = new AnimatedSprite(this._anims.idle);
        this._sprite.anchor.set(0.5);
        this._sprite.roundPixels = true;
        this._sprite.animationSpeed = ANIM_SPEED;
        this._sprite.loop = true;
        this._sprite.play();
        this.addChild(this._sprite);

        this._bindKeys();
    }

    /**
     * Advance movement and animation based on held keys.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        if (this._isCatching) {
            return;
        }

        const left = this._keys.has("ArrowLeft") || this._keys.has("KeyA");
        const right = this._keys.has("ArrowRight") || this._keys.has("KeyD");

        if (left === right) {
            this._play("idle");
            return;
        }

        if (left) {
            this._play("walkLeft");
            this.x -= this._speed * delta;
        } else {
            this._play("walkRight");
            this.x += this._speed * delta;
        }
    }

    /**
     * Start the catch animation and reset to idle after completion
     */
    private _startCatch(): void {
        if (this._isCatching) {
            return;
        }

        this._isCatching = true;
        this._currentAnim = "catch";
        this._sprite.textures = this._anims.catch;
        this._sprite.loop = false;
        this._sprite.animationSpeed = CATCH_ANIM_SPEED;
        this._sprite.onComplete = () => {
            this._isCatching = false;
            this._sprite.loop = true;
            this._sprite.animationSpeed = ANIM_SPEED;
            this._sprite.onComplete = undefined;
            this._currentAnim = "idle";
            this._sprite.textures = this._anims.idle;
            this._sprite.gotoAndPlay(0);
        };
        this._sprite.gotoAndPlay(0);
    }

    /**
     * Play an animation
     */
    private _play(anim: AnimName): void {
        if (this._currentAnim === anim) {
            return;
        }

        this._currentAnim = anim;
        this._sprite.textures = this._anims[anim];
        this._sprite.loop = true;
        this._sprite.animationSpeed = ANIM_SPEED;
        this._sprite.gotoAndPlay(0);
    }

    /**
     * Bind keyboard events to the character actions
     */
    private _bindKeys(): void {
        window.addEventListener("keydown", (event) => {
            if (event.repeat) {
                return;
            }

            if (event.code === "Space" || event.code === "Enter") {
                event.preventDefault();
                this._startCatch();
                return;
            }

            if (
                event.code === "ArrowLeft" ||
                event.code === "ArrowRight" ||
                event.code === "KeyA" ||
                event.code === "KeyD"
            ) {
                event.preventDefault();
                this._keys.add(event.code);
            }
        });

        window.addEventListener("keyup", (event) => {
            this._keys.delete(event.code);
        });
    }

    /** Whether the catch (attack) animation is currently playing. */
    public get isCatching(): boolean {
        return this._isCatching;
    }
}
