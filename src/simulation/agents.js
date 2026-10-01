import { StorageBufferAttribute, StorageInstancedBufferAttribute } from 'three/webgpu';
import {
  Fn, uniform, float, vec2, ivec2, vec4, uint, int,
  instanceIndex, textureLoad,
  floor, fract, mix, length, normalize,
  atomicAdd, If, Loop, storage, cos, sin, smoothstep, clamp
} from 'three/tsl';

import config from '../config.js';
import { flowTex } from './flowField.js';

const MAX_AGENTS = config.MAX_AGENTS;
const MAX_CELLS = 15000;

// Agentes
export const positionBuffer = new StorageInstancedBufferAttribute(MAX_AGENTS, 2);
export const velocityBuffer = new StorageInstancedBufferAttribute(MAX_AGENTS, 2);

export const positionNode = storage(positionBuffer, 'vec2', MAX_AGENTS);
export const velocityNode = storage(velocityBuffer, 'vec2', MAX_AGENTS);

// Celdas para Flocking
const cellCountAttr = new StorageBufferAttribute(MAX_CELLS, 1, Uint32Array);
const cellPosXAttr  = new StorageBufferAttribute(MAX_CELLS, 1, Int32Array);
const cellPosYAttr  = new StorageBufferAttribute(MAX_CELLS, 1, Int32Array);
const cellVelXAttr  = new StorageBufferAttribute(MAX_CELLS, 1, Int32Array);
const cellVelYAttr  = new StorageBufferAttribute(MAX_CELLS, 1, Int32Array);

const cellCountNode = storage(cellCountAttr, 'uint', MAX_CELLS);
const cellPosXNode  = storage(cellPosXAttr, 'int', MAX_CELLS);
const cellPosYNode  = storage(cellPosYAttr, 'int', MAX_CELLS);
const cellVelXNode  = storage(cellVelXAttr, 'int', MAX_CELLS);
const cellVelYNode  = storage(cellVelYAttr, 'int', MAX_CELLS);

// Uniforms
export const uGridCellsX   = uniform(0);
export const uGridCellsY   = uniform(0);
export const uWorldWidth   = uniform(1.0);
export const uActiveAgents = uniform(config.AGENT_COUNT);
export const uDt           = uniform(config.MAX_DT);
export const uTime         = uniform(0.0);

const FIXED_SCALE = float(config.FIXED_POINT_SCALE);

// Utils
const hash11 = Fn(([p_immutable]) => {
  const p = float(p_immutable);
  const state = p.toUint().mul(747796405).add(2891336453);
  const word = state.shiftRight(state.shiftRight(28).add(4)).bitXor(state).mul(277803737);
  const result = word.shiftRight(22).bitXor(word);
  return result.toFloat().mul(1.0 / 4294967296.0);
});

const limitForce = Fn(([f_imm]) => {
  const f = vec2(f_imm);
  const l = length(f);
  const result = vec2(f).toVar();
  If(l.greaterThan(config.MAX_FORCE), () => {
    result.assign(f.normalize().mul(config.MAX_FORCE));
  });
  return result;
});

// 1. Limpiar celdas
export const clearCellsCompute = Fn(() => {
  const idx = instanceIndex;
  cellCountNode.element(idx).assign(0);
  cellPosXNode.element(idx).assign(0);
  cellPosYNode.element(idx).assign(0);
  cellVelXNode.element(idx).assign(0);
  cellVelYNode.element(idx).assign(0);
})().compute(MAX_CELLS);

// 2. Binning
export const binAgentsCompute = Fn(() => {
  const idx = instanceIndex;
  If(idx.greaterThanEqual(uActiveAgents), () => { return; });

  const pos = positionNode.element(idx);
  const vel = velocityNode.element(idx);

  const cellX = floor(pos.x.div(config.PERCEPTION_RADIUS)).toUint();
  const cellY = floor(pos.y.div(config.PERCEPTION_RADIUS)).toUint();
  
  const cx = cellX.mod(uGridCellsX.toUint());
  const cy = cellY.mod(uGridCellsY.toUint());

  const cellIdx = cy.mul(uGridCellsX.toUint()).add(cx);

  const cellOriginX = cx.toFloat().mul(config.PERCEPTION_RADIUS);
  const cellOriginY = cy.toFloat().mul(config.PERCEPTION_RADIUS);
  const relPos = pos.sub(vec2(cellOriginX, cellOriginY));

  const fpPosX = relPos.x.mul(FIXED_SCALE).toInt();
  const fpPosY = relPos.y.mul(FIXED_SCALE).toInt();
  const fpVelX = vel.x.mul(FIXED_SCALE).toInt();
  const fpVelY = vel.y.mul(FIXED_SCALE).toInt();

  atomicAdd(cellCountNode.element(cellIdx), 1);
  atomicAdd(cellPosXNode.element(cellIdx), fpPosX);
  atomicAdd(cellPosYNode.element(cellIdx), fpPosY);
  atomicAdd(cellVelXNode.element(cellIdx), fpVelX);
  atomicAdd(cellVelYNode.element(cellIdx), fpVelY);
})().compute(MAX_AGENTS);

// 3. Update steering e integración
export const updateAgentsCompute = Fn(() => {
  const idx = instanceIndex;
  If(idx.greaterThanEqual(uActiveAgents), () => { return; });

  const pos = positionNode.element(idx);
  const vel = velocityNode.element(idx);

  const rnd = hash11(idx.toFloat());
  const rnd2 = hash11(idx.toFloat().add(1337.0));
  
  const maxSpeed = float(config.MAX_SPEED).mul(
    float(1.0).sub(float(config.AGENT_VARIATION)).add(rnd.mul(config.AGENT_VARIATION * 2.0))
  );
  const perception = float(config.PERCEPTION_RADIUS).mul(
    float(1.0).sub(float(config.AGENT_VARIATION)).add(rnd2.mul(config.AGENT_VARIATION * 2.0))
  );

  const cx = floor(pos.x.div(config.PERCEPTION_RADIUS)).toInt();
  const cy = floor(pos.y.div(config.PERCEPTION_RADIUS)).toInt();

  const separation = vec2(0).toVar();
  const alignment = vec2(0).toVar();
  const cohesion = vec2(0).toVar();
  const neighborCount = uint(0).toVar();

  const gridX = uGridCellsX.toInt();
  const gridY = uGridCellsY.toInt();

  Loop({ start: int(-1), end: int(2), type: 'int', name: 'i' }, ({ i }) => {
    Loop({ start: int(-1), end: int(2), type: 'int', name: 'j' }, ({ j }) => {
      const nx = cx.add(i);
      const ny = cy.add(j);

      const wx = nx.mod(gridX).add(gridX).mod(gridX);
      const wy = ny.mod(gridY).add(gridY).mod(gridY);
      
      const cellIdx = wy.mul(gridX).add(wx);
      const count = cellCountNode.element(cellIdx);

      If(count.greaterThan(0), () => {
        const avgPosX = cellPosXNode.element(cellIdx).toFloat().div(FIXED_SCALE).div(count.toFloat());
        const avgPosY = cellPosYNode.element(cellIdx).toFloat().div(FIXED_SCALE).div(count.toFloat());
        const avgVelX = cellVelXNode.element(cellIdx).toFloat().div(FIXED_SCALE).div(count.toFloat());
        const avgVelY = cellVelYNode.element(cellIdx).toFloat().div(FIXED_SCALE).div(count.toFloat());

        const cellOriginX = wx.toFloat().mul(config.PERCEPTION_RADIUS);
        const cellOriginY = wy.toFloat().mul(config.PERCEPTION_RADIUS);
        
        const cellAvgPos = vec2(cellOriginX.add(avgPosX), cellOriginY.add(avgPosY));
        const cellAvgVel = vec2(avgVelX, avgVelY);

        let delta = cellAvgPos.sub(pos);
        delta.x = delta.x.add(uWorldWidth.div(2.0)).mod(uWorldWidth).sub(uWorldWidth.div(2.0));
        delta.y = delta.y.add(0.5).mod(1.0).sub(0.5);

        const dist = length(delta);
        const isOwnCell = i.equal(0).and(j.equal(0));
        
        If(isOwnCell, () => {
           If(count.greaterThan(1), () => {
             const ownRelX = pos.x.sub(cellOriginX);
             const ownRelY = pos.y.sub(cellOriginY);
             
             const sumPosX = cellPosXNode.element(cellIdx).toFloat().div(FIXED_SCALE).sub(ownRelX);
             const sumPosY = cellPosYNode.element(cellIdx).toFloat().div(FIXED_SCALE).sub(ownRelY);
             const sumVelX = cellVelXNode.element(cellIdx).toFloat().div(FIXED_SCALE).sub(vel.x);
             const sumVelY = cellVelYNode.element(cellIdx).toFloat().div(FIXED_SCALE).sub(vel.y);
             
             const cMinus1 = count.toFloat().sub(1.0);
             const newAvgPos = vec2(cellOriginX.add(sumPosX.div(cMinus1)), cellOriginY.add(sumPosY.div(cMinus1)));
             const newAvgVel = vec2(sumVelX.div(cMinus1), sumVelY.div(cMinus1));
             
             let newDelta = newAvgPos.sub(pos);
             newDelta.x = newDelta.x.add(uWorldWidth.div(2.0)).mod(uWorldWidth).sub(uWorldWidth.div(2.0));
             newDelta.y = newDelta.y.add(0.5).mod(1.0).sub(0.5);
             
             const newDist = length(newDelta);
             If(newDist.lessThan(perception).and(newDist.greaterThan(0.0001)), () => {
                alignment.addAssign(newAvgVel);
                cohesion.addAssign(newDelta);
                If(newDist.lessThan(perception.mul(config.SEPARATION_RADIUS_FACTOR)), () => {
                   separation.addAssign(newDelta.normalize().div(newDist).negate());
                });
                neighborCount.addAssign(1);
             });
           });
        }).else(() => {
           If(dist.lessThan(perception).and(dist.greaterThan(0.0001)), () => {
              alignment.addAssign(cellAvgVel);
              cohesion.addAssign(delta);
              // Separation enhancement: if cell is very close, push strongly
              If(dist.lessThan(perception.mul(config.SEPARATION_RADIUS_FACTOR)), () => {
                 separation.addAssign(delta.normalize().div(dist).negate());
              });
              neighborCount.addAssign(1);
           });
        });
      });
    });
  });

  const steering = vec2(0).toVar();

  If(neighborCount.greaterThan(0), () => {
    alignment.divAssign(neighborCount.toFloat());
    cohesion.divAssign(neighborCount.toFloat());
    
    const alignForce = alignment.normalize().mul(maxSpeed).sub(vel);
    const cohForce = cohesion.normalize().mul(maxSpeed).sub(vel);
    const sepForce = separation.normalize().mul(maxSpeed).sub(vel);
    
    steering.addAssign(limitForce(sepForce).mul(config.SEPARATION_WEIGHT));
    steering.addAssign(limitForce(alignForce).mul(config.ALIGNMENT_WEIGHT));
    steering.addAssign(limitForce(cohForce).mul(config.COHESION_WEIGHT));
  });

  // Flow Field
  const flowResX = float(config.FLOW_FIELD_RESOLUTION);
  const flowUvX = pos.x.div(uWorldWidth);
  const flowUvY = pos.y;
  const texX = clamp(floor(flowUvX.mul(flowResX)), 0.0, flowResX.sub(1.0)).toInt();
  const texY = clamp(floor(flowUvY.mul(flowResX)), 0.0, flowResX.sub(1.0)).toInt();
  
  const flowDir = textureLoad(flowTex, ivec2(texX, texY)).xy;
  const flowDesired = flowDir.mul(maxSpeed);
  const flowForce = flowDesired.sub(vel);
  
  steering.addAssign(limitForce(flowForce).mul(config.FLOW_FIELD_WEIGHT));

  // Wander
  const wanderTime = uTime.mul(config.WANDER_RATE).add(rnd.mul(100.0));
  const wanderAngle = hash11(floor(wanderTime)).mul(Math.PI * 2.0);
  const wanderNext = hash11(floor(wanderTime).add(1.0)).mul(Math.PI * 2.0);
  const wAngle = mix(wanderAngle, wanderNext, smoothstep(0.0, 1.0, fract(wanderTime)));
  
  const wanderDesired = vec2(cos(wAngle), sin(wAngle)).mul(maxSpeed);
  const wanderForce = wanderDesired.sub(vel);
  
  steering.addAssign(limitForce(wanderForce).mul(config.WANDER_STRENGTH));

  // Integration
  vel.addAssign(steering);
  
  const speed = length(vel);
  If(speed.greaterThan(maxSpeed), () => {
    vel.assign(vel.normalize().mul(maxSpeed));
  });

  pos.addAssign(vel.mul(uDt));

  // Toroidal wrap
  pos.x = pos.x.mod(uWorldWidth).add(uWorldWidth).mod(uWorldWidth);
  pos.y = pos.y.mod(1.0).add(1.0).mod(1.0);

})().compute(MAX_AGENTS);
