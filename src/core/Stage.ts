import { App } from "./App";
import { Loader } from "./Loader";
import { MainMenu } from "../containers/MainMenu";
import { Help } from "../containers/Help";
import { Credits } from "../containers/Credits";
import { Countdown } from "../containers/Countdown";
import { Game } from "../containers/Game";
import { Pause } from "../containers/Pause";
import { Score } from "../containers/Score";
import { gameStore, type GamePhase } from "../store/gameStore";

/**
 * Owns the screen views and switches them from the game phase.
 */
export class Stage {
    private readonly _app: App;
    private readonly _mainMenu: MainMenu;
    private readonly _help: Help;
    private readonly _credits: Credits;
    private readonly _countdown: Countdown;
    private readonly _game: Game;
    private readonly _pause: Pause;
    private readonly _score: Score;

    constructor(app: App, loader: Loader) {
        this._app = app;
        this._mainMenu = new MainMenu(loader);
        this._help = new Help(loader);
        this._credits = new Credits(loader);
        this._countdown = new Countdown(loader);
        this._game = new Game(loader);
        this._pause = new Pause(loader);
        this._score = new Score(loader);

        this._init();
    }

    /**
     * Mount views, bind flow keys, and start the ticker.
     */
    private _init(): void {
        this._app.start();

        // Pause sits above Game so it can overlay the playfield.
        this._app.stage.addChild(
            this._mainMenu,
            this._help,
            this._credits,
            this._countdown,
            this._game,
            this._pause,
            this._score,
        );

        this._applyPhase(gameStore.getState().phase);
        this._watchPhase();
        this._bindFlowKeys();

        this._app.ticker.add((delta) => {
            const { phase } = gameStore.getState();

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
     * Menu / pause / restart keys. Catch and movement stay on the character.
     */
    private _bindFlowKeys(): void {
        window.addEventListener("keydown", (event) => {
            if (event.repeat) {
                return;
            }

            const { phase, start, pause, resume, quit } = gameStore.getState();

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
                return;
            }

            if (event.code === "Space" || event.code === "Enter") {
                if (phase === "main_menu" || phase === "score") {
                    event.preventDefault();
                    start();
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

            this._applyPhase(state.phase);
        });
    }

    /**
     * Toggle view visibility and reset screens that need a fresh round.
     * @param phase current game phase
     */
    private _applyPhase(phase: GamePhase): void {
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
        }

        if (phase === "main_menu") {
            this._game.reset();
        }

        if (phase === "score") {
            this._score.refresh();
        }
    }
}
