import { create } from 'zustand';
import { Character, CharacterType, Level, getConfig, generateId, GAME_WIDTH, WIN_LEVEL } from './types';

export interface PhysicsCharacter extends Character {
  bodyId: number;
  x: number;
  y: number;
  angle: number;
}

interface GameState {
  characters: PhysicsCharacter[];
  score: number;
  highScore: number;
  nextCharacter: { type: CharacterType; level: Level };
  gameOver: boolean;
  gameWon: boolean;
  isDropping: boolean;
  dropX: number;

  addCharacter: (type: CharacterType, level: Level, x: number, y: number) => PhysicsCharacter;
  removeCharacter: (id: string) => void;
  removeCharacters: (ids: string[]) => void;
  updateCharacterPosition: (id: string, x: number, y: number, angle: number) => void;
  batchUpdatePositions: (updates: { id: string; x: number; y: number; angle: number }[]) => void;
  setDropX: (x: number) => void;
  setIsDropping: (dropping: boolean) => void;
  setNextCharacter: () => void;
  resetGame: () => void;
  setGameOver: () => void;
  setGameWon: () => void;
}

function randomNextCharacter(): { type: CharacterType; level: Level } {
  const types: CharacterType[] = ['yier', 'bibu'];
  const type = types[Math.floor(Math.random() * types.length)];
  const level = (Math.floor(Math.random() * 2) + 1) as Level;
  return { type, level };
}

export const useGameStore = create<GameState>((set, get) => ({
  characters: [],
  score: 0,
  highScore: parseInt(localStorage.getItem('yibugame-highScore') || '0'),
  nextCharacter: randomNextCharacter(),
  gameOver: false,
  gameWon: false,
  isDropping: false,
  dropX: GAME_WIDTH / 2,

  addCharacter: (type, level, x, y) => {
    const newChar: PhysicsCharacter = {
      id: generateId(),
      type,
      level,
      bodyId: 0,
      x,
      y,
      angle: 0,
    };
    set(state => ({
      characters: [...state.characters, newChar],
    }));
    return newChar;
  },

  removeCharacter: (id) => {
    set(state => ({
      characters: state.characters.filter(c => c.id !== id),
    }));
  },

  removeCharacters: (ids) => {
    set(state => ({
      characters: state.characters.filter(c => !ids.includes(c.id)),
    }));
  },

  updateCharacterPosition: (id, x, y, angle) => {
    set(state => ({
      characters: state.characters.map(c =>
        c.id === id ? { ...c, x, y, angle } : c
      ),
    }));
  },

  batchUpdatePositions: (updates) => {
    // Build a Map for O(1) lookup instead of O(n) find per character
    const updateMap = new Map(updates.map(u => [u.id, u]));
    set(state => ({
      characters: state.characters.map(c => {
        const update = updateMap.get(c.id);
        if (update) {
          return { ...c, x: update.x, y: update.y, angle: update.angle };
        }
        return c;
      }),
    }));
  },

  setDropX: (x) => set({ dropX: x }),
  setIsDropping: (dropping) => set({ isDropping: dropping }),
  setNextCharacter: () => set({ nextCharacter: randomNextCharacter() }),

  resetGame: () => {
    set({
      characters: [],
      score: 0,
      gameOver: false,
      gameWon: false,
      isDropping: false,
      dropX: GAME_WIDTH / 2,
      nextCharacter: randomNextCharacter(),
    });
  },

  setGameOver: () => {
    const state = get();
    if (state.highScore < state.score) {
      localStorage.setItem('yierbibu-highScore', state.score.toString());
      set({ highScore: state.score });
    }
    set({ gameOver: true });
  },

  setGameWon: () => set({ gameWon: true }),
}));
