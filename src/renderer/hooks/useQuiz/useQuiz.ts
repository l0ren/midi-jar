import { useEffect, useReducer } from 'react';

import { Chord as TChord } from '@tonaljs/chord';

import { defaults } from 'main/store/defaults';

import { ChordQuizSettings, NotationSettings } from 'main/types';
import { getGameState, GameState, Parameters, Game, STATUSES, generateGame } from './utils';

enum QuizActionType {
  CHORD_PLAYED = 'CHORD_PLAYED',
  CHORD_RELEASE = 'CHORD_RELEASE',
}

interface QuizAction {
  type: QuizActionType;
  chords: (TChord | null)[];
  pitchClasses: string[];
}

enum ParametersActionTypes {
  PARAMETERS_CHANGED = 'PARAMETERS_CHANGED',
}

interface ParametersAction {
  type: ParametersActionTypes;
  value: unknown;
}

type Action = QuizAction | ParametersAction;

interface State {
  parameters: Parameters;
  games: Game[];
  gameState: GameState;
}

function reducer(state: State, action: Action): State {
  const { type } = action;

  switch (type) {
    case ParametersActionTypes.PARAMETERS_CHANGED: {
      const parameters = action.value as Parameters;

      const game = generateGame(parameters);

      if (!game) return state;

      return {
        ...state,
        parameters,
        games: [game],
        gameState: {
          gameIndex: 0,
          index: 0,
          status: STATUSES.none,
          chord: null,
          score: 0,
          gameStartTimeSeconds: -1,
          elapsedTimeSeconds: -1,
        },
      };
    }
    case QuizActionType.CHORD_PLAYED: {
      const { chords, pitchClasses } = action;

      const gameState = chords.reduce<GameState>((best, chord) => {
        const c = getGameState(
          state.gameState.gameIndex,
          state.gameState.index,
          state.games[state.gameState.gameIndex].chords[state.gameState.index],
          chord,
          pitchClasses,
          state.gameState.elapsedTimeSeconds,
          state.gameState.gameStartTimeSeconds
        );

        // If we haven't initialized the game start time, do it now (need to figure out where the construtors for this are)
        if (state.gameState.gameStartTimeSeconds <= 0) {
          state.gameState.gameStartTimeSeconds = Date.now() / 1000.0;
        }

        if (
          !best.chord ||
          best.status < c.status ||
          (best.status === c.status && best.score <= c.score)
        ) {
          return c;
        }

        return best;
      }, state.gameState);

      return {
        ...state,
        gameState,
      };
    }
    case QuizActionType.CHORD_RELEASE: {
      const gameStateStatus = state.gameState.status;

      if (gameStateStatus > -1) {
        const games = [...state.games];
        const currentGame = games[state.gameState.gameIndex];

        if (gameStateStatus > 1) {
          currentGame.succeeded += 1;
        }
        currentGame.score += state.gameState.score;
        currentGame.played.push(state.gameState.chord);

        // If we haven't initialized the game start time, do it now (need to figure out where the construtors for this are)
        if (state.gameState.gameStartTimeSeconds <= 0) {
          state.gameState.gameStartTimeSeconds = Date.now() / 1000.0;
        }


        // Show the user the average time it took to play each chord; give them something to improve.
        state.gameState.elapsedTimeSeconds =
          (Date.now() / 1000.0) - state.gameState.gameStartTimeSeconds;
        currentGame.timePerChordSeconds = ('Elapsed ' + state.gameState.elapsedTimeSeconds + ' start ' + state.gameState.gameStartTimeSeconds + ' avg ' + state.gameState.elapsedTimeSeconds / state.gameState.index);

        if (state.gameState.index + 2 >= currentGame.chords.length) {
          // Have reached the desired number of chords in the game. Start a new game.
          // TODO: calculate stats for this game, for display
          const game = generateGame(state.parameters);

          if (game) {
            games.push(game);
            state.gameState.gameStartTimeSeconds = -2;
          }
        }

        return {
          ...state,
          games,
          gameState: {
            gameIndex:
              state.gameState.index + 1 === currentGame.chords.length
                ? state.gameState.gameIndex + 1
                : state.gameState.gameIndex,
            index:
              state.gameState.index + 1 === currentGame.chords.length
                ? 0
                : state.gameState.index + 1,
            status: STATUSES.none,
            chord: null,
            score: 0,
            gameStartTimeSeconds: state.gameState.gameStartTimeSeconds,
            elapsedTimeSeconds: state.gameState.elapsedTimeSeconds,
          },
        };
      }

      return {
        ...state,
        gameState: {
          gameIndex: state.gameState.gameIndex,
          index: state.gameState.index,
          status: STATUSES.none,
          chord: null,
          score: 0,
          gameStartTimeSeconds: state.gameState.gameStartTimeSeconds,
          elapsedTimeSeconds: state.gameState.elapsedTimeSeconds,
        },
      };
    }

    default:
      return state;
  }
}

const defaultState: State = {
  parameters: {
    ...defaults.settings.chordQuiz,
    key: defaults.settings.notation.key,
    accidentals: defaults.settings.notation.accidentals,
  },
  games: [],
  gameState: {
    gameIndex: 0,
    index: 0,
    status: STATUSES.none,
    chord: null,
    score: 0,
    gameStartTimeSeconds: 0,
    elapsedTimeSeconds: 0,
  },
};

export default function useQuiz(
  pitchClasses: string[],
  chords: (TChord | null)[],
  settings: ChordQuizSettings,
  notationSettings: NotationSettings
) {
  const [state, dispatch] = useReducer(reducer, {
    ...defaultState,
    parameters: {
      ...settings,
      key: notationSettings.key,
      accidentals: notationSettings.accidentals,
    },
  });

  useEffect(() => {
    dispatch({
      type: ParametersActionTypes.PARAMETERS_CHANGED,
      value: {
        ...settings,
        key: notationSettings.key,
        accidentals: notationSettings.accidentals,
      },
    });
  }, [settings, notationSettings]);

  useEffect(() => {
    if (pitchClasses.length === 0) {
      dispatch({
        type: QuizActionType.CHORD_RELEASE,
        chords,
        pitchClasses,
      });
    } else {
      dispatch({ type: QuizActionType.CHORD_PLAYED, chords, pitchClasses });
    }
  }, [pitchClasses, chords]);

  return state;
}
