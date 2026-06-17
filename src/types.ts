// 角色类型
export type CharacterType = 'yier' | 'bibu';

// 等级 1-7
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// 角色数据
export interface Character {
  id: string;
  type: CharacterType;
  level: Level;
}

// 角色配置
export interface CharacterConfig {
  type: CharacterType;
  level: Level;
  name: string;
  image: string;
  size: number; // 视觉大小
  radius: number; // 物理碰撞半径
  score: number;
}

// 一二角色配置
export const YIER_CONFIGS: Record<Level, CharacterConfig> = {
  1: { type: 'yier', level: 1, name: '迷你一二', image: '/images/1.png', size: 50, radius: 20, score: 10 },
  2: { type: 'yier', level: 2, name: '小号一二', image: '/images/2.png', size: 65, radius: 26, score: 20 },
  3: { type: 'yier', level: 3, name: '中号一二', image: '/images/3.png', size: 80, radius: 32, score: 40 },
  4: { type: 'yier', level: 4, name: '大号一二', image: '/images/4.png', size: 100, radius: 40, score: 80 },
  5: { type: 'yier', level: 5, name: '超大一一二', image: '/images/5.png', size: 125, radius: 50, score: 160 },
  6: { type: 'yier', level: 6, name: '巨无霸一二', image: '/images/6.png', size: 150, radius: 60, score: 320 },
  7: { type: 'yier', level: 7, name: '终极一二', image: '/images/7.png', size: 175, radius: 70, score: 640 },
};

// 布布角色配置
export const BIBU_CONFIGS: Record<Level, CharacterConfig> = {
  1: { type: 'bibu', level: 1, name: '迷你布布', image: '/images/b1.png', size: 50, radius: 20, score: 10 },
  2: { type: 'bibu', level: 2, name: '小号布布', image: '/images/b2.png', size: 65, radius: 26, score: 20 },
  3: { type: 'bibu', level: 3, name: '中号布布', image: '/images/b3.png', size: 80, radius: 32, score: 40 },
  4: { type: 'bibu', level: 4, name: '大号布布', image: '/images/b4.png', size: 100, radius: 40, score: 80 },
  5: { type: 'bibu', level: 5, name: '超大布布', image: '/images/b5.png', size: 125, radius: 50, score: 160 },
  6: { type: 'bibu', level: 6, name: '巨无霸布布', image: '/images/b6.png', size: 150, radius: 60, score: 320 },
  7: { type: 'bibu', level: 7, name: '终极布布', image: '/images/b7.png', size: 175, radius: 70, score: 640 },
};

// 获取角色配置
export function getConfig(type: CharacterType, level: Level): CharacterConfig {
  return type === 'yier' ? YIER_CONFIGS[level] : BIBU_CONFIGS[level];
}

// 生成唯一ID
let idCounter = 0;
export function generateId(): string {
  return `char-${++idCounter}-${Date.now()}`;
}

// 游戏常量
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
export const WALL_THICKNESS = 40;
export const RED_LINE_Y = 120;

// 胜利等级：一二和布布都达到此等级后碰撞即胜利
export const WIN_LEVEL: Level = 7;

// 物理参数
export const PHYSICS = {
  gravity: 1.5,
  restitution: 0.3, // 弹性
  friction: 0.3,    // 摩擦力
  frictionAir: 0.005,
  density: 0.001,
};
