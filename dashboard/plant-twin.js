// =============================================================================
// SentinelOps AI - Photorealistic 3D Smart Manufacturing Digital Twin
// Multi-Machine Fleet: Conveyors (L1, L2, L3), Furnaces (01, 02, 03),
// Substation MCC (A, B, C), Hydraulic Press (03), & Water Pump (04)
// Real-time Spatial Telemetry & HITL Governance Integration
// =============================================================================

(function() {
  'use strict';

  let scene, camera, renderer, controls;
  let container, canvas;
  let animFrameId = null;
  let isAutoRotate = true;

  // Machine Registry: Maps asset_tag to 3D meshes, beacons, lights, and metadata
  const machines = {};
  const clickableObjects = [];
  const animatedConveyors = []; // Stores { rollers, billets, tag }
  const furnaceMoltenLights = [];

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Animation lerp targets for smooth camera transitions
  let targetCamPos = null;
  let targetLookAt = null;

  // Industrial PBR Color Palette
  const COLORS = {
    bg: 0x05080e,
    floor: 0x0c131f,
    steel: 0x2b3644,
    darkSteel: 0x161c24,
    lightSteel: 0x78909c,
    chrome: 0xb0bec5,
    machineBlue: 0x0277bd,
    machineGreen: 0x2e7d32,
    machineTeal: 0x00838f,
    machineGrey: 0x37474f,
    panelGrey: 0x455a64,
    hazardYellow: 0xffc107,
    hazardBlack: 0x1a1a1a,
    statusNormal: 0x00e676,
    statusWarning: 0xff9100,
    statusAlert: 0xff1744,
    moltenOrange: 0xff3d00,
    transformerTank: 0x1e2836
  };

  // Preset Camera Positions (Spacious, well-framed industrial perspectives)
  const CAM_PRESETS = {
    overview: { pos: new THREE.Vector3(38, 28, 38), lookAt: new THREE.Vector3(0, 1.5, 0) },
    conveyors: { pos: new THREE.Vector3(-8, 18, 28), lookAt: new THREE.Vector3(-18, 2.0, 6) },
    furnaces: { pos: new THREE.Vector3(26, 20, 10), lookAt: new THREE.Vector3(22, 3.5, -14) },
    substation: { pos: new THREE.Vector3(26, 18, 36), lookAt: new THREE.Vector3(22, 2.5, 16) },
    utilities: { pos: new THREE.Vector3(-14, 18, 6), lookAt: new THREE.Vector3(-20, 3.0, -16) },
    // Individual machine framing:
    'CONV-L1': { pos: new THREE.Vector3(-10, 14, 16), lookAt: new THREE.Vector3(-18, 2.0, -4) },
    'CONV-L2': { pos: new THREE.Vector3(-10, 16, 26), lookAt: new THREE.Vector3(-18, 2.5, 6) },
    'CONV-L3': { pos: new THREE.Vector3(-10, 16, 36), lookAt: new THREE.Vector3(-18, 2.0, 16) },
    'FURNACE-01': { pos: new THREE.Vector3(18, 16, 6), lookAt: new THREE.Vector3(10, 3.5, -14) },
    'FURNACE-02': { pos: new THREE.Vector3(30, 16, 6), lookAt: new THREE.Vector3(22, 3.5, -14) },
    'FURNACE-03': { pos: new THREE.Vector3(42, 16, 6), lookAt: new THREE.Vector3(34, 3.5, -14) },
    'MCC-PANEL-A': { pos: new THREE.Vector3(18, 14, 34), lookAt: new THREE.Vector3(10, 2.5, 16) },
    'MCC-PANEL-B': { pos: new THREE.Vector3(30, 14, 34), lookAt: new THREE.Vector3(22, 2.5, 16) },
    'MCC-PANEL-C': { pos: new THREE.Vector3(42, 14, 34), lookAt: new THREE.Vector3(34, 2.5, 16) },
    'HYD-PRESS-03': { pos: new THREE.Vector3(-20, 16, 4), lookAt: new THREE.Vector3(-28, 3.0, -16) },
    'MOTOR-PUMP-04': { pos: new THREE.Vector3(-6, 14, 4), lookAt: new THREE.Vector3(-12, 2.0, -16) }
  };

  // Initialize the 3D Digital Twin
  function initDigitalTwin() {
    container = document.querySelector('.plant-canvas-container');
    canvas = document.getElementById('plant-3d-canvas');
    if (!container || !canvas || typeof THREE === 'undefined') {
      console.warn('Three.js or canvas container not available.');
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 330;

    // 1. Scene with Industrial Fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    scene.fog = new THREE.FogExp2(COLORS.bg, 0.012);

    // 2. Camera (38° FOV for cinematic architectural perspective)
    camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 500);
    camera.position.copy(CAM_PRESETS.overview.pos);

    // 3. Renderer with Filmic HDR Tone Mapping & Soft Shadows
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 6;
    controls.maxDistance = 110;
    controls.enableZoom = false; // Prevent wheel trap; enabled via Ctrl or Fullscreen
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.target.copy(CAM_PRESETS.overview.lookAt);

    // 5. Multi-Point Realistic Industrial Lighting
    setupRealisticLighting();

    // 6. Build High-Fidelity Industrial Environment & Machinery Fleet
    buildHighFidelityFactoryFloor();
    buildMachineryFleet();
    buildStructuralArchitecture();
    buildEnvironmentalProps();

    // 7. Event Listeners & UI Controls
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    setupControlButtons();

    // 8. Start Animation Loop
    animate();

    console.log('✅ SentinelOps AI: Multi-Machine Plant Digital Twin (11 Assets) initialized.');
  }

  // ===========================================================================
  // REALISTIC INDUSTRIAL LIGHTING
  // ===========================================================================
  function setupRealisticLighting() {
    // Hemisphere Light: sky cool blue, ground warm bounce
    const hemiLight = new THREE.HemisphereLight(0x354d6e, 0x141d28, 1.2);
    scene.add(hemiLight);

    // Main Directional Sun / Roof Clerestory Light with Crisp Soft Shadows
    const sunLight = new THREE.DirectionalLight(0xe8f2ff, 1.8);
    sunLight.position.set(35, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 130;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Secondary Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0x23364d, 0.7);
    fillLight.position.set(-35, 25, -25);
    scene.add(fillLight);

    // Overhead High-Bay Workstation Spotlights (Conical industrial fixtures)
    createHighBaySpotlight(-18, 18, 6, 0xd0e8ff, 1.8, 30);    // Rolling Mill Bay
    createHighBaySpotlight(22, 18, -14, 0xffcc80, 2.2, 30);   // Melting Shop Bay
    createHighBaySpotlight(22, 18, 16, 0xe0f7fa, 1.6, 28);    // Substation Bay
    createHighBaySpotlight(-20, 18, -16, 0x80deea, 1.6, 28);  // Utilities & Press Bay
  }

  function createHighBaySpotlight(x, y, z, hexColor, intensity, distance) {
    const spot = new THREE.SpotLight(hexColor, intensity, distance, Math.PI / 3.8, 0.45, 1.5);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z);
    scene.add(spot);
    scene.add(spot.target);

    // Industrial pendant lamp bell housing
    const fixtureGroup = new THREE.Group();
    const bellGeo = new THREE.ConeGeometry(1.0, 0.9, 16);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(x, y, z);
    fixtureGroup.add(bell);

    // Glowing bulb lens
    const lensGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
    const lensMat = new THREE.MeshBasicMaterial({ color: hexColor });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(x, y - 0.42, z);
    fixtureGroup.add(lens);

    // Hanging suspension cable from roof
    const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 6, 8);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(x, y + 3, z);
    fixtureGroup.add(cable);

    scene.add(fixtureGroup);
  }

  // ===========================================================================
  // HIGH-FIDELITY FACTORY FLOOR WITH MARKINGS FOR 4 CLEAR PRODUCTION ZONES
  // ===========================================================================
  function buildHighFidelityFactoryFloor() {
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 1024;
    floorCanvas.height = 1024;
    const ctx = floorCanvas.getContext('2d');

    // 1. Dark Epoxy Concrete Base
    ctx.fillStyle = '#0a101b';
    ctx.fillRect(0, 0, 1024, 1024);

    // Expansion Tile Grid
    ctx.strokeStyle = 'rgba(25, 40, 65, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 1024; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }

    // Zone 1: Rolling Mill Bay (West Bottom, x: 50-460, y: 460-960)
    drawZoneMarkings(ctx, 40, 460, 430, 520, '#00b0ff', 'ZONE 01: ROLLING MILL (CONV L1 • L2 • L3)');

    // Zone 2: Melting Shop Bay (East Top, x: 530-980, y: 40-440)
    drawZoneMarkings(ctx, 530, 40, 450, 400, '#ff6d00', 'ZONE 02: MELTING SHOP (FURNACE 01 • 02 • 03)');

    // Zone 3: Main Substation (East Bottom, x: 530-980, y: 560-960)
    drawZoneMarkings(ctx, 530, 560, 450, 420, '#ffd600', 'ZONE 03: SUBSTATION 380V (MCC A • B • C)');

    // Zone 4: Hydraulic Press & Utilities (West Top, x: 40-470, y: 40-440)
    drawZoneMarkings(ctx, 40, 40, 430, 400, '#00e5ff', 'ZONE 04: HEAVY PRESS & UTILITIES (HYD-PRESS • PUMP)');

    // Green Pedestrian Safety Walkways & Crossings
    ctx.fillStyle = 'rgba(0, 200, 83, 0.12)';
    ctx.fillRect(470, 20, 60, 984);  // North-South Main Spine
    ctx.fillRect(20, 440, 984, 60);  // East-West Central Corridor

    // White dashed walkway boundary lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(470, 20, 60, 984);
    ctx.strokeRect(20, 440, 984, 60);
    ctx.setLineDash([]); // Reset dash

    // Floor Texture & Material
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.ClampToEdgeWrapping;
    floorTexture.wrapT = THREE.ClampToEdgeWrapping;
    floorTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const floorGeo = new THREE.PlaneGeometry(80, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.32,
      metalness: 0.28
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Perimeter Cyber Grid & Rails
    const grid = new THREE.GridHelper(80, 40, 0x00e5ff, 0x121d2d);
    grid.position.y = 0.02;
    scene.add(grid);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x1f2b38, metalness: 0.7, roughness: 0.4 });
    const pX = new THREE.BoxGeometry(80, 1.2, 0.4);
    const pZ = new THREE.BoxGeometry(0.4, 1.2, 60);
    const rN = new THREE.Mesh(pX, railMat); rN.position.set(0, 0.6, -30); scene.add(rN);
    const rS = new THREE.Mesh(pX, railMat); rS.position.set(0, 0.6, 30); scene.add(rS);
    const rW = new THREE.Mesh(pZ, railMat); rW.position.set(-40, 0.6, 0); scene.add(rW);
    const rE = new THREE.Mesh(pZ, railMat); rE.position.set(40, 0.6, 0); scene.add(rE);
  }

  function drawZoneMarkings(ctx, x, y, w, h, borderColor, label) {
    ctx.fillStyle = 'rgba(15, 23, 38, 0.65)';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 10;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    ctx.restore();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(label, x + 20, y + 32);
  }

  // ===========================================================================
  // STRUCTURAL ARCHITECTURE (COLUMNS, ROOF TRUSSES, CRANE)
  // ===========================================================================
  function buildStructuralArchitecture() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, metalness: 0.75, roughness: 0.35 });
    const colGeo = new THREE.BoxGeometry(1.6, 20, 1.6);

    [-34, 34].forEach(cx => {
      [-22, 0, 22].forEach(cz => {
        const col = new THREE.Mesh(colGeo, steelMat);
        col.position.set(cx, 10, cz);
        col.castShadow = true;
        col.receiveShadow = true;
        scene.add(col);

        const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 2.6), steelMat);
        base.position.set(cx, 0.2, cz);
        scene.add(base);
      });
    });

    // Roof Truss Girders
    const trussGroup = new THREE.Group();
    for (let tz of [-22, 0, 22]) {
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(70, 0.8, 0.8), steelMat);
      topBeam.position.set(0, 20, tz);
      trussGroup.add(topBeam);

      const botBeam = new THREE.Mesh(new THREE.BoxGeometry(70, 0.8, 0.8), steelMat);
      botBeam.position.set(0, 18, tz);
      trussGroup.add(botBeam);

      for (let tx = -30; tx <= 30; tx += 6) {
        const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 6), steelMat);
        diag.position.set(tx, 19, tz);
        diag.rotation.z = (tx % 12 === 0) ? 0.6 : -0.6;
        trussGroup.add(diag);
      }
    }
    scene.add(trussGroup);

    // Overhead Crane
    const craneGroup = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: COLORS.hazardYellow, roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x212529, metalness: 0.8, roughness: 0.2 });

    [-1.2, 1.2].forEach(offsetZ => {
      const girder = new THREE.Mesh(new THREE.BoxGeometry(68, 1.8, 0.8), yellowMat);
      girder.position.set(0, 16.5, -2 + offsetZ);
      girder.castShadow = true;
      craneGroup.add(girder);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(68, 0.2, 0.25), darkMat);
      rail.position.set(0, 17.5, -2 + offsetZ);
      craneGroup.add(rail);
    });

    const trolley = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 3.8), darkMat);
    trolley.position.set(-6, 18, -2);
    trolley.castShadow = true;
    craneGroup.add(trolley);

    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 }));
    wire.position.set(-6, 13.5, -2);
    craneGroup.add(wire);

    const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), yellowMat);
    hookBlock.position.set(-6, 9.2, -2);
    craneGroup.add(hookBlock);

    scene.add(craneGroup);
  }

  // ===========================================================================
  // MULTI-MACHINE INDUSTRIAL FLEET BUILDER (11 ASSETS)
  // ===========================================================================
  function buildMachineryFleet() {
    // -------------------------------------------------------------------------
    // BAY 1: ROLLING MILL CONVEYOR FLEET (CONV-L1, CONV-L2, CONV-L3)
    // -------------------------------------------------------------------------
    // CONV-L1: Line 1 Feed Conveyor
    const convL1 = buildDetailedConveyor('CONV-L1', 0x0277bd);
    convL1.position.set(-18, 0, -4);
    scene.add(convL1);
    registerMachine('CONV-L1', 'Rolling Mill Line 1', convL1, new THREE.Vector3(-18, 4.8, -4));

    // CONV-L2: Line 2 Main Heavy Conveyor (Active HIGH Fault)
    const convL2 = buildDetailedConveyor('CONV-L2', 0x00838f);
    convL2.position.set(-18, 0, 6);
    scene.add(convL2);
    registerMachine('CONV-L2', 'Rolling Mill Line 2', convL2, new THREE.Vector3(-18, 4.8, 6));

    // CONV-L3: Line 3 Finishing Conveyor
    const convL3 = buildDetailedConveyor('CONV-L3', 0x2e7d32);
    convL3.position.set(-18, 0, 16);
    scene.add(convL3);
    registerMachine('CONV-L3', 'Rolling Mill Line 3', convL3, new THREE.Vector3(-18, 4.8, 16));

    // -------------------------------------------------------------------------
    // BAY 2: ELECTRIC ARC FURNACE FLEET (FURNACE-01, FURNACE-02, FURNACE-03)
    // -------------------------------------------------------------------------
    // FURNACE-01: Bay A1 (Active MEDIUM Fault - Thermocouple Drift)
    const furnace01 = buildDetailedFurnace('FURNACE-01', 1.0);
    furnace01.position.set(10, 0, -14);
    scene.add(furnace01);
    registerMachine('FURNACE-01', 'Melting Shop Bay A1', furnace01, new THREE.Vector3(10, 7.5, -14));

    // FURNACE-02: Bay A2 (Operational OK)
    const furnace02 = buildDetailedFurnace('FURNACE-02', 1.0);
    furnace02.position.set(22, 0, -14);
    scene.add(furnace02);
    registerMachine('FURNACE-02', 'Melting Shop Bay A2', furnace02, new THREE.Vector3(22, 7.5, -14));

    // FURNACE-03: Bay A3 (Operational OK)
    const furnace03 = buildDetailedFurnace('FURNACE-03', 1.0);
    furnace03.position.set(34, 0, -14);
    scene.add(furnace03);
    registerMachine('FURNACE-03', 'Melting Shop Bay A3', furnace03, new THREE.Vector3(34, 7.5, -14));

    // -------------------------------------------------------------------------
    // BAY 3: SUBSTATION MOTOR CONTROL CENTERS (MCC-PANEL-A, B, C)
    // -------------------------------------------------------------------------
    // MCC-PANEL-A: Feeder Bay A (Active LOW Fault - Busbar Inspection)
    const mccA = buildDetailedSubstation('MCC-PANEL-A');
    mccA.position.set(10, 0, 16);
    scene.add(mccA);
    registerMachine('MCC-PANEL-A', 'Substation Feeder A', mccA, new THREE.Vector3(10, 4.8, 16));

    // MCC-PANEL-B: Feeder Bay B (Operational OK)
    const mccB = buildDetailedSubstation('MCC-PANEL-B');
    mccB.position.set(22, 0, 16);
    scene.add(mccB);
    registerMachine('MCC-PANEL-B', 'Substation Feeder B', mccB, new THREE.Vector3(22, 4.8, 16));

    // MCC-PANEL-C: Feeder Bay C (Operational OK)
    const mccC = buildDetailedSubstation('MCC-PANEL-C');
    mccC.position.set(34, 0, 16);
    scene.add(mccC);
    registerMachine('MCC-PANEL-C', 'Substation Feeder C', mccC, new THREE.Vector3(34, 4.8, 16));

    // -------------------------------------------------------------------------
    // BAY 4: HEAVY PRESS & UTILITIES (HYD-PRESS-03, MOTOR-PUMP-04)
    // -------------------------------------------------------------------------
    // HYD-PRESS-03: 4-Column Hydraulic Forging Press
    const press = buildDetailedHydraulicPress();
    press.position.set(-28, 0, -16);
    scene.add(press);
    registerMachine('HYD-PRESS-03', 'Heavy Forging Press Bay', press, new THREE.Vector3(-28, 7.0, -16));

    // MOTOR-PUMP-04: High-Pressure Water Treatment Pump Skid
    const pump = buildDetailedPumpSkid();
    pump.position.set(-12, 0, -16);
    scene.add(pump);
    registerMachine('MOTOR-PUMP-04', 'Water Treatment Station', pump, new THREE.Vector3(-12, 3.8, -16));
  }

  // ===========================================================================
  // REUSABLE INDUSTRIAL COMPONENT BUILDERS
  // ===========================================================================

  // 1. Conveyor Builder
  function buildDetailedConveyor(tag, motorColor) {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.35 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f141c, roughness: 0.9 });
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0xa0b2c6, metalness: 0.9, roughness: 0.2 });
    const motorMat = new THREE.MeshStandardMaterial({ color: motorColor, metalness: 0.65, roughness: 0.35 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: COLORS.chrome, metalness: 0.95, roughness: 0.1 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: COLORS.hazardYellow, roughness: 0.4 });

    const bed = new THREE.Mesh(new THREE.BoxGeometry(18, 0.85, 3.8), frameMat);
    bed.position.y = 1.7;
    bed.castShadow = true;
    bed.receiveShadow = true;
    group.add(bed);

    [-1.95, 1.95].forEach(sz => {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 0.08), frameMat);
      skirt.position.set(0, 2.25, sz);
      group.add(skirt);
    });

    const belt = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.08, 3.5), beltMat);
    belt.position.y = 2.15;
    group.add(belt);

    // Rollers
    const rollers = [];
    for (let i = -7.5; i <= 7.5; i += 1.6) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.6, 14), rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(i, 2.12, 0);
      roller.castShadow = true;
      group.add(roller);
      rollers.push(roller);
    }

    // Legs
    for (let lx of [-7, 0, 7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 3.8), frameMat);
      leg.position.set(lx, 0.85, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    // Motor & Reducer Box
    const motorGroup = new THREE.Group();
    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.2, 16), motorMat);
    motorBody.rotation.z = Math.PI / 2;
    motorBody.castShadow = true;
    motorGroup.add(motorBody);

    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.35, 16), frameMat);
    cowl.rotation.z = Math.PI / 2;
    cowl.position.x = -1.2;
    motorGroup.add(cowl);

    const gearbox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.4), frameMat);
    gearbox.position.set(1.5, 0, 0);
    gearbox.castShadow = true;
    motorGroup.add(gearbox);

    motorGroup.position.set(-10.2, 1.7, 2.4);
    group.add(motorGroup);

    // Moving Billets
    const billets = [];
    for (let b = 0; b < 2; b++) {
      const billet = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.55, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.9, roughness: 0.25 })
      );
      billet.position.set(-4 + b * 7, 2.48, 0);
      billet.castShadow = true;
      group.add(billet);
      billets.push(billet);
    }

    animatedConveyors.push({ tag, rollers, billets });
    return group;
  }

  // 2. Electric Arc Furnace Builder
  function buildDetailedFurnace(tag, scale) {
    const group = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x21262d, metalness: 0.85, roughness: 0.35 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.2 });
    const electrodeMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.4 });
    const moltenMat = new THREE.MeshBasicMaterial({ color: COLORS.moltenOrange });

    // Raised Base
    const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 10), steelMat);
    platform.position.y = 0.35;
    platform.receiveShadow = true;
    group.add(platform);

    // Crucible Vessel
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.2, 4.6, 28), steelMat);
    vessel.position.y = 2.8;
    vessel.castShadow = true;
    vessel.receiveShadow = true;
    group.add(vessel);

    // Reinforcement Torus Bands
    for (let r of [1.4, 2.6, 3.8]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.15, 12, 28), steelMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = r;
      group.add(band);
    }

    // Slag Charging Door & Glowing Molten Core
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.5), steelMat);
    doorFrame.position.set(0, 2.8, 3.5);
    group.add(doorFrame);

    const moltenCore = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), moltenMat);
    moltenCore.position.set(0, 2.8, 3.77);
    group.add(moltenCore);

    // Internal Molten Flickering Light
    const mLight = new THREE.PointLight(COLORS.moltenOrange, 1.8, 14);
    mLight.position.set(0, 3.2, 2.0);
    group.add(mLight);
    furnaceMoltenLights.push(mLight);

    // Roof Dome & Exhaust Duct
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 1.6, 28), steelMat);
    roof.position.y = 5.6;
    roof.castShadow = true;
    group.add(roof);

    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4.2, 14), steelMat);
    duct.position.set(-2.6, 6.8, -2.0);
    duct.rotation.z = -0.35;
    group.add(duct);

    // 3 Graphite Electrodes
    const elGeo = new THREE.CylinderGeometry(0.32, 0.32, 4.8, 14);
    const busGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.6, 10);
    [[-1.1, -0.7], [1.1, -0.7], [0, 1.1]].forEach(([ex, ez]) => {
      const electrode = new THREE.Mesh(elGeo, electrodeMat);
      electrode.position.set(ex, 6.8, ez);
      electrode.castShadow = true;
      group.add(electrode);

      const bus = new THREE.Mesh(busGeo, copperMat);
      bus.position.set(ex * 1.4, 8.0, ez * 1.4);
      group.add(bus);
    });

    return group;
  }

  // 3. Substation MCC Panel Builder
  function buildDetailedSubstation(tag) {
    const group = new THREE.Group();
    const panelMat = new THREE.MeshStandardMaterial({ color: COLORS.panelGrey, metalness: 0.7, roughness: 0.35 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x303c46, metalness: 0.6, roughness: 0.4 });
    const transMat = new THREE.MeshStandardMaterial({ color: COLORS.transformerTank, metalness: 0.85, roughness: 0.25 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.2 });

    // 3 Cabinet Bays
    for (let i = 0; i < 3; i++) {
      const bayX = (i - 1) * 2.6;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.8, 1.8), panelMat);
      cab.position.set(bayX, 1.9, 0);
      cab.castShadow = true;
      group.add(cab);

      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.4), doorMat);
      door.position.set(bayX, 1.9, 0.91);
      group.add(door);

      // Meter & 3-Phase LEDs
      const meter = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      meter.position.set(bayX - 0.45, 3.0, 0.92);
      group.add(meter);

      [0xff1744, 0xffd600, 0x00e676].forEach((lc, idx) => {
        const led = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), new THREE.MeshBasicMaterial({ color: lc }));
        led.position.set(bayX + 0.1 + idx * 0.22, 3.0, 0.92);
        group.add(led);
      });
    }

    // Overhead Cable Tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, 1.0), new THREE.MeshStandardMaterial({ color: 0x607d8b, metalness: 0.85 }));
    tray.position.set(0, 4.0, 0);
    group.add(tray);

    // Transformer Tank Behind
    const trans = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 3.0), transMat);
    trans.position.set(0, 1.4, -3.0);
    trans.castShadow = true;
    group.add(trans);

    [-1.6, 0, 1.6].forEach(bx => {
      const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.2, 10), bushMat);
      bush.position.set(bx, 3.4, -3.0);
      bush.castShadow = true;
      group.add(bush);
    });

    return group;
  }

  // 4. Hydraulic Press Builder (HYD-PRESS-03)
  function buildDetailedHydraulicPress() {
    const group = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x212b36, metalness: 0.8, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.1 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: COLORS.hazardYellow, roughness: 0.4 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe65100, metalness: 0.6, roughness: 0.4 });

    // Bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 6), steelMat);
    bed.position.y = 0.6;
    bed.castShadow = true;
    bed.receiveShadow = true;
    group.add(bed);

    // 4 Columns
    const colGeo = new THREE.CylinderGeometry(0.35, 0.35, 8.5, 16);
    [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, chromeMat);
      col.position.set(cx, 4.8, cz);
      col.castShadow = true;
      group.add(col);
    });

    // Top Crown
    const crown = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 6.2), yellowMat);
    crown.position.y = 9.2;
    crown.castShadow = true;
    group.add(crown);

    // Main Hydraulic Cylinder
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.2, 20), orangeMat);
    cyl.position.y = 11.2;
    cyl.castShadow = true;
    group.add(cyl);

    // Moving Slide Ram
    const ram = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.2, 4.6), steelMat);
    ram.position.y = 5.2;
    ram.castShadow = true;
    group.add(ram);

    return group;
  }

  // 5. Water Treatment Pump Skid Builder (MOTOR-PUMP-04)
  function buildDetailedPumpSkid() {
    const group = new THREE.Group();
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.35 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: COLORS.machineTeal, metalness: 0.65, roughness: 0.35 });
    const motorMat = new THREE.MeshStandardMaterial({ color: COLORS.machineGreen, metalness: 0.65, roughness: 0.35 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.85, roughness: 0.25 });

    const skid = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 3.6), skidMat);
    skid.position.y = 0.25;
    skid.castShadow = true;
    skid.receiveShadow = true;
    group.add(skid);

    // Centrifugal Pump Casing
    const volute = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 20), pumpMat);
    volute.rotation.z = Math.PI / 2;
    volute.position.set(-1.4, 1.6, 0);
    volute.castShadow = true;
    group.add(volute);

    const pipeIn = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 14), pipeMat);
    pipeIn.rotation.z = Math.PI / 2;
    pipeIn.position.set(-2.6, 1.6, 0);
    group.add(pipeIn);

    const pipeOut = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.6, 14), pipeMat);
    pipeOut.position.set(-1.4, 2.7, 0);
    group.add(pipeOut);

    // Drive Motor
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.4, 16), motorMat);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(1.4, 1.6, 0);
    motor.castShadow = true;
    group.add(motor);

    return group;
  }

  // ===========================================================================
  // REALISTIC ENVIRONMENTAL PROPS (PALLETS, BARRELS, TOOL CHESTS)
  // ===========================================================================
  function buildEnvironmentalProps() {
    const propGroup = new THREE.Group();

    // 1. Wooden Euro-Pallet with Staged Machinery Spare Parts
    const palletMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 2.4), palletMat);
    pallet.position.set(-6, 0.18, 24);
    pallet.receiveShadow = true;
    propGroup.add(pallet);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.7 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.2), boxMat);
    b1.position.set(-6.5, 0.8, 24);
    b1.castShadow = true;
    propGroup.add(b1);

    // 2. Heavy 200L Industrial Oil / Coolant Drums
    const drumBlueMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, metalness: 0.7, roughness: 0.3 });
    const drumYellowMat = new THREE.MeshStandardMaterial({ color: COLORS.hazardYellow, metalness: 0.6, roughness: 0.35 });
    const drumGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.8, 16);

    const d1 = new THREE.Mesh(drumGeo, drumBlueMat);
    d1.position.set(-34, 0.9, 22);
    d1.castShadow = true;
    propGroup.add(d1);

    const d2 = new THREE.Mesh(drumGeo, drumYellowMat);
    d2.position.set(-32.5, 0.9, 23.5);
    d2.castShadow = true;
    propGroup.add(d2);

    // 3. Mobile Red Technician Tool Chest
    const toolChestMat = new THREE.MeshStandardMaterial({ color: 0xc62828, metalness: 0.7, roughness: 0.35 });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.0), toolChestMat);
    chest.position.set(-18, 0.9, -10);
    chest.castShadow = true;
    propGroup.add(chest);

    scene.add(propGroup);
  }

  // ===========================================================================
  // MACHINE REGISTRATION & BEACON TELEMETRY SYSTEM
  // ===========================================================================
  function registerMachine(assetTag, lineArea, modelGroup, beaconPos) {
    // 1. Floating Holographic Beacon Octahedron
    const beaconGeo = new THREE.OctahedronGeometry(0.65, 0);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: COLORS.statusNormal,
      emissive: COLORS.statusNormal,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.copy(beaconPos);
    scene.add(beacon);

    // 2. Telemetry Beacon Light
    const pointLight = new THREE.PointLight(COLORS.statusNormal, 1.4, 12);
    pointLight.position.copy(beaconPos);
    scene.add(pointLight);

    // 3. Ground Alert Pulsing Ring
    const ringGeo = new THREE.RingGeometry(3.2, 3.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.statusNormal,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    const alertRing = new THREE.Mesh(ringGeo, ringMat);
    alertRing.rotation.x = -Math.PI / 2;
    alertRing.position.set(beaconPos.x, 0.09, beaconPos.z);
    scene.add(alertRing);

    // 4. Billboard Tag Sprite
    const labelSprite = createBillboardText(assetTag, beaconPos.x, beaconPos.y + 1.1, beaconPos.z, 0x00e5ff, 0.6);

    // Store in clickable items for Raycasting
    modelGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { assetTag, lineArea };
        clickableObjects.push(child);
      }
    });
    beacon.userData = { assetTag, lineArea };
    clickableObjects.push(beacon);

    machines[assetTag] = {
      assetTag,
      lineArea,
      modelGroup,
      beacon,
      beaconPos: beaconPos.clone(),
      pointLight,
      alertRing,
      labelSprite,
      status: 'NORMAL',
      severity: null,
      activeFault: null
    };
  }

  function createBillboardText(text, x, y, z, hexColor, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(6, 13, 23, 0.88)';
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#' + hexColor.toString(16).padStart(6, '0');
    ctx.lineWidth = 3;
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.stroke();

    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(4 * scale, 1 * scale, 1);
    scene.add(sprite);
    return sprite;
  }

  // ===========================================================================
  // REAL-TIME TELEMETRY DATA SYNCHRONIZATION
  // ===========================================================================
  function updateFaultStatus(faults) {
    if (!faults || !Array.isArray(faults)) return;

    // Reset all machines to NORMAL first
    Object.keys(machines).forEach(tag => {
      machines[tag].status = 'NORMAL';
      machines[tag].severity = null;
      machines[tag].activeFault = null;
    });

    // Map open faults to machines
    faults.forEach(f => {
      const tag = f.asset_tag;
      if (machines[tag] && f.status === 'terbuka') {
        machines[tag].activeFault = f;
        const sev = (f.severity || 'MEDIUM').toUpperCase();
        machines[tag].severity = sev;

        if (sev === 'CRITICAL' || sev === 'HIGH') {
          machines[tag].status = 'ALERT';
        } else {
          machines[tag].status = 'WARNING';
        }
      }
    });

    // Apply 3D visual changes
    let alertCount = 0;
    Object.values(machines).forEach(m => {
      if (m.status === 'ALERT') {
        alertCount++;
        m.beacon.material.color.setHex(COLORS.statusAlert);
        m.beacon.material.emissive.setHex(COLORS.statusAlert);
        m.beacon.material.emissiveIntensity = 1.0;
        m.pointLight.color.setHex(COLORS.statusAlert);
        m.pointLight.intensity = 2.4;
        m.alertRing.material.color.setHex(COLORS.statusAlert);
        m.alertRing.material.opacity = 0.8;
      } else if (m.status === 'WARNING') {
        alertCount++;
        m.beacon.material.color.setHex(COLORS.statusWarning);
        m.beacon.material.emissive.setHex(COLORS.statusWarning);
        m.beacon.material.emissiveIntensity = 0.8;
        m.pointLight.color.setHex(COLORS.statusWarning);
        m.pointLight.intensity = 1.8;
        m.alertRing.material.color.setHex(COLORS.statusWarning);
        m.alertRing.material.opacity = 0.6;
      } else {
        // NORMAL
        m.beacon.material.color.setHex(COLORS.statusNormal);
        m.beacon.material.emissive.setHex(COLORS.statusNormal);
        m.beacon.material.emissiveIntensity = 0.4;
        m.pointLight.color.setHex(COLORS.statusNormal);
        m.pointLight.intensity = 1.0;
        m.alertRing.material.opacity = 0.0;
      }
    });

    // Update Floating Telemetry HUD Chips
    updateHudChips(alertCount);
  }

  function updateHudChips(alertCount) {
    const chipConfigs = [
      { tag: 'CONV-L2', dotId: 'dot-conv-l2', subId: 'sub-conv-l2', area: 'Rolling Mill L2' },
      { tag: 'FURNACE-01', dotId: 'dot-furnace-01', subId: 'sub-furnace-01', area: 'Melting Bay 01' },
      { tag: 'MCC-PANEL-A', dotId: 'dot-mcc-panel-a', subId: 'sub-mcc-panel-a', area: 'Substation A' }
    ];

    chipConfigs.forEach(c => {
      const m = machines[c.tag];
      const dot = document.getElementById(c.dotId);
      const sub = document.getElementById(c.subId);
      if (!m || !dot || !sub) return;

      if (m.status === 'ALERT') {
        dot.className = 'chip-status-dot pulse red';
        sub.className = 'chip-sub alert';
        sub.textContent = `${c.area} • ${m.severity || 'HIGH'} FAULT`;
      } else if (m.status === 'WARNING') {
        dot.className = 'chip-status-dot yellow';
        sub.className = 'chip-sub warning';
        sub.textContent = `${c.area} • ${m.severity || 'MEDIUM'}`;
      } else {
        dot.className = 'chip-status-dot green';
        sub.className = 'chip-sub';
        sub.textContent = `${c.area} • NORMAL`;
      }
    });

    // Update Fleet Summary
    const subFleet = document.getElementById('sub-fleet');
    const total = Object.keys(machines).length || 11;
    const normal = total - (alertCount || 0);
    if (subFleet) {
      subFleet.textContent = `${normal} Normal • ${alertCount || 0} Perhatian`;
    }
  }

  // ===========================================================================
  // INTERACTION: RAYCASTING & HUD POPUP
  // ===========================================================================
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const assetTag = hit.userData?.assetTag;
      if (assetTag && machines[assetTag]) {
        selectMachine(assetTag);
      }
    }
  }

  function selectMachine(assetTag) {
    const m = machines[assetTag];
    if (!m) return;

    // Smooth camera glide to machine view
    if (CAM_PRESETS[assetTag]) {
      flyCameraTo(CAM_PRESETS[assetTag].pos, CAM_PRESETS[assetTag].lookAt);
    } else {
      const targetPos = m.beaconPos.clone().add(new THREE.Vector3(14, 14, 18));
      const lookTarget = new THREE.Vector3(m.beaconPos.x, 2.5, m.beaconPos.z);
      flyCameraTo(targetPos, lookTarget);
    }

    // Show 3D HUD
    showMachineHud(m);

    // Highlight row in equipment faults table if present
    highlightFaultTableRow(assetTag);
  }

  function showMachineHud(m) {
    const hud = document.getElementById('plant-hud');
    if (!hud) return;

    const tagEl = document.getElementById('hud-asset-tag');
    const badgeEl = document.getElementById('hud-severity-badge');
    const detailsEl = document.getElementById('hud-details');
    const areaEl = document.getElementById('hud-line-area');

    tagEl.textContent = m.assetTag;
    areaEl.textContent = m.lineArea;

    if (m.status === 'ALERT' || m.status === 'WARNING') {
      badgeEl.textContent = `${m.severity || 'ALERT'} FAULT`;
      badgeEl.className = `badge ${m.status === 'ALERT' ? 'badge-danger' : 'badge-warning'}`;
      detailsEl.textContent = m.activeFault ? m.activeFault.deskripsi : 'Kerusakan mesin sedang aktif dan membutuhkan penanganan.';
    } else {
      badgeEl.textContent = 'OPERATIONAL (OK)';
      badgeEl.className = 'badge badge-success';
      detailsEl.textContent = 'Semua parameter operasional mesin dalam toleransi aman normal.';
    }

    hud.classList.remove('hidden');
  }

  function highlightFaultTableRow(assetTag) {
    const rows = document.querySelectorAll('#tbody-faults tr');
    rows.forEach(r => {
      r.classList.remove('row-highlight');
      if (r.textContent.includes(assetTag)) {
        r.classList.add('row-highlight');
        r.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function flyCameraTo(pos, lookAt) {
    targetCamPos = pos.clone();
    targetLookAt = lookAt.clone();
    controls.autoRotate = false;
    updateSpinButtonUI(false);
  }

  function setupControlButtons() {
    // Camera Presets
    document.querySelectorAll('.btn-camera').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const camKey = e.currentTarget.getAttribute('data-cam');
        if (CAM_PRESETS[camKey]) {
          flyCameraTo(CAM_PRESETS[camKey].pos, CAM_PRESETS[camKey].lookAt);
        }
      });
    });

    // Auto-Rotate Toggle
    const btnSpin = document.getElementById('btn-toggle-spin');
    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        isAutoRotate = !isAutoRotate;
        controls.autoRotate = isAutoRotate;
        updateSpinButtonUI(isAutoRotate);
      });
    }

    // Zoom Buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      camera.position.lerp(controls.target, 0.2);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.addScaledVector(dir, 5);
    });

    // Height Preset Toggle Button
    const btnHeight = document.getElementById('btn-toggle-height');
    if (btnHeight && container) {
      btnHeight.addEventListener('click', () => {
        const curHeight = container.style.height;
        if (!curHeight || curHeight.includes('clamp')) {
          container.style.height = '460px';
          btnHeight.textContent = '↕ Height: Large (460px)';
          localStorage.setItem('sentinelops_custom_twin_height', '460px');
        } else if (curHeight === '460px') {
          container.style.height = '280px';
          btnHeight.textContent = '↕ Height: Compact (280px)';
          localStorage.setItem('sentinelops_custom_twin_height', '280px');
        } else {
          container.style.height = '';
          btnHeight.textContent = '↕ Height: Auto';
          localStorage.removeItem('sentinelops_custom_twin_height');
        }
        onWindowResize();
      });

      const savedH = localStorage.getItem('sentinelops_custom_twin_height');
      if (savedH) {
        container.style.height = savedH;
        if (savedH === '460px') btnHeight.textContent = '↕ Height: Large (460px)';
        else if (savedH === '280px') btnHeight.textContent = '↕ Height: Compact (280px)';
        else btnHeight.textContent = `↕ Height: ${savedH}`;
      }
    }

    // Draggable Bottom Border Handle
    const resizeHandle = document.getElementById('plant-resize-handle');
    if (resizeHandle && container) {
      let isDragging = false;
      let startY = 0;
      let startH = 0;

      resizeHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startH = container.clientHeight;
        resizeHandle.classList.add('active');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.clientY - startY;
        const newH = Math.max(220, Math.min(720, startH + delta));
        container.style.height = `${newH}px`;
        if (btnHeight) btnHeight.textContent = `↕ Height: ${newH}px`;
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          resizeHandle.classList.remove('active');
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          localStorage.setItem('sentinelops_custom_twin_height', container.style.height);
          onWindowResize();
        }
      });
    }

    // Fullscreen / Maximize Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen-twin');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        const panel = document.getElementById('panel-3d-plant');
        if (!panel) return;
        const isFull = panel.classList.toggle('fullscreen');
        btnFullscreen.textContent = isFull ? '✕ Exit' : '⛶ Maximize';
        controls.enableZoom = isFull;
        onWindowResize();
        requestAnimationFrame(onWindowResize);
      });
    }

    // Escape Key to Exit Fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('panel-3d-plant');
        if (panel && panel.classList.contains('fullscreen')) {
          panel.classList.remove('fullscreen');
          if (btnFullscreen) btnFullscreen.textContent = '⛶ Maximize';
          controls.enableZoom = false;
          onWindowResize();
          requestAnimationFrame(onWindowResize);
        }
      }
    });

    // Auto-Resize with ResizeObserver
    if (window.ResizeObserver && container) {
      const ro = new ResizeObserver(() => {
        onWindowResize();
      });
      ro.observe(container);
    }

    // Collapse / Minimize Accordion Toggle
    const btnCollapse = document.getElementById('btn-collapse-twin');
    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => {
        const panel = document.getElementById('panel-3d-plant');
        if (!panel) return;
        const isCollapsed = panel.classList.toggle('collapsed');
        btnCollapse.textContent = isCollapsed ? '▴ Expand 3D' : '▾ Minimize';
        localStorage.setItem('sentinelops_3d_collapsed', isCollapsed ? 'true' : 'false');
        if (!isCollapsed) setTimeout(onWindowResize, 50);
      });

      if (localStorage.getItem('sentinelops_3d_collapsed') === 'true') {
        const panel = document.getElementById('panel-3d-plant');
        if (panel) {
          panel.classList.add('collapsed');
          btnCollapse.textContent = '▴ Expand 3D';
        }
      }
    }

    // Smart Wheel Listener
    canvas.addEventListener('wheel', (e) => {
      const isFullscreen = document.getElementById('panel-3d-plant')?.classList.contains('fullscreen');
      if (isFullscreen || e.ctrlKey) {
        controls.enableZoom = true;
      } else {
        controls.enableZoom = false;
      }
    }, { passive: true });

    // HUD Telemetry Chips Click to Focus Machine
    document.querySelectorAll('.hud-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const assetTag = e.currentTarget.getAttribute('data-asset');
        if (assetTag && machines[assetTag]) {
          selectMachine(assetTag);
        }
      });
    });

    // Close HUD Button
    const btnCloseHud = document.getElementById('btn-close-hud');
    if (btnCloseHud) {
      btnCloseHud.addEventListener('click', () => {
        const hud = document.getElementById('plant-hud');
        if (hud) hud.classList.add('hidden');
      });
    }
  }

  function updateSpinButtonUI(active) {
    const btn = document.getElementById('btn-toggle-spin');
    if (btn) {
      btn.textContent = active ? '🔄 Auto-Rotate: ON' : '⏸️ Auto-Rotate: OFF';
      btn.classList.toggle('active', active);
    }
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ===========================================================================
  // MAIN ANIMATION LOOP
  // ===========================================================================
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // 1. Smooth Camera Interpolation
    if (targetCamPos && targetLookAt) {
      camera.position.lerp(targetCamPos, 0.05);
      controls.target.lerp(targetLookAt, 0.05);
      if (camera.position.distanceTo(targetCamPos) < 0.1) {
        targetCamPos = null;
        targetLookAt = null;
      }
    }

    // 2. Animate Conveyor Rollers & Moving Steel Billets
    animatedConveyors.forEach(c => {
      const isOperational = machines[c.tag]?.status === 'NORMAL';
      if (isOperational) {
        c.rollers.forEach(r => {
          r.rotation.y += 0.08;
        });
        c.billets.forEach(wp => {
          wp.position.x += 0.04;
          if (wp.position.x > 7.5) {
            wp.position.x = -7.5; // Loop back
          }
        });
      }
    });

    // 3. Furnace Molten Core Thermal Flicker
    furnaceMoltenLights.forEach((fl, idx) => {
      fl.intensity = 1.8 + Math.sin(time * 6 + idx * 1.5) * 0.4 + Math.sin(time * 11) * 0.2;
    });

    // 4. Animate Holographic Beacons & Alert Rings
    Object.values(machines).forEach(m => {
      m.beacon.rotation.y += 0.02;
      m.beacon.position.y = m.beaconPos.y + Math.sin(time * 3) * 0.18;

      if (m.status === 'ALERT' || m.status === 'WARNING') {
        const pulse = (Math.sin(time * 5) + 1) * 0.5;
        const scale = 1.0 + pulse * 0.3;
        m.alertRing.scale.set(scale, scale, 1);
        m.alertRing.material.opacity = 0.4 + pulse * 0.6;
      }
    });

    controls.update();
    renderer.render(scene, camera);
  }

  // Expose Global API for Dashboard Integration
  window.PlantDigitalTwin = {
    init: initDigitalTwin,
    updateFaultStatus: updateFaultStatus,
    selectMachine: selectMachine
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDigitalTwin);
  } else {
    initDigitalTwin();
  }
})();
