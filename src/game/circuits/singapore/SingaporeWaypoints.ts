/**
 * SingaporeWaypoints.ts - FIA Marina Bay Street Circuit (Singapore Grand Prix) Geometry
 * Official F1 night street circuit layout (~3,120m) featuring:
 * - Waterfront Main Straight with DRS (330+ km/h)
 * - Turn 1-2-3 (Sheares Corner) technical switchback complex
 * - Raffles Boulevard 800m+ high-speed mega straight with DRS Zone 2 (350+ km/h speed trap)
 * - Turn 7 (Memorial Corner) heavy braking zone from 350 down to 98 km/h
 * - Turn 8-9 (Stamford Corner) 90-degree urban corners
 * - Padang fast street corridor past historic landmarks
 * - Turn 13 iconic Anderson Bridge crossing
 * - Turn 14-15 Esplanade Drive
 * - Turn 16-19 The Float at Marina Bay grandstand complex facing Marina Bay Sands
 * - Turn 20-21 final chicane onto the Start/Finish straight
 */

import * as THREE from 'three';
import { SplinePoint } from '../../career/CircuitWaypoints';

export interface RawControlPoint {
  x: number;
  z: number;
  speed: number;
}

// 24 Key track geometry control nodes calibrated to Singapore Marina Bay GP
export const SINGAPORE_CONTROL_NODES: RawControlPoint[] = [
  // --- SECTOR 1: WATERFRONT MAIN STRAIGHT & SHEARES COMPLEX ---
  // Start/Finish Line at X = 0, Z = -135 (Mega pit straight with DRS)
  { x: 0, z: -135, speed: 310 },
  { x: 80, z: -135, speed: 330 },
  { x: 150, z: -135, speed: 325 },
  { x: 185, z: -125, speed: 230 }, // Turn 1 braking onset (100m board)

  // Turn 1, 2, 3: Sheares Corner Complex
  { x: 215, z: -90, speed: 135 },  // T1 Left
  { x: 238, z: -55, speed: 145 },  // T2 Right
  { x: 265, z: -15, speed: 180 },  // T3 Left exit onto Republic Boulevard

  // Turn 4 & 5: Acceleration towards Raffles Boulevard
  { x: 290, z: 45, speed: 235 },   // T4 Sweeping left
  { x: 308, z: 120, speed: 255 },  // T5 Right slingshot

  // --- SECTOR 2: RAFFLES BOULEVARD & MEMORIAL/STAMFORD SECTION ---
  // Raffles Boulevard Mega Straight (DRS Zone 2: 350+ km/h top speed)
  { x: 280, z: 215, speed: 300 },
  { x: 215, z: 315, speed: 338 },
  { x: 135, z: 410, speed: 350 },
  { x: 50, z: 495, speed: 354 },   // Speed Trap!
  { x: 10, z: 530, speed: 250 },   // 100m brake board
  { x: -28, z: 545, speed: 150 },  // 50m brake board

  // Turn 7: Memorial Corner (90° Left, 2nd gear)
  { x: -70, z: 546, speed: 98 },

  // Turn 8 & 9: Stamford Road
  { x: -110, z: 515, speed: 165 },
  { x: -145, z: 470, speed: 110 }, // T8 Right
  { x: -175, z: 420, speed: 115 }, // T9 Left

  // --- SECTOR 3: PADANG, ANDERSON BRIDGE & MARINA WATERFRONT ---
  // St. Andrew's Road / Padang straight
  { x: -200, z: 320, speed: 245 },
  { x: -222, z: 220, speed: 275 },

  // Turn 11 & 12: Singapore Cricket Club chicane
  { x: -232, z: 140, speed: 160 },
  { x: -228, z: 90, speed: 140 },

  // Turn 13: Anderson Bridge (Narrow historic arched truss bridge)
  { x: -215, z: 42, speed: 96 },

  // Turn 14 & 15: Esplanade Drive across the bay towards Marina Bay Sands
  { x: -180, z: -5, speed: 200 },
  { x: -140, z: -50, speed: 255 },

  // Turn 16, 17, 18, 19: The Float at Marina Bay grandstand complex
  { x: -105, z: -85, speed: 155 }, // T16 Right
  { x: -70, z: -105, speed: 130 }, // T17 Left
  { x: -35, z: -118, speed: 120 }, // T18 Under grandstand
  { x: 0, z: -125, speed: 175 },   // T19 Exit

  // Turn 20 & 21: Final chicane onto Main Straight
  { x: 38, z: -132, speed: 205 },  // T20 Left flick
  { x: -10, z: -135, speed: 250 }, // T21 Right slingshot
];

/**
 * Builds the canonical smooth Catmull-Rom closed circuit spline for Singapore Marina Bay.
 * Calibrated to approx. 3,120 meters with 650 finely-discretized waypoints (~4.8m per segment)
 * for perfectly continuous aerodynamic curvature without geometric aliasing.
 */
export function buildSingaporeWaypoints(): { waypoints: SplinePoint[]; totalLength: number } {
  const v3Points = SINGAPORE_CONTROL_NODES.map((pt) => new THREE.Vector3(pt.x, 0, pt.z));
  const curve = new THREE.CatmullRomCurve3(v3Points, true, 'centripetal', 0.5);

  const numSamples = 650;
  const sampledPoints = curve.getSpacedPoints(numSamples);

  // Map speed limits by projecting sampled points onto control nodes with distance weighting
  const tempPoints: { x: number; z: number; speed: number }[] = [];

  for (let i = 0; i < numSamples; i++) {
    const pt = sampledPoints[i];

    // Find nearest 2 control nodes to interpolate speed limit smoothly
    let minDist1 = Infinity;
    let minDist2 = Infinity;
    let node1 = SINGAPORE_CONTROL_NODES[0];
    let node2 = SINGAPORE_CONTROL_NODES[1];

    for (let c = 0; c < SINGAPORE_CONTROL_NODES.length; c++) {
      const node = SINGAPORE_CONTROL_NODES[c];
      const d = Math.hypot(node.x - pt.x, node.z - pt.z);
      if (d < minDist1) {
        minDist2 = minDist1;
        node2 = node1;
        minDist1 = d;
        node1 = node;
      } else if (d < minDist2) {
        minDist2 = d;
        node2 = node;
      }
    }

    const totalWeight = minDist1 + minDist2 || 1;
    const w1 = 1 - minDist1 / totalWeight;
    const w2 = 1 - w1;
    const interpolatedSpeed = Math.round(node1.speed * w1 + node2.speed * w2);

    tempPoints.push({
      x: Number(pt.x.toFixed(2)),
      z: Number(pt.z.toFixed(2)),
      speed: Math.max(75, Math.min(360, interpolatedSpeed)),
    });
  }

  let accumDist = 0;
  const numTotal = tempPoints.length;
  const distances: number[] = new Array(numTotal);

  for (let i = 0; i < numTotal; i++) {
    const nextIdx = (i + 1) % numTotal;
    const dx = tempPoints[nextIdx].x - tempPoints[i].x;
    const dz = tempPoints[nextIdx].z - tempPoints[i].z;
    const segLen = Math.hypot(dx, dz);
    distances[i] = segLen;
  }

  const splineWaypoints: SplinePoint[] = tempPoints.map((pt, idx, arr) => {
    const next = arr[(idx + 1) % arr.length];
    const dx = next.x - pt.x;
    const dz = next.z - pt.z;
    const yaw = Math.atan2(dx, dz);
    const currentAccum = accumDist;
    accumDist += distances[idx];
    return {
      x: pt.x,
      z: pt.z,
      speedLimitKmh: pt.speed,
      yaw,
      accumulatedDistance: currentAccum,
      segmentLength: distances[idx],
    };
  });

  return {
    waypoints: splineWaypoints,
    totalLength: Number(accumDist.toFixed(2)),
  };
}

const singaporeData = buildSingaporeWaypoints();
export const SINGAPORE_WAYPOINTS = singaporeData.waypoints;
export const SINGAPORE_TOTAL_LENGTH = singaporeData.totalLength;
export const SINGAPORE_RACE_PACE_SPEED = 54.5; // ~196.2 km/h average lap pace (Singapur es el circuito urbano más lento tras Mónaco)
