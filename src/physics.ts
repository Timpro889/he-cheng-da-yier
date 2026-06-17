import Matter from 'matter-js';
import { CharacterType, Level, getConfig, GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS, PHYSICS } from './types';
import { PhysicsCharacter, useGameStore } from './store';

const { Engine, Composite, Bodies, Events, Body } = Matter;

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodyToCharacter: Map<number, string> = new Map();
  private characterBodies: Map<string, Matter.Body> = new Map();
  // Store the radius for each character body for reliable red line checks
  private characterRadii: Map<string, number> = new Map();
  private onMergeCallback: ((char1: PhysicsCharacter, char2: PhysicsCharacter) => void) | null = null;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;

  constructor(width: number, height: number) {
    this.engine = Engine.create({
      gravity: { x: 0, y: PHYSICS.gravity },
    });
    this.world = this.engine.world;
    this.createBoundaries(width, height);
    this.setupCollisionEvents();
  }

  private createBoundaries(width: number, height: number) {
    const wallOptions = {
      isStatic: true,
      render: { visible: false },
      friction: PHYSICS.friction,
      restitution: 0,
    };

    // Left wall
    Composite.add(this.world, Bodies.rectangle(
      -WALL_THICKNESS / 2, height / 2,
      WALL_THICKNESS, height * 2,
      wallOptions
    ));

    // Right wall
    Composite.add(this.world, Bodies.rectangle(
      width + WALL_THICKNESS / 2, height / 2,
      WALL_THICKNESS, height * 2,
      wallOptions
    ));

    // Ground
    Composite.add(this.world, Bodies.rectangle(
      width / 2, height + WALL_THICKNESS / 2,
      width + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      wallOptions
    ));
  }

  private setupCollisionEvents() {
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Skip static bodies (walls)
        if (bodyA.isStatic || bodyB.isStatic) continue;

        const charA = this.getCharacterByBodyId(bodyA.id);
        const charB = this.getCharacterByBodyId(bodyB.id);

        if (!charA || !charB) continue;
        if (charA.id === charB.id) continue;

        // Notify all collisions (let GameBoard handle merge logic)
        if (this.onMergeCallback) {
          this.onMergeCallback(charA, charB);
        }
      }
    });
  }

  private getCharacterByBodyId(bodyId: number): PhysicsCharacter | null {
    const charId = this.bodyToCharacter.get(bodyId);
    if (!charId) return null;

    const store = useGameStore.getState();
    return store.characters.find(c => c.id === charId) || null;
  }

  addCharacter(type: CharacterType, level: Level, x: number, y: number): { char: PhysicsCharacter; body: Matter.Body } {
    const config = getConfig(type, level);

    const body = Bodies.circle(x, y, config.radius, {
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionAir: PHYSICS.frictionAir,
      density: PHYSICS.density,
      label: `${type}-${level}`,
    });

    Composite.add(this.world, body);

    const store = useGameStore.getState();
    const newChar = store.addCharacter(type, level, x, y);

    // Update bodyId
    body.label = newChar.id;

    this.characterBodies.set(newChar.id, body);
    this.bodyToCharacter.set(body.id, newChar.id);
    this.characterRadii.set(newChar.id, config.radius);

    return { char: newChar, body };
  }

  removeCharacter(id: string) {
    const body = this.characterBodies.get(id);
    if (body) {
      Composite.remove(this.world, body);
      this.bodyToCharacter.delete(body.id);
      this.characterBodies.delete(id);
      this.characterRadii.delete(id);
      useGameStore.getState().removeCharacter(id);
    }
  }

  removeCharacters(ids: string[]) {
    ids.forEach(id => this.removeCharacter(id));
  }

  updatePositions() {
    const updates: { id: string; x: number; y: number; angle: number }[] = [];

    for (const [id, body] of this.characterBodies.entries()) {
      updates.push({
        id,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
      });
    }

    if (updates.length > 0) {
      useGameStore.getState().batchUpdatePositions(updates);
    }
  }

  /**
   * Returns true if any character's TOP edge has crossed above (past) the red line.
   * In this coordinate system y increases downward, so "above the line" means
   * y - radius < redLineY (the character's top is higher up than the line).
   */
  checkRedLine(redLineY: number): boolean {
    for (const [id, body] of this.characterBodies.entries()) {
      const radius = this.characterRadii.get(id) ?? 0;
      if (radius > 0 && body.position.y - radius < redLineY) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns IDs of characters whose top edge is above the red line.
   * Uses the stored radius for reliable detection.
   */
  getCharactersAboveRedLine(redLineY: number): string[] {
    const result: string[] = [];
    for (const [id, body] of this.characterBodies.entries()) {
      const radius = this.characterRadii.get(id);
      if (radius !== undefined && body.position.y - radius < redLineY) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Returns the Y coordinate of the highest (smallest y) character top edge.
   * This represents how high the character stack has reached.
   */
  getStackTopY(): number {
    let minTopY = Infinity;
    for (const [id, body] of this.characterBodies.entries()) {
      const radius = this.characterRadii.get(id);
      if (radius !== undefined) {
        const topY = body.position.y - radius;
        if (topY < minTopY) {
          minTopY = topY;
        }
      }
    }
    return minTopY;
  }

  getBody(id: string): Matter.Body | undefined {
    return this.characterBodies.get(id);
  }

  getBodyPosition(id: string): { x: number; y: number } | null {
    const body = this.characterBodies.get(id);
    if (!body) return null;
    return { x: body.position.x, y: body.position.y };
  }

  setVelocity(id: string, velocity: { x: number; y: number }) {
    const body = this.characterBodies.get(id);
    if (body) {
      Body.setVelocity(body, velocity);
    }
  }

  setOnMerge(callback: (char1: PhysicsCharacter, char2: PhysicsCharacter) => void) {
    this.onMergeCallback = callback;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const step = () => {
      if (!this.isRunning) return;
      Engine.update(this.engine, 1000 / 60);
      this.updatePositions();
      this.animationFrameId = requestAnimationFrame(step);
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  destroy() {
    this.stop();
    Composite.clear(this.world, false);
    Engine.clear(this.engine);
    this.characterBodies.clear();
    this.bodyToCharacter.clear();
    this.characterRadii.clear();
  }
}
