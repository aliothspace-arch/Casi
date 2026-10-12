/**
 * SingaporeCircuitConfig.ts - Full Definition for FIA Marina Bay Street Circuit (Singapore Night GP)
 * Implements the ICircuitDefinition specification.
 */

import { ICircuitDefinition } from '../ICircuit';
import { SINGAPORE_WAYPOINTS, SINGAPORE_TOTAL_LENGTH, SINGAPORE_RACE_PACE_SPEED } from './SingaporeWaypoints';
import { SingaporeTrackBuilder } from './SingaporeTrackBuilder';

export const SingaporeCircuitConfig: ICircuitDefinition = {
  id: 'singapore_marina',
  name: 'Marina Bay',
  tagline: 'Gran Premio nocturno de Singapur: 3.12km técnico entre rascacielos iluminados y la bahía',
  country: 'Singapur',
  flagEmoji: '🇸🇬',
  totalLength: SINGAPORE_TOTAL_LENGTH,
  racePaceSpeed: SINGAPORE_RACE_PACE_SPEED,
  expectedLapTimeSec: 57.2,
  cornersCount: 19,
  topSpeedKmh: 355,
  drsZonesCount: 2,
  drsZones: [
    {
      id: 'drs_raffles',
      name: 'Raffles Boulevard DRS',
      detectionDistance: 540,
      startDistance: 680,
      endDistance: 1320,
    },
    {
      id: 'drs_pit_straight',
      name: 'Waterfront Pit Straight DRS',
      detectionDistance: 2750,
      startDistance: 2880,
      endDistance: 3100,
    },
  ],
  waypoints: SINGAPORE_WAYPOINTS,
  pitZone: {
    minX: -65,
    maxX: 55,
    minZ: -148.0,
    maxZ: -130.0,
  },
  gridSlots: {
    player: {
      x: 0,
      z: -135.0,
      yaw: Math.PI / 2,
    },
    ai: (slot: number) => {
      const isLeft = slot % 2 === 1;
      return {
        x: 0 - (slot - 1) * 8.5,
        z: isLeft ? -133.0 : -137.0,
        yaw: Math.PI / 2,
      };
    },
  },
  checkSectorProgress: (x: number, z: number, currentSector: number) => {
    // Sector 1: Start line through Sheares corner into Republic Blvd (X > 250, Z > 50)
    if (currentSector === 0 && x > 250 && z > 50) {
      return { newSector: 1, lapCompleted: false };
    }
    // Sector 2: Raffles Blvd mega straight down to Memorial corner & Stamford (X < -80, Z > 480)
    else if (currentSector === 1 && x < -80 && z > 480) {
      return { newSector: 2, lapCompleted: false };
    }
    // Sector 3: Padang, Anderson Bridge into Esplanade Drive (X < -80, Z < -60)
    else if (currentSector === 2 && x < -80 && z < -60) {
      return { newSector: 3, lapCompleted: false };
    }
    // Finish Line crossing on Main Straight (X: -20 to 25, Z < -130)
    else if (currentSector === 3 && z < -130 && x >= -20 && x <= 25) {
      return { newSector: 0, lapCompleted: true };
    }
    return { newSector: currentSector, lapCompleted: false };
  },
  minimapConfig: {
    viewBox: '-260 -180 620 770',
    svgTrackPath: `
      M 0 -135
      L 150 -135
      Q 215 -125 215 -90
      Q 238 -55 265 -15
      Q 290 45 308 120
      L 280 215
      L 215 315
      L 135 410
      L 50 495
      L -28 545
      Q -70 546 -110 515
      Q -145 470 -175 420
      L -200 320
      L -222 220
      Q -232 140 -215 42
      L -180 -5
      L -140 -50
      Q -105 -85 -70 -105
      L -35 -118
      L 0 -125
      Q 38 -132 0 -135
      Z
    `.replace(/\s+/g, ' ').trim(),
    pitLaneSvgPath: 'M -55 -142 L 45 -142',
    bounds: {
      minX: -245,
      maxX: 325,
      minZ: -160,
      maxZ: 565,
    },
  },
  createTrackBuilder: () => new SingaporeTrackBuilder(),
};
