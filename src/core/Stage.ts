import { App, DESIGN_WIDTH } from "./App";
import { Loader } from "./Loader";
import { Background } from "../components/Background";
import { MusicButton } from "../components/MusicButton";
import { MainMenu } from "../containers/MainMenu";
import { Help } from "../containers/Help";
import { Credits } from "../containers/Credits";
import { Countdown, COUNTDOWN_MS } from "../containers/Countdown";
import { Game } from "../containers/Game";
import { Pause } from "../containers/Pause";
import { Score } from "../containers/Score";
import { gameStore, type GamePhase } from "../store/gameStore";
import { SOUND, soundController } from "./SoundController";

/**
 * Owns the screen views and switches them from the game phase.
 */
export class Stage {
    private readonly _app: App;
    private readonly _background: Background;
    private readonly _mainMenu: MainMenu;
    private readonly _help: Help;
    private readonly _credits: Credits;
    private readonly _countdown: Countdown;
    private readonly _game: Game;
    private readonly _pause: Pause;
    private readonly _score: Score;
    private readonly _musicButton: MusicButton;

    constructor(app: App, loader: Loader) {
        this._app = app;
        this._background = new Background([
            loader.getAsset("bg_01"),
            loader.getAsset("bg_02"),
            loader.getAsset("bg_03"),
            loader.getAsset("bg_04"),
        ]);
        this._mainMenu = new MainMenu(loader);
        this._help = new Help(loader);
        this._credits = new Credits(loader);
        this._countdown = new Countdown(loader);
        this._game = new Game(loader, this._background);
        this._pause = new Pause(loader);
        this._score = new Score(loader);
        this._musicButton = new MusicButton(loader.getAsset("music_button"));

        this._init();
    }

    /**
     * Mount views, bind flow keys, and start the ticker.
     */
    private _init(): void {
        this._app.start();

        // Shared scenery sits at the back; Game takes it into the playfield while playing.
        this._app.stage.addChild(
            this._background,
            this._mainMenu,
            this._help,
            this._credits,
            this._countdown,
            this._game,
            this._pause,
            this._score,
            this._musicButton,
        );

        this._applyPhase(gameStore.getState().phase);
        this._watchPhase();
        this._bindFlowKeys();

        this._app.ticker.add((delta) => {
            const { phase } = gameStore.getState();

            if (phase === "countdown") {
                this._background.updatePan();
            } else if (phase !== "game" && phase !== "pause") {
                this._background.updateIdle(delta);
            }

            if (phase === "main_menu") {
                this._mainMenu.update(delta);
                return;
            }

            if (phase === "help") {
                this._help.update(delta);
                return;
            }

            if (phase === "credits") {
                this._credits.update(delta);
                return;
            }

            if (phase === "countdown") {
                this._countdown.update(delta);
                return;
            }

            if (phase === "game") {
                this._game.update(delta);
                return;
            }

            if (phase === "pause") {
                this._pause.update(delta);
                return;
            }

            this._score.update(delta);
        });
    }

    /**
     * Escape for pause / back. 
     */
    private _bindFlowKeys(): void {
        window.addEventListener("keydown", (event) => {
            if (event.repeat) {
                return;
            }

            const { phase, pause, resume, quit } = gameStore.getState();

            if (event.code === "Space" || event.code === "Enter") {
                event.preventDefault();
                return;
            }

            if (event.code === "Escape") {
                event.preventDefault();
                if (phase === "game") {
                    pause();
                    return;
                }

                if (phase === "pause") {
                    resume();
                    return;
                }

                if (phase === "score" || phase === "help" || phase === "credits") {
                    quit();
                }
            }
        });
    }

    /**
     * Show the view that matches the current phase.
     */
    private _watchPhase(): void {
        gameStore.subscribe((state, prev) => {
            if (state.phase === prev.phase) {
                return;
            }

            if (state.phase === "pause") {
                soundController.pause(SOUND.BG);
            } else if (prev.phase === "pause") {
                soundController.resume(SOUND.BG);
            }

            if (state.phase === "score") {
                soundController.stop(SOUND.BG);
                soundController.stop(SOUND.LOSE_BG);
                soundController.play(SOUND.LOSE_BG);
            } else if (prev.phase === "score") {
                soundController.stop(SOUND.LOSE_BG);
                soundController.stop(SOUND.BG);
                soundController.play(SOUND.BG);
            }

            this._applyPhase(state.phase);
        });
    }

    /**
     * Toggle view visibility and reset screens that need a fresh round.
     * @param phase current game phase
     */
    private _applyPhase(phase: GamePhase): void {
        this._seatBackground(phase);
        this._mainMenu.visible = phase === "main_menu";
        this._help.visible = phase === "help";
        this._credits.visible = phase === "credits";
        this._countdown.visible = phase === "countdown";
        this._game.visible = phase === "game" || phase === "pause";
        this._pause.visible = phase === "pause";
        this._score.visible = phase === "score";

        if (phase === "countdown") {
            this._countdown.reset();
            this._game.reset();
            this._background.startPanTo(DESIGN_WIDTH / 2, COUNTDOWN_MS);
        }

        if (phase === "main_menu") {
            this._game.reset();
        }

        if (phase === "score") {
            this._score.refresh();
        }
    }

    /**
     * Keep one backdrop: on the stage for menus, inside the playfield during game / pause
     * so camera shake and the canopy mask stay locked to it.
     * @param phase current game phase
     */
    private _seatBackground(phase: GamePhase): void {
        if (phase === "game" || phase === "pause") {
            this._game.visible = true;
            this._game.mountBackground();
            return;
        }

        this._app.stage.addChildAt(this._background, 0);
    }
}
