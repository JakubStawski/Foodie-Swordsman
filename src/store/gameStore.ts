import { createStore } from "zustand/vanilla";

export type GamePhase =
    | "main_menu"
    | "help"
    | "credits"
    | "countdown"
    | "game"
    | "pause"
    | "score";

export const INITIAL_HP = 3;

export type GameState = {
    phase: GamePhase;
    hp: number;
    points: number;
};

type GameActions = {
    /** main_menu | score → countdown; resets hp and points. */
    start: () => void;
    /** countdown → game */
    play: () => void;
    /** game → pause */
    pause: () => void;
    /** pause → game */
    resume: () => void;
    /** game → score */
    gameOver: () => void;
    /** main_menu → help */
    openHelp: () => void;
    /** main_menu → credits */
    openCredits: () => void;
    /** pause | score | help | credits → main_menu; resets hp and points. */
    quit: () => void;
    addPoints: (amount?: number) => void;
    loseHp: () => void;
};

export type GameStore = GameState & GameActions;

const ALLOWED_TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
    main_menu: ["countdown", "help", "credits"],
    help: ["main_menu"],
    credits: ["main_menu"],
    countdown: ["game"],
    game: ["pause", "score"],
    pause: ["game", "main_menu"],
    score: ["main_menu", "countdown"],
};

/**
 * @returns The initial data for the game state.
 */
function initialData(): Pick<GameState, "hp" | "points"> {
    return { hp: INITIAL_HP, points: 0 };
}

/**
 * Checks if a transition between two game phases is allowed.
 * @param from - The current game phase.
 * @param to - The target game phase.
 * @returns True if the transition is allowed, false otherwise.
 */
export function canTransition(from: GamePhase, to: GamePhase): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
}

export const gameStore = createStore<GameStore>()((set, get) => {
    const goTo = (phase: GamePhase): boolean => {
        if (!canTransition(get().phase, phase)) {
            return false;
        }

        set({ phase });
        return true;
    };

    return {
        phase: "main_menu",
        ...initialData(),

        start: () => {
            const { phase } = get();
            if (phase !== "main_menu" && phase !== "score") {
                return;
            }

            set({ phase: "countdown", ...initialData() });
        },

        play: () => {
            goTo("game");
        },

        openHelp: () => {
            goTo("help");
        },

        openCredits: () => {
            goTo("credits");
        },

        pause: () => {
            goTo("pause");
        },

        resume: () => {
            goTo("game");
        },

        gameOver: () => {
            goTo("score");
        },

        quit: () => {
            if (!canTransition(get().phase, "main_menu")) {
                return;
            }

            set({ phase: "main_menu", ...initialData() });
        },

        addPoints: (amount = 1) => {
            if (get().phase !== "game") {
                return;
            }

            set((state) => ({ points: state.points + amount }));
        },

        loseHp: () => {
            if (get().phase !== "game") {
                return;
            }

            const hp = Math.max(0, get().hp - 1);
            set({
                hp,
                ...(hp === 0 ? { phase: "score" as const } : {}),
            });
        },
    };
});
