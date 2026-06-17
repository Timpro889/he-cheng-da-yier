import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Matter from 'matter-js';
import { CharacterType, Level, getConfig, GAME_WIDTH, GAME_HEIGHT, RED_LINE_Y, WIN_LEVEL } from './types';
import { PhysicsCharacter, useGameStore } from './store';
import { PhysicsEngine } from './physics';

const { Body } = Matter;

// Character sprite component
const CharacterSprite: React.FC<{ character: PhysicsCharacter }> = ({ character }) => {
  const config = getConfig(character.type, character.level);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: character.x,
        top: character.y,
        width: config.size,
        height: config.size,
        marginLeft: -config.size / 2,
        marginTop: -config.size / 2,
        transform: `rotate(${character.angle}rad)`,
      }}
    >
      <img
        src={config.image}
        alt={config.name}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
};

// Drop preview component
const DropPreview: React.FC<{ type: CharacterType; level: Level; x: number }> = ({ type, level, x }) => {
  const config = getConfig(type, level);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: RED_LINE_Y + 20,
        width: config.size,
        height: config.size,
        marginLeft: -config.size / 2,
        marginTop: -config.size / 2,
      }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      <img
        src={config.image}
        alt={config.name}
        style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8 }}
        draggable={false}
      />
      <div
        className="absolute left-1/2 top-full w-0.5 bg-white/50"
        style={{ height: GAME_HEIGHT - RED_LINE_Y - config.size, transform: 'translateX(-50%)' }}
      />
    </motion.div>
  );
};

// Merge effect particle
const MergeEffect: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.5, 2], opacity: [1, 0.8, 0] }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="text-4xl">✨</div>
    </motion.div>
  );
};

// Win animation
const WinAnimation: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const score = useGameStore(s => s.score);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
      >
        <img src="/images/hug.png" alt="合体" className="w-40 h-40 object-contain" />
      </motion.div>
      <div className="text-3xl font-bold text-white mt-4">🎉 合成成功！🎉</div>
      <div className="text-lg text-pink-300 mt-2">一二和布布在一起了！</div>
      <div className="text-xl text-yellow-300 mt-4">最终分数: {score}</div>
      <button
        onClick={onReset}
        className="mt-6 px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl text-white font-bold transition-colors"
      >
        再来一局
      </button>
    </motion.div>
  );
};

// Game over screen
const GameOverScreen: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const score = useGameStore(s => s.score);
  const highScore = useGameStore(s => s.highScore);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-6xl mb-4">🥺</div>
      <div className="text-2xl font-bold text-white mb-2">游戏结束</div>
      <div className="text-sm text-white/80 mb-4">一二委屈了，布布快来安慰</div>
      <div className="text-lg text-yellow-300 mb-2">分数: {score}</div>
      <div className="text-md text-gray-400 mb-6">最高纪录: {highScore}</div>
      <button
        onClick={onReset}
        className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl text-white font-bold transition-colors"
      >
        再来一局
      </button>
    </motion.div>
  );
};

// Main Game Board
const GameBoard: React.FC = () => {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const isInitializedRef = useRef(false);
  const [mergeEffects, setMergeEffects] = React.useState<{ id: string; x: number; y: number }[]>([]);

  // Store selectors
  const characters = useGameStore(s => s.characters);
  const score = useGameStore(s => s.score);
  const highScore = useGameStore(s => s.highScore);
  const nextCharacter = useGameStore(s => s.nextCharacter);
  const gameOver = useGameStore(s => s.gameOver);
  const gameWon = useGameStore(s => s.gameWon);
  const isDropping = useGameStore(s => s.isDropping);
  const dropX = useGameStore(s => s.dropX);

  // Actions
  const setDropX = useGameStore(s => s.setDropX);
  const setIsDropping = useGameStore(s => s.setIsDropping);
  const setNextCharacter = useGameStore(s => s.setNextCharacter);
  const resetGame = useGameStore(s => s.resetGame);
  const setGameOver = useGameStore(s => s.setGameOver);
  const setGameWon = useGameStore(s => s.setGameWon);

  const nextConfig = getConfig(nextCharacter.type, nextCharacter.level);

  // Add a merge effect and auto-remove after animation
  const addMergeEffect = useCallback((x: number, y: number) => {
    const effectId = `effect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMergeEffects(prev => [...prev, { id: effectId, x, y }]);
    setTimeout(() => {
      setMergeEffects(prev => prev.filter(e => e.id !== effectId));
    }, 600);
  }, []);

  // Handle merge logic — extracted as a single source of truth
  const handleMerge = useCallback((engine: PhysicsEngine, char1: PhysicsCharacter, char2: PhysicsCharacter) => {
    const store = useGameStore.getState();

    // Check if characters still exist in store
    const c1 = store.characters.find(c => c.id === char1.id);
    const c2 = store.characters.find(c => c.id === char2.id);
    if (!c1 || !c2) return;

    // Get positions from physics engine
    const pos1 = engine.getBodyPosition(c1.id);
    const pos2 = engine.getBodyPosition(c2.id);
    if (!pos1 || !pos2) return;

    const mergeX = (pos1.x + pos2.x) / 2;
    const mergeY = (pos1.y + pos2.y) / 2;

    // Case 1: WIN_LEVEL 一二 + WIN_LEVEL 布布 = 胜利
    if (c1.level === WIN_LEVEL && c2.level === WIN_LEVEL &&
        ((c1.type === 'yier' && c2.type === 'bibu') || (c1.type === 'bibu' && c2.type === 'yier'))) {
      engine.removeCharacters([c1.id, c2.id]);
      addMergeEffect(mergeX, mergeY);
      setTimeout(() => setGameWon(), 300);
      return;
    }

    // Case 2: Same type + same level = merge upgrade
    if (c1.type === c2.type && c1.level === c2.level && c1.level < WIN_LEVEL) {
      const newLevel = (c1.level + 1) as Level;
      const config = getConfig(c1.type, newLevel);

      engine.removeCharacters([c1.id, c2.id]);
      engine.addCharacter(c1.type, newLevel, mergeX, mergeY);

      // Update score
      const currentState = useGameStore.getState();
      const newScore = currentState.score + config.score;
      const newHighScore = Math.max(newScore, currentState.highScore);
      localStorage.setItem('yibugame-highScore', newHighScore.toString());

      useGameStore.setState({
        score: newScore,
        highScore: newHighScore,
      });

      addMergeEffect(mergeX, mergeY);
      return;
    }

    // Other cases: no action (different types, different levels, or max level same type)
  }, [addMergeEffect, setGameWon]);

  // Initialize physics engine
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const engine = new PhysicsEngine(GAME_WIDTH, GAME_HEIGHT);
    physicsRef.current = engine;

    engine.setOnMerge((char1, char2) => {
      if (physicsRef.current) {
        handleMerge(physicsRef.current, char1, char2);
      }
    });

    engine.start();

    return () => {
      engine.destroy();
      physicsRef.current = null;
      isInitializedRef.current = false;
    };
  }, [handleMerge]);

  // Check game over — when the character stack reaches the red line
  useEffect(() => {
    if (!physicsRef.current || gameOver || gameWon) return;

    const ABOVE_THRESHOLD = 500; // ms the stack must stay at/below red line to trigger game over

    let aboveSince: number | null = null;

    const checkInterval = setInterval(() => {
      if (!physicsRef.current || gameOver || gameWon) return;

      const stackTopY = physicsRef.current.getStackTopY();
      if (stackTopY === Infinity) return; // no characters yet

      // stackTopY is the top edge of the highest character.
      // If stackTopY <= RED_LINE_Y, the stack has reached/passed the red line.
      if (stackTopY <= RED_LINE_Y) {
        const now = Date.now();
        if (aboveSince === null) {
          aboveSince = now;
        }
        if (now - aboveSince >= ABOVE_THRESHOLD) {
          setGameOver();
          return;
        }
      } else {
        // Stack dropped back below the line, reset the timer
        aboveSince = null;
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, [gameOver, gameWon, setGameOver]);

  // Mouse/touch move handler
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDropping || gameOver || gameWon) return;

      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = GAME_WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      const clampedX = Math.max(nextConfig.radius, Math.min(GAME_WIDTH - nextConfig.radius, x));
      setDropX(clampedX);
    },
    [isDropping, gameOver, gameWon, nextConfig.radius, setDropX]
  );

  // Click/tap to drop
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDropping || gameOver || gameWon) return;

      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = GAME_WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      const clampedX = Math.max(nextConfig.radius, Math.min(GAME_WIDTH - nextConfig.radius, x));

      setIsDropping(true);

      if (physicsRef.current) {
        const { char } = physicsRef.current.addCharacter(
          nextCharacter.type,
          nextCharacter.level,
          clampedX,
          RED_LINE_Y + 30
        );
      }

      setTimeout(() => {
        setIsDropping(false);
        setNextCharacter();
      }, 300);
    },
    [isDropping, gameOver, gameWon, nextConfig.radius, nextCharacter, setIsDropping, setNextCharacter]
  );

  // Reset game
  const handleReset = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.destroy();
      physicsRef.current = null;
    }
    isInitializedRef.current = false;
    setMergeEffects([]);
    resetGame();

    // Reinitialize after a short delay
    setTimeout(() => {
      const engine = new PhysicsEngine(GAME_WIDTH, GAME_HEIGHT);
      physicsRef.current = engine;

      engine.setOnMerge((char1, char2) => {
        if (physicsRef.current) {
          handleMerge(physicsRef.current, char1, char2);
        }
      });

      engine.start();
      isInitializedRef.current = true;
    }, 100);
  }, [resetGame, handleMerge]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-blue-50 to-pink-50">
      {/* Header */}
      <div className="w-full flex justify-between items-center p-3 bg-white/80 backdrop-blur-sm shadow-sm shrink-0">
        <div className="text-center">
          <div className="text-xs text-gray-500">当前分数</div>
          <div className="text-xl font-bold text-pink-600">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">最高纪录</div>
          <div className="text-xl font-bold text-blue-600">{highScore}</div>
        </div>
      </div>

      {/* Game Area - 自适应高度 */}
      <div className="flex-1 w-full p-2 flex items-center justify-center min-h-0">
        <div
          ref={gameAreaRef}
          className="relative overflow-hidden cursor-crosshair"
          style={{
            width: '100%',
            maxWidth: GAME_WIDTH,
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            background: 'linear-gradient(to bottom, #f0f8ff, #fff0f5)',
            borderRadius: 16,
            border: '2px solid #e0e0e0',
          }}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
        >
          {/* Red line */}
          <div className="absolute w-full border-t-2 border-red-400 border-dashed" style={{ top: RED_LINE_Y }} />
          <div className="absolute text-xs text-red-400" style={{ top: RED_LINE_Y - 18, left: 8 }}>
            警戒线
          </div>

          {/* Characters */}
          {characters.map(char => (
            <CharacterSprite key={char.id} character={char} />
          ))}

          {/* Drop preview */}
          {!isDropping && !gameOver && !gameWon && (
            <DropPreview type={nextCharacter.type} level={nextCharacter.level} x={dropX} />
          )}

          {/* Merge effects */}
          {mergeEffects.map(effect => (
            <MergeEffect key={effect.id} x={effect.x} y={effect.y} />
          ))}

          {/* Win screen */}
          <AnimatePresence>
            {gameWon && <WinAnimation onReset={handleReset} />}
          </AnimatePresence>

          {/* Game over screen */}
          <AnimatePresence>
            {gameOver && <GameOverScreen onReset={handleReset} />}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full p-3 bg-white/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">下一个:</div>
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src={nextConfig.image}
                alt={nextConfig.name}
                style={{ width: nextConfig.size * 0.6, height: nextConfig.size * 0.6, objectFit: 'contain' }}
                draggable={false}
              />
            </div>
            <div className="text-sm font-medium text-gray-700">{nextConfig.name}</div>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
          >
            重置
          </button>
        </div>

        <div className="mt-2 text-center text-xs text-gray-400">
          {isDropping ? '投放中...' : '移动选择位置，点击投放'}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
