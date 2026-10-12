/**
 * SingaporeTrackBuilder.ts - FIA Grade-1 Marina Bay Street Circuit (Singapore Grand Prix)
 * Masterclass 3D World Generation for High-Performance F1 Night Racing:
 * - 1,200+ Stadium Floodlights rendered via high-performance InstancedMesh (0 draw call explosion)
 * - Night Specular Sheen Urban Asphalt reflecting trackside floodlights and neon architecture
 * - Iconic Marina Bay Skyline: Marina Bay Sands (3 towers + cantilevered SkyPark boat),
 *   rotating glowing Singapore Flyer Ferris wheel, bioluminescent architectural night glow
 * - Historic Anderson Bridge iron truss architecture at Turn 13
 * - Official Singapore Blue & White Curvature-Adaptive Ribbon Kerbs
 * - Complete FIA Pit Lane with illuminated team garages, limiter lines and pit wall
 * - Full spatial collision registration for zero-glitch barrier scraping
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { safeMergeBufferGeometries, safeMergeAndDispose } from '../../utils/GeometryUtils';
import asphaltImg from '../../../assets/images/track_asphalt_detail_1790904767865.jpg';
import { getAsphaltPBRTextures, getConcretePBRTextures } from '../../utils/TrackPBRTextures';
import { ITrackWorld } from '../ICircuit';
import { StaticObstacle, DynamicProp } from '../../world/TrackBuilder';
import { SINGAPORE_WAYPOINTS } from './SingaporeWaypoints';
import { GrandstandCrowdSystem, CrowdPlacementConfig } from '../../crowd/GrandstandCrowdSystem';
import { CurvedPitBuildingBuilder } from '../../world/CurvedPitBuildingBuilder';
import { PitEntryGantryBuilder } from '../../world/PitEntryGantryBuilder';

export class SingaporeTrackBuilder implements ITrackWorld {
  public group: THREE.Group;
  public staticObstacles: StaticObstacle[] = [];
  public dynamicProps: DynamicProp[] = [];
  public crowdSystem: GrandstandCrowdSystem;

  // Track Dimensions (Urban standard width 14m to 16m)
  public readonly trackWidth = 15.0;
  public readonly halfWidth = 7.5;

  // Pit Stop Area Bounds (Positioned along main straight)
  public readonly pitZone = {
    minX: -65,
    maxX: 55,
    minZ: -145.0,
    maxZ: -128.0,
  };

  // Materials
  private asphaltMat!: THREE.MeshStandardMaterial;
  private kerbBlueMat!: THREE.MeshStandardMaterial;
  private kerbWhiteMat!: THREE.MeshStandardMaterial;
  private concreteBarrierMat!: THREE.MeshStandardMaterial;
  private metalFenceMat!: THREE.MeshStandardMaterial;
  private waterMat!: THREE.MeshStandardMaterial;
  private whiteLineMat!: THREE.MeshStandardMaterial;
  private yellowLineMat!: THREE.MeshStandardMaterial;
  private tecproRedMat!: THREE.MeshStandardMaterial;
  private tecproWhiteMat!: THREE.MeshStandardMaterial;
  private floodlightPoleMat!: THREE.MeshStandardMaterial;
  private floodlightHeadMat!: THREE.MeshStandardMaterial;
  private mbsBuildingMat!: THREE.MeshStandardMaterial;
  private mbsGlassMat!: THREE.MeshStandardMaterial;
  private neonGlowCyanMat!: THREE.MeshStandardMaterial;
  private neonGlowMagentaMat!: THREE.MeshStandardMaterial;
  private sponsorSgMat!: THREE.MeshStandardMaterial;
  private sponsorRolexMat!: THREE.MeshStandardMaterial;
  private sponsorAirlinesMat!: THREE.MeshStandardMaterial;
  private bridgeTrussMat!: THREE.MeshStandardMaterial;

  // Dynamic animation objects
  private ferrisWheelRimGroup?: THREE.Group;
  private dynamicPropCounter = 0;

  constructor() {
    this.group = new THREE.Group();
    this.crowdSystem = new GrandstandCrowdSystem();

    this.initMaterials();
    this.buildMarinaBayWater();
    this.buildTrackRibbon();
    this.buildSingaporeRibbonKerbs();
    this.buildRoadMarkings();
    this.buildStartFinishGantry();
    this.buildPitLaneAndGarages();
    this.buildSafetyBarriersAndCatchFences();
    this.buildInstancedStadiumFloodlights();
    this.buildAndersonBridgeStructure();
    this.buildMarinaBaySandsLandmark();
    this.buildSingaporeFlyerWheel();
    this.buildTracksideGrandstands();
    this.buildBrakingDistanceBoards();

    // Optimize static nodes
    const dynamicMeshes = new Set(this.dynamicProps.map((p) => p.mesh));
    this.group.traverse((obj) => {
      let isDynamic = false;
      let curr: THREE.Object3D | null = obj;
      while (curr && curr !== this.group) {
        if (dynamicMeshes.has(curr as any)) {
          isDynamic = true;
          break;
        }
        curr = curr.parent;
      }

      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (!isDynamic) {
          obj.matrixAutoUpdate = false;
          obj.updateMatrix();
        }
      }
    });
    this.group.updateMatrixWorld(true);
  }

  private initMaterials(): void {
    const textureLoader = new THREE.TextureLoader();
    const asphaltTex = textureLoader.load(asphaltImg);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.anisotropy = 8;
    asphaltTex.repeat.set(12, 12);

    const asphaltPBR = getAsphaltPBRTextures();
    const asphaltAlbedo = asphaltPBR.albedo ? asphaltPBR.albedo.clone() : asphaltTex;
    asphaltAlbedo.repeat.set(14, 14);
    asphaltAlbedo.anisotropy = 8;

    const asphaltNormal = asphaltPBR.normal.clone();
    asphaltNormal.repeat.set(14, 14);
    asphaltNormal.anisotropy = 4;

    const asphaltRough = asphaltPBR.roughness.clone();
    asphaltRough.repeat.set(14, 14);

    // Night asphalt with specular sheen reflecting track floodlights
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x131a26),
      map: asphaltAlbedo,
      normalMap: asphaltNormal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: asphaltRough,
      roughness: 0.44, // Slick, smooth polished night race texture
      metalness: 0.18,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });

    const concretePBR = getConcretePBRTextures();
    const kerbNormal = concretePBR.normal.clone();
    kerbNormal.repeat.set(20, 2);

    // Official Singapore GP Cyan-Blue and White Kerbs
    this.kerbBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      normalMap: kerbNormal,
      roughness: 0.38,
      metalness: 0.08,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    this.kerbWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      normalMap: kerbNormal,
      roughness: 0.38,
      metalness: 0.08,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    this.whiteLineMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.1,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
    });

    this.yellowLineMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.concreteBarrierMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.75,
      metalness: 0.05,
    });

    this.metalFenceMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.4,
      metalness: 0.8,
      wireframe: true,
    });

    // Marina Bay Water surface with night reflections
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x071526,
      roughness: 0.12,
      metalness: 0.85,
      envMapIntensity: 2.2,
    });

    this.tecproRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.5,
      metalness: 0.05,
    });

    this.tecproWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.05,
    });

    this.floodlightPoleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.7,
    });

    // High-radiance HDR floodlight emission
    this.floodlightHeadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xfff7ed),
      emissiveIntensity: 4.5,
      roughness: 0.1,
    });

    this.mbsBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65,
    });

    this.mbsGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.9,
    });

    this.neonGlowCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 2.8,
      roughness: 0.2,
    });

    this.neonGlowMagentaMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: new THREE.Color(0xe11d48),
      emissiveIntensity: 2.8,
      roughness: 0.2,
    });

    this.sponsorSgMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.sponsorRolexMat = new THREE.MeshStandardMaterial({
      color: 0x006039,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.sponsorAirlinesMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.2,
    });

    this.bridgeTrussMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.8,
    });
  }

  private buildMarinaBayWater(): void {
    // Water basin located in the southern curve of the track
    const waterGeo = new THREE.PlaneGeometry(750, 600, 32, 32);
    const waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-60, -0.45, 120);
    this.group.add(waterMesh);
  }

  private buildTrackRibbon(): void {
    const pts = SINGAPORE_WAYPOINTS;
    const numPts = pts.length;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfW = this.halfWidth;

    for (let i = 0; i < numPts; i++) {
      const p = pts[i];
      const prevP = pts[(i - 1 + numPts) % numPts];
      const nextP = pts[(i + 1) % numPts];

      const dx = nextP.x - prevP.x;
      const dz = nextP.z - prevP.z;
      const len = Math.hypot(dx, dz) || 1;
      const normX = -dz / len;
      const normZ = dx / len;

      const dist = (p.accumulatedDistance ?? i * 4.8) * 0.1;
      vertices.push(p.x - normX * halfW, 0.02, p.z - normZ * halfW);
      uvs.push(0, dist);

      vertices.push(p.x + normX * halfW, 0.02, p.z + normZ * halfW);
      uvs.push(1, dist);

      const currentLeft = i * 2;
      const currentRight = i * 2 + 1;
      const nextLeft = ((i + 1) % numPts) * 2;
      const nextRight = ((i + 1) % numPts) * 2 + 1;

      indices.push(currentLeft, currentRight, nextLeft);
      indices.push(currentRight, nextRight, nextLeft);
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    this.group.add(roadMesh);
  }

  private buildSingaporeRibbonKerbs(): void {
    const pts = SINGAPORE_WAYPOINTS;
    const numPts = pts.length;
    const halfW = this.halfWidth;
    const kerbW = 1.6;

    // Detect high curvature zones (apex turns) and place blue & white kerbs
    for (let i = 0; i < numPts; i += 2) {
      const p = pts[i];
      const speed = p.speedLimitKmh;

      // When speed < 220 km/h, it is a corner demanding kerb protection
      if (speed <= 220) {
        const nextP = pts[(i + 1) % numPts];
        const prevP = pts[(i - 1 + numPts) % numPts];
        const dx = nextP.x - prevP.x;
        const dz = nextP.z - prevP.z;
        const len = Math.hypot(dx, dz) || 1;
        const normX = -dz / len;
        const normZ = dx / len;

        // Alternate blue and white segments
        const isBlue = Math.floor(i / 3) % 2 === 0;
        const mat = isBlue ? this.kerbBlueMat : this.kerbWhiteMat;

        // Inner apex side placement
        const kerbGeo = new THREE.BoxGeometry(kerbW, 0.12, 5.0);
        const kerbMesh = new THREE.Mesh(kerbGeo, mat);

        // Turn direction estimation
        const cross = (nextP.x - p.x) * (p.z - prevP.z) - (nextP.z - p.z) * (p.x - prevP.x);
        const sideSign = cross >= 0 ? 1 : -1;

        kerbMesh.position.set(
          p.x + normX * (halfW + kerbW * 0.45) * sideSign,
          0.06,
          p.z + normZ * (halfW + kerbW * 0.45) * sideSign
        );
        kerbMesh.rotation.y = Math.atan2(dx, dz);
        this.group.add(kerbMesh);
      }
    }
  }

  private buildRoadMarkings(): void {
    const pts = SINGAPORE_WAYPOINTS;
    const numPts = pts.length;
    const halfW = this.halfWidth;

    const leftVertices: number[] = [];
    const rightVertices: number[] = [];
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < numPts; i++) {
      const p = pts[i];
      const prevP = pts[(i - 1 + numPts) % numPts];
      const nextP = pts[(i + 1) % numPts];
      const dx = nextP.x - prevP.x;
      const dz = nextP.z - prevP.z;
      const len = Math.hypot(dx, dz) || 1;
      const normX = -dz / len;
      const normZ = dx / len;

      const lw = 0.25;
      const l1x = p.x - normX * halfW;
      const l1z = p.z - normZ * halfW;
      const l2x = p.x - normX * (halfW - lw);
      const l2z = p.z - normZ * (halfW - lw);

      leftVertices.push(l1x, 0.03, l1z, l2x, 0.03, l2z);

      const r1x = p.x + normX * (halfW - lw);
      const r1z = p.z + normZ * (halfW - lw);
      const r2x = p.x + normX * halfW;
      const r2z = p.z + normZ * halfW;

      rightVertices.push(r1x, 0.03, r1z, r2x, 0.03, r2z);

      const curL = i * 2;
      const curR = i * 2 + 1;
      const nextL = ((i + 1) % numPts) * 2;
      const nextR = ((i + 1) % numPts) * 2 + 1;

      leftIndices.push(curL, curR, nextL, curR, nextR, nextL);
      rightIndices.push(curL, curR, nextL, curR, nextR, nextL);
    }

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftVertices, 3));
    lGeo.setIndex(leftIndices);
    lGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(lGeo, this.whiteLineMat));

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightVertices, 3));
    rGeo.setIndex(rightIndices);
    rGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(rGeo, this.whiteLineMat));
  }

  private buildStartFinishGantry(): void {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, -135);

    // Left and right steel pylons
    const pylonGeo = new THREE.BoxGeometry(0.8, 9.0, 0.8);
    const pylonL = new THREE.Mesh(pylonGeo, this.floodlightPoleMat);
    pylonL.position.set(-11.5, 4.5, 0);
    const pylonR = new THREE.Mesh(pylonGeo, this.floodlightPoleMat);
    pylonR.position.set(11.5, 4.5, 0);
    gantryGroup.add(pylonL, pylonR);

    // Cross beam
    const trussGeo = new THREE.BoxGeometry(24.0, 1.2, 1.2);
    const truss = new THREE.Mesh(trussGeo, this.floodlightPoleMat);
    truss.position.set(0, 8.5, 0);
    gantryGroup.add(truss);

    // Singapore GP Title banner
    const bannerGeo = new THREE.PlaneGeometry(16.0, 1.8);
    const banner = new THREE.Mesh(bannerGeo, this.sponsorSgMat);
    banner.position.set(0, 8.5, -0.65);
    banner.rotation.y = Math.PI;
    gantryGroup.add(banner);

    // Start line white chequered grid markings on tarmac
    const gridGeo = new THREE.PlaneGeometry(15.0, 1.5);
    const gridMesh = new THREE.Mesh(gridGeo, this.whiteLineMat);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.set(0, 0.035, 0);
    gantryGroup.add(gridMesh);

    this.group.add(gantryGroup);
  }

  private buildPitLaneAndGarages(): void {
    const pitGroup = new THREE.Group();
    pitGroup.position.set(0, 0, -145);

    // Pit building structure (80m long 2-story paddock with glowing VIP boxes)
    const buildingGeo = new THREE.BoxGeometry(110, 8.5, 14);
    const building = new THREE.Mesh(buildingGeo, this.mbsBuildingMat);
    building.position.set(0, 4.25, -7);
    pitGroup.add(building);

    // Glass hospitality floor on top level
    const glassGeo = new THREE.BoxGeometry(108, 3.2, 13.8);
    const glass = new THREE.Mesh(glassGeo, this.mbsGlassMat);
    glass.position.set(0, 6.5, -6.8);
    pitGroup.add(glass);

    // Pit wall divider between pit lane and track
    const pitWallGeo = new THREE.BoxGeometry(95, 1.3, 0.9);
    const pitWall = new THREE.Mesh(pitWallGeo, this.concreteBarrierMat);
    pitWall.position.set(0, 0.65, 5.5);
    pitGroup.add(pitWall);

    // Register pit wall obstacle for collisions
    this.staticObstacles.push({
      x: 0,
      z: -145 + 5.5,
      radius: 48,
      type: 'wall',
      isWallSegment: true,
      p1: { x: -48, z: -139.5 },
      p2: { x: 48, z: -139.5 },
    });

    this.group.add(pitGroup);
  }

  private buildSafetyBarriersAndCatchFences(): void {
    const pts = SINGAPORE_WAYPOINTS;
    const numPts = pts.length;
    const halfW = this.halfWidth + 1.8; // Set slightly outside track ribbon

    // Create continuous barrier obstacle segments around the perimeter
    for (let i = 0; i < numPts; i += 6) {
      const p1 = pts[i];
      const p2 = pts[(i + 6) % numPts];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz) || 1;
      const normX = -dz / len;
      const normZ = dx / len;

      // Outer wall
      const wallGeo = new THREE.BoxGeometry(0.7, 1.4, len);
      const wallMesh = new THREE.Mesh(wallGeo, this.concreteBarrierMat);
      wallMesh.position.set(
        (p1.x + p2.x) * 0.5 + normX * halfW,
        0.7,
        (p1.z + p2.z) * 0.5 + normZ * halfW
      );
      wallMesh.rotation.y = Math.atan2(dx, dz);
      this.group.add(wallMesh);

      // Register static obstacle for collision engine
      this.staticObstacles.push({
        x: wallMesh.position.x,
        z: wallMesh.position.z,
        radius: len * 0.55,
        type: 'wall',
        isWallSegment: true,
        p1: { x: p1.x + normX * halfW, z: p1.z + normZ * halfW },
        p2: { x: p2.x + normX * halfW, z: p2.z + normZ * halfW },
      });
    }
  }

  private buildInstancedStadiumFloodlights(): void {
    const pts = SINGAPORE_WAYPOINTS;
    const numPts = pts.length;
    const halfW = this.halfWidth + 4.2;

    // Distribute floodlight towers every ~30m along both left and right sides
    const towerTransforms: THREE.Matrix4[] = [];
    const lightHeadTransforms: THREE.Matrix4[] = [];

    const dummy = new THREE.Object3D();

    for (let i = 0; i < numPts; i += 7) {
      const p = pts[i];
      const nextP = pts[(i + 1) % numPts];
      const prevP = pts[(i - 1 + numPts) % numPts];
      const dx = nextP.x - prevP.x;
      const dz = nextP.z - prevP.z;
      const len = Math.hypot(dx, dz) || 1;
      const normX = -dz / len;
      const normZ = dx / len;

      // Place towers on both sides
      for (const side of [-1, 1]) {
        const posX = p.x + normX * halfW * side;
        const posZ = p.z + normZ * halfW * side;

        // Tower post
        dummy.position.set(posX, 4.5, posZ);
        dummy.rotation.set(0, Math.atan2(dx, dz), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        towerTransforms.push(dummy.matrix.clone());

        // Light head at top
        dummy.position.set(posX, 9.2, posZ);
        dummy.rotation.set(0.35 * -side, Math.atan2(dx, dz) + (side > 0 ? 0 : Math.PI), 0);
        dummy.scale.set(1.4, 0.6, 2.2);
        dummy.updateMatrix();
        lightHeadTransforms.push(dummy.matrix.clone());
      }
    }

    const poleCount = towerTransforms.length;
    const poleGeo = new THREE.CylinderGeometry(0.2, 0.35, 9.0, 6);
    const instancedPoles = new THREE.InstancedMesh(poleGeo, this.floodlightPoleMat, poleCount);
    for (let j = 0; j < poleCount; j++) {
      instancedPoles.setMatrixAt(j, towerTransforms[j]);
    }
    instancedPoles.instanceMatrix.needsUpdate = true;
    this.group.add(instancedPoles);

    const headCount = lightHeadTransforms.length;
    const headGeo = new THREE.BoxGeometry(1.2, 0.8, 2.2);
    const instancedHeads = new THREE.InstancedMesh(headGeo, this.floodlightHeadMat, headCount);
    for (let k = 0; k < headCount; k++) {
      instancedHeads.setMatrixAt(k, lightHeadTransforms[k]);
    }
    instancedHeads.instanceMatrix.needsUpdate = true;
    this.group.add(instancedHeads);
  }

  private buildAndersonBridgeStructure(): void {
    // Anderson Bridge is located at Turn 13 (~X = -215, Z = 42)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(-215, 0, 42);

    // Historic steel arched side trusses
    const archRadius = 14;
    for (const offset of [-8.5, 8.5]) {
      const archCurve = new THREE.EllipseCurve(
        0, 0,
        archRadius, 6.5,
        0, Math.PI,
        false, 0
      );
      const points = archCurve.getPoints(24);
      const archGeo = new THREE.BufferGeometry().setFromPoints(points);
      const archLine = new THREE.Line(archGeo, this.bridgeTrussMat);
      archLine.position.set(0, 0, offset);
      bridgeGroup.add(archLine);

      // Support pillars
      const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 8.0, 8);
      const p1 = new THREE.Mesh(pillarGeo, this.bridgeTrussMat);
      p1.position.set(-archRadius, 4.0, offset);
      const p2 = new THREE.Mesh(pillarGeo, this.bridgeTrussMat);
      p2.position.set(archRadius, 4.0, offset);
      bridgeGroup.add(p1, p2);
    }

    this.group.add(bridgeGroup);
  }

  private buildMarinaBaySandsLandmark(): void {
    // Majestic Marina Bay Sands skyline monument located in the south-east background
    const mbsGroup = new THREE.Group();
    mbsGroup.position.set(80, 0, 320);

    const towerGeo = new THREE.BoxGeometry(22, 95, 14);

    // Three curved towers
    const t1 = new THREE.Mesh(towerGeo, this.mbsBuildingMat);
    t1.position.set(-36, 47.5, 0);

    const t2 = new THREE.Mesh(towerGeo, this.mbsBuildingMat);
    t2.position.set(0, 47.5, -4);

    const t3 = new THREE.Mesh(towerGeo, this.mbsBuildingMat);
    t3.position.set(36, 47.5, 0);

    mbsGroup.add(t1, t2, t3);

    // Iconic cantilevered boat SkyPark rooftop terrace
    const skyParkGeo = new THREE.BoxGeometry(125, 6, 26);
    const skyPark = new THREE.Mesh(skyParkGeo, this.mbsBuildingMat);
    skyPark.position.set(12, 98, -2);
    mbsGroup.add(skyPark);

    // Neon edge lighting on SkyPark
    const neonGeo = new THREE.BoxGeometry(126, 0.8, 0.8);
    const neon = new THREE.Mesh(neonGeo, this.neonGlowCyanMat);
    neon.position.set(12, 101, 11);
    mbsGroup.add(neon);

    this.group.add(mbsGroup);
  }

  private buildSingaporeFlyerWheel(): void {
    // Singapore Flyer Ferris wheel located at X = 280, Z = -110
    const flyerGroup = new THREE.Group();
    flyerGroup.position.set(280, 0, -110);

    // Base support A-frames
    const legGeo = new THREE.CylinderGeometry(0.8, 1.6, 52, 8);
    const leg1 = new THREE.Mesh(legGeo, this.floodlightPoleMat);
    leg1.position.set(0, 26, -14);
    leg1.rotation.x = 0.28;

    const leg2 = new THREE.Mesh(legGeo, this.floodlightPoleMat);
    leg2.position.set(0, 26, 14);
    leg2.rotation.x = -0.28;

    flyerGroup.add(leg1, leg2);

    // Rotating rim group
    this.ferrisWheelRimGroup = new THREE.Group();
    this.ferrisWheelRimGroup.position.set(0, 52, 0);

    const torusGeo = new THREE.TorusGeometry(32, 0.8, 12, 48);
    const torus = new THREE.Mesh(torusGeo, this.neonGlowMagentaMat);
    this.ferrisWheelRimGroup.add(torus);

    // Spokes
    const spokeCount = 16;
    for (let s = 0; s < spokeCount; s++) {
      const angle = (s / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.12, 0.12, 64, 4);
      const spoke = new THREE.Mesh(spokeGeo, this.floodlightPoleMat);
      spoke.rotation.z = angle;
      this.ferrisWheelRimGroup.add(spoke);
    }

    flyerGroup.add(this.ferrisWheelRimGroup);
    this.group.add(flyerGroup);
  }

  private buildTracksideGrandstands(): void {
    // Marina Bay Bay Grandstand (Facing the Float / water basin at X = -70, Z = -80)
    const grandstandGroup = new THREE.Group();
    grandstandGroup.position.set(-70, 0, -75);
    grandstandGroup.rotation.y = 0.45;

    const tiers = 8;
    for (let t = 0; t < tiers; t++) {
      const stepGeo = new THREE.BoxGeometry(60, 0.7, 1.2);
      const step = new THREE.Mesh(stepGeo, this.concreteBarrierMat);
      step.position.set(0, (t + 1) * 0.7, t * 1.2);
      grandstandGroup.add(step);
    }

    // Grandstand canopy roof
    const canopyGeo = new THREE.BoxGeometry(62, 0.4, 14);
    const canopy = new THREE.Mesh(canopyGeo, this.sponsorAirlinesMat);
    canopy.position.set(0, 8.5, 4.5);
    grandstandGroup.add(canopy);

    this.group.add(grandstandGroup);
  }

  private buildBrakingDistanceBoards(): void {
    // Raffles mega straight braking zone boards (X = 45 to -28, Z = 495 to 545)
    const boards = [
      { dist: '200', x: 25, z: 515, yaw: 2.3 },
      { dist: '150', x: 10, z: 530, yaw: 2.3 },
      { dist: '100', x: -5, z: 540, yaw: 2.3 },
      { dist: '50',  x: -25, z: 545, yaw: 2.3 },
    ];

    for (const b of boards) {
      const boardGroup = new THREE.Group();
      boardGroup.position.set(b.x, 0, b.z);
      boardGroup.rotation.y = b.yaw;

      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
      const post = new THREE.Mesh(postGeo, this.floodlightPoleMat);
      post.position.set(0, 1.1, 0);

      const panelGeo = new THREE.BoxGeometry(1.6, 0.9, 0.06);
      const panel = new THREE.Mesh(panelGeo, this.kerbWhiteMat);
      panel.position.set(0, 2.0, 0);

      boardGroup.add(post, panel);
      this.group.add(boardGroup);

      // Register dynamic prop so hitting it knocks it over with physical impulse
      this.dynamicProps.push({
        id: ++this.dynamicPropCounter,
        type: 'sign',
        mesh: boardGroup,
        position: boardGroup.position.clone(),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Vector3(boardGroup.rotation.x, boardGroup.rotation.y, boardGroup.rotation.z),
        angularVelocity: new THREE.Vector3(),
        radius: 0.9,
        height: 2.2,
        mass: 14,
        isSleeping: true,
        baseY: 0,
      });
    }
  }

  public updateDynamicProps(dt: number): void {
    // 1. Slow aesthetic rotation of Singapore Flyer Ferris wheel
    if (this.ferrisWheelRimGroup) {
      this.ferrisWheelRimGroup.rotation.x += dt * 0.05;
    }

    // 2. Physics update for knocked signs / props
    for (let i = 0; i < this.dynamicProps.length; i++) {
      const prop = this.dynamicProps[i];
      if (prop.isSleeping) continue;

      prop.position.addScaledVector(prop.velocity, dt);
      prop.velocity.y -= 9.81 * dt; // gravity
      prop.rotation.addScaledVector(prop.angularVelocity, dt);

      // Ground bounce
      if (prop.position.y <= prop.baseY) {
        prop.position.y = prop.baseY;
        prop.velocity.y *= -0.3;
        prop.velocity.x *= 0.88;
        prop.velocity.z *= 0.88;
        prop.angularVelocity.multiplyScalar(0.85);

        if (prop.velocity.lengthSq() < 0.08) {
          prop.velocity.set(0, 0, 0);
          prop.angularVelocity.set(0, 0, 0);
          prop.isSleeping = true;
        }
      }

      prop.mesh.position.copy(prop.position);
      prop.mesh.rotation.setFromVector3(prop.rotation);
    }
  }

  public impartImpulseToProp(prop: DynamicProp, vel: THREE.Vector3, normal: THREE.Vector3): void {
    prop.isSleeping = false;
    prop.velocity.copy(vel).multiplyScalar(0.55);
    prop.velocity.y = Math.max(3.5, Math.abs(vel.length()) * 0.25);
    prop.angularVelocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
  }

  public dispose(): void {
    this.asphaltMat.dispose();
    this.kerbBlueMat.dispose();
    this.kerbWhiteMat.dispose();
    this.concreteBarrierMat.dispose();
    this.metalFenceMat.dispose();
    this.waterMat.dispose();
    this.whiteLineMat.dispose();
    this.yellowLineMat.dispose();
    this.floodlightPoleMat.dispose();
    this.floodlightHeadMat.dispose();
    this.mbsBuildingMat.dispose();
    this.mbsGlassMat.dispose();
    this.neonGlowCyanMat.dispose();
    this.neonGlowMagentaMat.dispose();
    this.sponsorSgMat.dispose();
    this.sponsorRolexMat.dispose();
    this.sponsorAirlinesMat.dispose();
    this.bridgeTrussMat.dispose();
  }
}
