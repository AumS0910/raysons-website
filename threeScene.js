import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const canvas = document.querySelector("#webgl-canvas");
const hero = document.querySelector(".hero");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobileDevice = () => window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const MOLTEN_STREAM_UV = new THREE.Vector2(0.5, 0.48);
const IMPACT_UV = new THREE.Vector2(0.5, 0.67);
const BUCKET_WORLD = new THREE.Vector3(-0.32, 1.08, 0.85);
const MOLTEN_STREAM_WORLD = new THREE.Vector3(0.05, -0.78, 1.65);
const IMPACT_WORLD = new THREE.Vector3(0.02, -2.12, 2.15);

const MoltenThermalShader = {
  uniforms: {
    uTime: { value: 0 },
    uEnergy: { value: 0.5 },
    uImpact: { value: 0.4 },
    uStreamUv: { value: MOLTEN_STREAM_UV.clone() },
    uImpactUv: { value: IMPACT_UV.clone() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uEnergy;
    uniform float uImpact;
    uniform vec2 uStreamUv;
    uniform vec2 uImpactUv;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float ellipse(vec2 uv, vec2 center, vec2 scale) {
      vec2 p = (uv - center) / scale;
      return smoothstep(1.0, 0.0, dot(p, p));
    }

    void main() {
      float streamBody = ellipse(vUv, uStreamUv, vec2(0.095, 0.34));
      float streamCore = ellipse(vUv, uStreamUv + vec2(0.004, 0.02), vec2(0.038, 0.28));
      float streamEdge = max(streamBody - streamCore * 0.62, 0.0);
      float impactBody = ellipse(vUv, uImpactUv, vec2(0.23, 0.13));
      float impactCore = ellipse(vUv, uImpactUv + vec2(0.0, 0.012), vec2(0.105, 0.055));

      float flow = noise(vec2(vUv.x * 24.0 + sin(vUv.y * 8.0) * 0.8, vUv.y * 14.0 - uTime * 1.25));
      float fine = noise(vec2(vUv.x * 54.0 - uTime * 0.38, vUv.y * 38.0 + uTime * 0.72));
      float pulse = 0.5 + 0.5 * sin((vUv.y * 18.0) - uTime * 2.2 + flow * 2.4);
      float instability = mix(flow, fine, 0.34) * 0.32 + pulse * 0.2;

      float thermal = clamp(streamCore * 0.82 + impactCore * 1.0 + streamBody * 0.35 + impactBody * 0.28 + instability * (streamBody + impactBody), 0.0, 1.0);
      float cooling = clamp(streamEdge * 0.8 + impactBody * 0.22 - impactCore * 0.12, 0.0, 1.0);

      vec3 redEdge = vec3(0.62, 0.08, 0.018);
      vec3 orange = vec3(1.0, 0.32, 0.045);
      vec3 yellow = vec3(1.0, 0.72, 0.2);
      vec3 whiteHot = vec3(1.0, 0.9, 0.62);
      vec3 color = mix(redEdge, orange, smoothstep(0.16, 0.52, thermal));
      color = mix(color, yellow, smoothstep(0.52, 0.82, thermal));
      color = mix(color, whiteHot, smoothstep(0.82, 1.0, thermal));
      color = mix(color, redEdge, cooling * 0.18);

      float alpha = (streamBody * 0.12 + streamCore * 0.17 + impactBody * 0.105 + impactCore * 0.16) * uEnergy;
      alpha += impactCore * uImpact * 0.105;
      alpha *= mix(0.82, 1.08, pulse);
      alpha *= smoothstep(0.08, 0.36, thermal);
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.32));
    }
  `,
};

const ForgeLensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uHeat: { value: 0.45 },
    uImpact: { value: 0.42 },
    uSoftness: { value: 0.18 },
    uExposure: { value: 1 },
    uGrain: { value: 0.018 },
    uDrift: { value: new THREE.Vector2(0, 0) },
    uStreamUv: { value: MOLTEN_STREAM_UV.clone() },
    uImpactUv: { value: IMPACT_UV.clone() },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uHeat;
    uniform float uImpact;
    uniform float uSoftness;
    uniform float uExposure;
    uniform float uGrain;
    uniform vec2 uDrift;
    uniform vec2 uStreamUv;
    uniform vec2 uImpactUv;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float ellipse(vec2 uv, vec2 center, vec2 scale) {
      vec2 p = (uv - center) / scale;
      return smoothstep(1.0, 0.0, dot(p, p));
    }

    vec3 heatZones(vec2 uv) {
      float stream = ellipse(uv, uStreamUv, vec2(0.13, 0.35));
      float impact = ellipse(uv, uImpactUv, vec2(0.27, 0.18));
      float ambient = ellipse(uv, vec2(0.5, 0.58), vec2(0.47, 0.38));
      return vec3(stream, impact, ambient);
    }

    float grain(vec2 uv, float time) {
      vec2 p = uv * uResolution + vec2(time * 17.13, time * -11.71);
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 driftedUv = vUv + uDrift * 0.004;
      vec3 zones = heatZones(driftedUv);
      float mask = max(zones.z * 0.28, max(zones.x * 0.95, zones.y * 0.78));
      float shimmerA = sin(driftedUv.y * 62.0 + uTime * 1.48 + uDrift.x * 2.0);
      float shimmerB = sin((driftedUv.y + driftedUv.x * 0.42) * 106.0 - uTime * 1.08 + uDrift.y * 2.4);
      float lowWave = sin((driftedUv.x - driftedUv.y) * 21.0 + uTime * 0.5 + dot(uDrift, vec2(1.7, -1.1)));
      vec2 streamOffset = vec2(shimmerA * 0.0022, shimmerB * 0.00055) * zones.x * uHeat;
      vec2 impactOffset = vec2(shimmerB * 0.00135 + lowWave * 0.00075, shimmerA * 0.00035) * zones.y * uImpact;
      vec2 ambientOffset = vec2(shimmerA * 0.00055, shimmerB * 0.00018) * zones.z * uHeat;
      vec2 heatOffset = streamOffset + impactOffset + ambientOffset;

      vec2 px = 1.0 / max(uResolution, vec2(1.0));
      float chroma = 0.42 * uSoftness * mask;
      vec4 base = texture2D(tDiffuse, vUv + heatOffset);
      float red = texture2D(tDiffuse, vUv + heatOffset + vec2(px.x * chroma, 0.0)).r;
      float blue = texture2D(tDiffuse, vUv + heatOffset - vec2(px.x * chroma, 0.0)).b;

      vec4 soft = (
        texture2D(tDiffuse, vUv + heatOffset + px * vec2(1.1, 0.0)) +
        texture2D(tDiffuse, vUv + heatOffset - px * vec2(1.1, 0.0)) +
        texture2D(tDiffuse, vUv + heatOffset + px * vec2(0.0, 1.1)) +
        texture2D(tDiffuse, vUv + heatOffset - px * vec2(0.0, 1.1))
      ) * 0.25;

      vec4 color = mix(base, soft, uSoftness * 0.16);
      color.r = mix(color.r, red, 0.11 * chroma);
      color.b = mix(color.b, blue, 0.09 * chroma);
      color.rgb *= vec3(1.025, 0.99, 0.955);
      float g = grain(vUv, uTime) - 0.5;
      color.rgb = color.rgb * uExposure + g * uGrain * color.a;
      color.a *= smoothstep(0.0, 0.08, color.a);
      gl_FragColor = color;
    }
  `,
};

class ForgeHeroAtmosphere {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.stage = canvasEl.closest(".hero__stage") || canvasEl.parentElement;
    this.hero = this.stage?.parentElement?.closest(".hero") || this.stage;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.pointer = new THREE.Vector2();
    this.scrollProgress = 0;
    this.isRunning = true;
    this.isHeroNear = true;
    this.isMobile = isMobileDevice();
    this.useBloom = !this.isMobile;
    this.frameId = null;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 70);
    this.camera.position.set(0, 0.35, 8.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = true;
    if (this.isMobile) this.renderer.setAnimationLoop(null);
    this.scene.fog = new THREE.FogExp2(0x170b05, 0.038);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.animate = this.animate.bind(this);

    this.addLights();
    this.addHaze();
    this.addMoltenThermalOverlay();
    this.addParticles();
    this.addDepthSilhouettes();
    this.addPostProcessing();
    this.bindEvents();
    this.resize();

    if (!prefersReducedMotion) {
      this.animate();
    } else {
      this.renderStatic();
    }
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0x2b160b, 0.85));

    const bucketGlow = new THREE.PointLight(0xff9b4a, 1.4, 11, 2.7);
    bucketGlow.position.copy(BUCKET_WORLD);
    this.scene.add(bucketGlow);
    this.bucketGlow = bucketGlow;

    const pourGlow = new THREE.PointLight(0xff6b16, 7.5, 18, 2.15);
    pourGlow.position.copy(MOLTEN_STREAM_WORLD);
    this.scene.add(pourGlow);
    this.pourGlow = pourGlow;

    const impactGlow = new THREE.PointLight(0xff7a1f, 3.4, 9, 2.6);
    impactGlow.position.copy(IMPACT_WORLD);
    this.scene.add(impactGlow);
    this.impactGlow = impactGlow;

    const bounceLight = new THREE.PointLight(0xd95918, 1.1, 16, 2.8);
    bounceLight.position.set(0, -3.05, -1.6);
    this.scene.add(bounceLight);
    this.bounceLight = bounceLight;

    const rimLight = new THREE.PointLight(0xffc46b, 1.8, 22, 2.4);
    rimLight.position.set(-4.6, 2.1, -3.2);
    this.scene.add(rimLight);
    this.rimLight = rimLight;
  }

  addHaze() {
    this.hazeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.48 },
        uMoltenEnergy: { value: 0.5 },
        uStreamUv: { value: MOLTEN_STREAM_UV.clone() },
        uImpactUv: { value: IMPACT_UV.clone() },
        uColorA: { value: new THREE.Color("#ff5b18") },
        uColorB: { value: new THREE.Color("#ffd08a") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uMoltenEnergy;
        uniform vec2 uStreamUv;
        uniform vec2 uImpactUv;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec2 vUv;

        float softCircle(vec2 uv, vec2 center, vec2 scale) {
          vec2 p = (uv - center) / scale;
          return smoothstep(1.0, 0.08, dot(p, p));
        }

        void main() {
          float drift = sin((vUv.y * 9.0) + uTime * 0.28) * 0.018;
          float furnace = softCircle(vUv + vec2(drift, 0.0), vec2(0.5, 0.66), vec2(0.48, 0.28));
          float upperSmoke = softCircle(vUv - vec2(drift * 0.7, 0.0), vec2(0.48, 0.36), vec2(0.58, 0.45));
          float streamGlow = softCircle(vUv + vec2(drift * 0.45, 0.0), uStreamUv, vec2(0.16, 0.34));
          float impactGlow = softCircle(vUv - vec2(drift * 0.35, 0.0), uImpactUv, vec2(0.28, 0.18));
          float bounce = smoothstep(0.92, 0.38, vUv.y) * smoothstep(0.04, 0.42, vUv.x) * smoothstep(0.96, 0.58, vUv.x);
          float banding = sin((vUv.y + drift) * 34.0 + uTime * 0.55) * 0.035;
          float localHeat = streamGlow * 0.5 + impactGlow * 0.72;
          float alpha = (furnace * 0.58 + upperSmoke * 0.2 + localHeat * uMoltenEnergy + bounce * 0.1 + banding) * uOpacity;
          vec3 color = mix(uColorA, uColorB, furnace * 0.34 + streamGlow * 0.24 + impactGlow * 0.18);
          color += vec3(0.34, 0.105, 0.02) * bounce * uMoltenEnergy;
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.55));
        }
      `,
    });

    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(14, 9, 1, 1), this.hazeMaterial);
    this.haze.position.set(0, -0.35, -4.5);
    this.scene.add(this.haze);
  }

  addMoltenThermalOverlay() {
    this.thermalMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: THREE.UniformsUtils.clone(MoltenThermalShader.uniforms),
      vertexShader: MoltenThermalShader.vertexShader,
      fragmentShader: MoltenThermalShader.fragmentShader,
    });

    this.thermalOverlay = new THREE.Mesh(new THREE.PlaneGeometry(14, 9, 1, 1), this.thermalMaterial);
    this.thermalOverlay.position.set(0, -0.35, -3.85);
    this.scene.add(this.thermalOverlay);
  }

  addParticles() {
    const isSmall = this.isMobile;
    this.particleCount = isSmall ? 220 : 600;
    const positions = new Float32Array(this.particleCount * 3);
    const seeds = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);
    const types = new Float32Array(this.particleCount);
    const velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const type = this.pickParticleType();
      const i3 = i * 3;
      const sourceBias = Math.random();
      const hotSource = sourceBias > 0.68;
      const impactSource = sourceBias > 0.86;
      const spread = type === 0 ? 1.1 : type === 1 ? 5.8 : 4.4;

      positions[i3] = hotSource ? mix(-0.42, 0.42, Math.random()) : (Math.random() - 0.5) * spread;
      positions[i3] += !hotSource && sourceBias > 0.78 ? (Math.random() - 0.5) * 7 : 0;
      positions[i3 + 1] = impactSource ? mix(-2.35, -1.4, Math.random()) : type === 0 ? mix(-2.75, -1.1, Math.random()) : type === 1 ? mix(-1.4, 2.8, Math.random()) : mix(-2.3, 0.8, Math.random());
      positions[i3 + 2] = impactSource ? mix(1.0, 3.2, Math.random()) : type === 0 ? mix(-2.4, 4.2, Math.random()) : type === 1 ? mix(-10.0, 1.5, Math.random()) : mix(-6.8, 3.2, Math.random());

      velocities[i3] = (Math.random() - 0.5) * (type === 0 ? 0.72 : type === 1 ? 0.11 : 0.28);
      velocities[i3 + 1] = type === 0 ? mix(1.4, 3.2, Math.random()) : type === 1 ? mix(0.08, 0.3, Math.random()) : mix(0.32, 0.9, Math.random());
      velocities[i3 + 2] = type === 0 ? mix(-0.34, 0.38, Math.random()) : type === 1 ? mix(-0.05, 0.08, Math.random()) : mix(-0.13, 0.17, Math.random());

      seeds[i] = Math.random() * 1000;
      sizes[i] = type === 0 ? mix(11, 24, Math.random()) : type === 1 ? mix(5, 13, Math.random()) : mix(8, 18, Math.random());
      types[i] = type;
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    this.particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute("aType", new THREE.BufferAttribute(types, 1));
    this.particleGeometry.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));

    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.65) },
        uIntensity: { value: 0.78 },
        uMoltenEnergy: { value: 0.5 },
        uThermalPulse: { value: 0.5 },
        uStoryFocus: { value: 0.65 },
      },
      vertexShader: `
        attribute float aSeed;
        attribute float aSize;
        attribute float aType;
        attribute vec3 aVelocity;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uIntensity;
        uniform float uMoltenEnergy;
        uniform float uThermalPulse;
        uniform float uStoryFocus;
        varying float vType;
        varying float vAlpha;
        varying float vFlicker;
        varying float vHeat;

        void main() {
          float cycle = aType < 0.5 ? 3.0 : aType < 1.5 ? 12.5 : 7.4;
          float age = fract((uTime / cycle) + aSeed);
          vec3 pos = position + aVelocity * age * cycle;
          float spark = 1.0 - step(0.5, aType);
          float ash = step(0.5, aType) * (1.0 - step(1.5, aType));
          float ember = step(1.5, aType);
          float streamHeat = smoothstep(1.45, 0.0, length((pos.xy - vec2(0.04, -0.8)) / vec2(0.72, 1.45)));
          float impactHeat = smoothstep(1.1, 0.0, length((pos.xy - vec2(0.02, -2.05)) / vec2(1.35, 0.72)));
          float heat = clamp(streamHeat * 0.72 + impactHeat, 0.0, 1.0);
          float burst = smoothstep(0.955, 1.0, sin(uTime * 3.7 + aSeed * 19.0) * 0.5 + 0.5) * impactHeat * spark * mix(0.58, 1.18, uThermalPulse) * mix(0.72, 1.24, uStoryFocus);
          pos.x += sin(uTime * 0.42 + aSeed * 7.0 + pos.y * 1.7) * (spark * 0.13 + ash * 0.38 + ember * 0.24);
          pos.x += sin(age * 6.283 + aSeed) * ember * 0.22;
          pos.z += cos(uTime * 0.22 + aSeed * 5.0) * (spark * 0.1 + ash * 0.07 + ember * 0.14);
          pos.y += heat * uMoltenEnergy * age * (spark * 1.15 + ember * 0.5) * mix(0.9, 1.18, uThermalPulse);
          pos.y += burst * age * 1.8;
          pos.y -= age * age * (spark * 1.95 + ash * 0.18 + ember * 0.58);
          pos.y += ash * sin(uTime * 0.18 + aSeed * 4.0) * 0.12;

          float fadeIn = smoothstep(0.0, 0.13, age);
          float fadeOut = 1.0 - smoothstep(spark * 0.55 + ash * 0.78 + ember * 0.68, 1.0, age);
          float depthFade = smoothstep(-10.5, -1.3, pos.z) * (1.0 - smoothstep(3.5, 5.4, pos.z));
          vHeat = heat + burst * 0.8;
          vAlpha = fadeIn * fadeOut * depthFade * uIntensity * (1.0 + vHeat * uMoltenEnergy * mix(0.36, 0.62, uThermalPulse) * mix(0.82, 1.18, uStoryFocus));
          vType = aType;
          vFlicker = 0.76 + sin(uTime * (spark * 16.0 + ember * 9.5 + ash * 2.0) + aSeed * 31.0) * (spark * 0.24 + ember * 0.18 + ash * 0.05);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (6.6 / -mvPosition.z) * mix(0.72, 1.16, vFlicker) * (1.0 + vHeat * 0.18);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vType;
        varying float vAlpha;
        varying float vFlicker;
        varying float vHeat;

        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float core = smoothstep(0.5, 0.0, length(p));
          float hotCore = smoothstep(0.18, 0.0, length(p));
          vec3 spark = mix(vec3(1.0, 0.30, 0.05), vec3(1.0, 0.82, 0.42), hotCore);
          vec3 ash = vec3(0.64, 0.52, 0.40);
          vec3 ember = vec3(1.0, 0.42, 0.10);
          vec3 color = mix(spark, ash, step(0.5, vType));
          color = mix(color, ember, step(1.5, vType));
          color = mix(color, vec3(1.0, 0.76, 0.32), clamp(vHeat * (0.34 + uThermalPulse * 0.16), 0.0, 1.0));
          float typeAlpha = vType < 0.5 ? 1.0 : vType < 1.5 ? 0.26 : 0.58;
          gl_FragColor = vec4(color, core * vAlpha * typeAlpha * vFlicker * (1.0 + vHeat * 0.32));
        }
      `,
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  addDepthSilhouettes() {
    const material = new THREE.MeshBasicMaterial({
      color: 0x120905,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.backPlate = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.8), material);
    this.backPlate.position.set(0, 0.25, -6.8);
    this.backPlate.rotation.z = -0.035;
    this.scene.add(this.backPlate);

    this.bounceMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5a16,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bouncePlate = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.8), this.bounceMaterial);
    this.bouncePlate.position.set(0, -3.08, -2.2);
    this.bouncePlate.rotation.x = -0.18;
    this.scene.add(this.bouncePlate);
  }

  addPostProcessing() {
    this.renderPass = new RenderPass(this.scene, this.camera);

    this.lensPass = new ShaderPass(ForgeLensShader);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    if (this.useBloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.08, 0.25, 0.4);
      this.bloomPass.threshold = 0.91;
      this.bloomPass.strength = 0.08;
      this.bloomPass.radius = 0.22;
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(this.lensPass);
  }

  pickParticleType() {
    const r = Math.random();
    if (r < 0.22) return 0;
    if (r < 0.66) return 1;
    return 2;
  }

  bindEvents() {
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", () => {
      this.isRunning = document.visibilityState === "visible";
      if (!this.isRunning && this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      if (this.isRunning && !prefersReducedMotion && !this.frameId) this.animate();
    });
    this.onScroll();
  }

  onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  onScroll() {
    if (!hero) return;
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    this.scrollProgress = clamp((window.scrollY - hero.offsetTop) / travel);
    const rect = hero.getBoundingClientRect();
    this.isHeroNear = rect.bottom > -120 && rect.top < window.innerHeight + 120;
    if (this.isHeroNear && this.isRunning && !prefersReducedMotion && !this.frameId) this.animate();
  }

  getCinematicState(elapsed) {
    const p = this.scrollProgress;
    const bucketFocus = 1 - smoothstep(0.08, 0.32, p);
    const streamFocus = smoothstep(0.12, 0.4, p) * (1 - smoothstep(0.62, 0.82, p));
    const impactFocus = smoothstep(0.34, 0.58, p) * (1 - smoothstep(0.82, 0.97, p));
    const typeFocus = smoothstep(0.68, 0.98, p);
    const cooldown = smoothstep(0.58, 1, p);
    const breath = 0.5 + 0.5 * Math.sin(elapsed * 0.42 + Math.sin(elapsed * 0.13) * 0.9);
    const slowNoise = 0.5 + 0.5 * Math.sin(elapsed * 0.071 + Math.sin(elapsed * 0.033) * 2.1);
    const fineNoise = 0.5 + 0.5 * Math.sin(elapsed * 1.37 + Math.sin(elapsed * 0.29) * 0.8);
    const surge = smoothstep(0.46, 0.86, breath) * (1 - cooldown * 0.55);
    const calm = smoothstep(0.15, 0.36, breath) * (1 - smoothstep(0.66, 0.96, breath));
    const silence = smoothstep(0.08, 0.28, slowNoise) * (1 - smoothstep(0.48, 0.72, slowNoise)) * (1 - cooldown * 0.45);
    const impactPriority = clamp(impactFocus * 1.35 + streamFocus * 0.22, 0, 1);
    const heatScale = mix(1, 0.58, cooldown);
    const activity = mix(0.82, 1.12, surge) * mix(1, 0.68, cooldown) * mix(1, 0.82, silence);
    const focusX = mix(50, 52, streamFocus * 0.4 + impactFocus * 0.25);
    const focusY = mix(mix(39, 50, streamFocus), 68, impactPriority);

    return {
      activity,
      bucketFocus,
      calm,
      cooldown,
      exposure: mix(0.985, 1.018, breath) * mix(0.993, 1.006, fineNoise) * mix(1, 0.985, silence),
      focusX,
      focusY: mix(focusY, 43, typeFocus * 0.42),
      grain: mix(0.009, 0.016, fineNoise) * mix(1, 0.72, typeFocus),
      heatScale,
      impactFocus,
      impactPriority,
      silence,
      slowNoise,
      streamFocus,
      surge,
      typeFocus,
    };
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.isMobile = isMobileDevice();
    const dpr = this.isMobile ? Math.min(window.devicePixelRatio || 1, 0.95) : Math.min(window.devicePixelRatio || 1, 1.65);

    this.camera.aspect = width / height;
    this.camera.fov = this.isMobile ? 50 : 42;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this.composer) this.composer.setSize(width, height);

    if (this.particleMaterial) this.particleMaterial.uniforms.uPixelRatio.value = dpr;
    if (this.lensPass) this.lensPass.uniforms.uResolution.value.set(width * dpr, height * dpr);
  }

  renderStatic() {
    this.particleMaterial.uniforms.uIntensity.value = 0.38;
    this.hazeMaterial.uniforms.uOpacity.value = 0.34;
    this.hazeMaterial.uniforms.uMoltenEnergy.value = 0.34;
    this.thermalMaterial.uniforms.uEnergy.value = 0.22;
    this.thermalMaterial.uniforms.uImpact.value = 0.18;
    if (this.bloomPass) this.bloomPass.strength = 0.08;
    this.lensPass.uniforms.uHeat.value = 0.18;
    this.lensPass.uniforms.uImpact.value = 0.14;
    this.lensPass.uniforms.uSoftness.value = 0.12;
    this.lensPass.uniforms.uExposure.value = 0.995;
    this.lensPass.uniforms.uGrain.value = 0.007;
    this.lensPass.uniforms.uDrift.value.set(0.08, -0.04);
    this.composer.render();
  }

  animate() {
    if (!this.isRunning) return;
    if (!this.isHeroNear) {
      this.frameId = null;
      return;
    }
    this.frameId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();
    const heroVisibility = 1 - smoothstep(0.72, 1, this.scrollProgress);
    const pourIntensity = 0.42 + Math.sin(this.scrollProgress * Math.PI) * 0.46;
    const heatBreath = 0.5 + 0.5 * Math.sin(elapsed * 0.72 + Math.sin(elapsed * 0.19) * 0.7);
    const impactPulse = 0.5 + 0.5 * Math.sin(elapsed * 1.14 + Math.sin(elapsed * 0.37) * 0.45);
    const thermalPulse = 0.5 + 0.5 * Math.sin(elapsed * 1.65 + Math.sin(elapsed * 0.41) * 1.1);
    const flowPulse = 0.5 + 0.5 * Math.sin(elapsed * 0.47 + this.scrollProgress * 2.0);
    const story = this.getCinematicState(elapsed);
    const moltenEnergy = heroVisibility * mix(0.48, 0.96, pourIntensity) * mix(0.94, 1.08, heatBreath) * story.heatScale * story.activity;
    const impactEnergy = heroVisibility * mix(0.36, 0.82, pourIntensity) * mix(0.9, 1.14, impactPulse) * mix(0.82, 1.22, story.impactPriority) * story.heatScale;
    const materialEnergy = moltenEnergy * mix(0.9, 1.16, thermalPulse);
    const microDriftX = Math.sin(elapsed * 0.13) * 0.032;
    const microDriftY = Math.cos(elapsed * 0.1) * 0.022;
    const analogDriftX = Math.sin(elapsed * 0.047 + Math.sin(elapsed * 0.019) * 2.4);
    const analogDriftY = Math.cos(elapsed * 0.039 + Math.sin(elapsed * 0.023) * 1.7);
    const guidedX = mix(mix(-0.16, 0.03, story.streamFocus), 0.06, story.impactPriority);
    const guidedY = mix(mix(0.62, -0.08, story.streamFocus), -0.42, story.impactPriority);
    const guidedZ = mix(9.15, 8.62, story.impactPriority) + story.typeFocus * 0.18;

this.mouse.x += (this.pointer.x - this.mouse.x) * 0.004;
this.mouse.y += (this.pointer.y - this.mouse.y) * 0.004;

    this.camera.position.x = guidedX + this.mouse.x * 0.08 + microDriftX + analogDriftX * 0.012;
    this.camera.position.y = guidedY - this.mouse.y * 0.055 + microDriftY + analogDriftY * 0.008;
    this.camera.position.z = guidedZ + Math.sin(elapsed * 0.08) * 0.035 + analogDriftY * 0.012;
    this.camera.lookAt(guidedX * 0.28 + this.mouse.x * 0.035, mix(-0.1, -0.48, story.impactPriority) - this.mouse.y * 0.025, 0);

    this.particles.rotation.y = this.mouse.x * 0.035 + Math.sin(elapsed * 0.08) * 0.018;
    this.particles.rotation.x = -this.mouse.y * 0.018;
    this.particleMaterial.uniforms.uTime.value = elapsed;
    this.particleMaterial.uniforms.uIntensity.value = heroVisibility * mix(0.32, 0.7, pourIntensity) * mix(0.9, 1.04, heatBreath) * story.activity * mix(1, 0.78, story.silence);
    this.particleMaterial.uniforms.uMoltenEnergy.value = moltenEnergy;
    this.particleMaterial.uniforms.uThermalPulse.value = mix(thermalPulse, 1, story.impactPriority * 0.28) * mix(0.86, 1.08, story.surge);
    this.particleMaterial.uniforms.uStoryFocus.value = story.impactPriority;

    this.hazeMaterial.uniforms.uTime.value = elapsed;
    this.hazeMaterial.uniforms.uOpacity.value = heroVisibility * mix(0.28, 0.54, pourIntensity) * mix(0.94, 1.05, heatBreath) * mix(1, 0.72, story.cooldown) * mix(1, 0.9, story.silence);
    this.hazeMaterial.uniforms.uMoltenEnergy.value = materialEnergy;
    this.haze.position.x = guidedX * 0.12 + this.mouse.x * 0.1 + analogDriftX * 0.018;
    this.haze.position.y = -0.35 - this.scrollProgress * 0.22 + analogDriftY * 0.012;

    this.thermalMaterial.uniforms.uTime.value = elapsed;
    this.thermalMaterial.uniforms.uEnergy.value = heroVisibility * mix(0.24, 0.66, materialEnergy) * mix(0.82, 1.08, story.streamFocus);
    this.thermalMaterial.uniforms.uImpact.value = heroVisibility * mix(0.16, 0.58, impactEnergy) * mix(0.9, 1.12, flowPulse) * mix(0.9, 1.2, story.impactPriority);
    this.thermalOverlay.position.x = guidedX * 0.02 + this.mouse.x * 0.02 + analogDriftX * 0.008;
    this.thermalOverlay.position.y = -0.35 - this.scrollProgress * 0.04 + analogDriftY * 0.006;

    this.bucketGlow.intensity = heroVisibility * story.bucketFocus * mix(0.55, 1.45, story.surge) * mix(1, 0.84, story.silence);
    this.bucketGlow.position.x = BUCKET_WORLD.x - this.mouse.x * 0.035;
    this.bucketGlow.position.y = BUCKET_WORLD.y + Math.sin(elapsed * 0.22) * 0.025;
    this.pourGlow.intensity = heroVisibility * mix(3.2, 6.85, materialEnergy) * mix(0.9, 1.14, story.streamFocus) * mix(1, 0.9, story.silence);
    this.pourGlow.position.x = MOLTEN_STREAM_WORLD.x + this.mouse.x * 0.06;
    this.pourGlow.position.y = MOLTEN_STREAM_WORLD.y + Math.sin(elapsed * 0.62) * 0.035;
    this.impactGlow.intensity = heroVisibility * mix(0.9, 4.35, impactEnergy) * mix(0.92, 1.12, thermalPulse) * mix(0.92, 1.22, story.impactPriority) * mix(1, 0.88, story.silence);
    this.impactGlow.position.x = IMPACT_WORLD.x + this.mouse.x * 0.045;
    this.impactGlow.position.y = IMPACT_WORLD.y + Math.sin(elapsed * 1.05) * 0.025;
    this.bounceLight.intensity = heroVisibility * mix(0.42, 1.12, moltenEnergy) * mix(1, 0.78, story.cooldown);
    this.rimLight.intensity = heroVisibility * mix(1.04, 1.36, heatBreath) * mix(1, 0.82, story.cooldown);
    this.scene.fog.density = mix(0.033, 0.05, pourIntensity) * heroVisibility * mix(1, 0.78, story.cooldown);

    this.backPlate.position.x = -guidedX * 0.12 - this.mouse.x * 0.1;
    this.backPlate.position.y = 0.25 + this.mouse.y * 0.08;
    this.bounceMaterial.opacity = heroVisibility * mix(0.032, 0.085, moltenEnergy) * mix(1, 0.74, story.cooldown);
    this.bouncePlate.position.x = -guidedX * 0.08 - this.mouse.x * 0.035;

    if (this.bloomPass) {
      this.bloomPass.threshold = mix(0.89, 0.82, impactEnergy * mix(0.85, 1.15, story.impactPriority));
      this.bloomPass.strength = heroVisibility * (mix(0.04, 0.11, materialEnergy) + impactEnergy * 0.04 * mix(0.75, 1.25, story.impactPriority)) * mix(0.96, 1.025, story.slowNoise) * mix(1, 0.86, story.silence);
      this.bloomPass.radius = mix(0.22, 0.36, impactEnergy);
    }
    this.lensPass.uniforms.uTime.value = elapsed;
    this.lensPass.uniforms.uHeat.value = heroVisibility * mix(0.16, 0.5, materialEnergy) * mix(1, 0.74, story.cooldown);
    this.lensPass.uniforms.uImpact.value = heroVisibility * mix(0.1, 0.48, impactEnergy) * mix(0.9, 1.16, story.impactPriority);
    this.lensPass.uniforms.uSoftness.value = heroVisibility * mix(0.11, 0.2, pourIntensity) * mix(1, 0.86, story.cooldown);
    this.lensPass.uniforms.uExposure.value = story.exposure;
    this.lensPass.uniforms.uGrain.value = story.grain;
    this.lensPass.uniforms.uDrift.value.set(analogDriftX, analogDriftY);

    // Use smoothed mouse position for the orange circle
    const mouseXPercent = ((this.mouse.x + 1) / 2) * 100;
    const mouseYPercent = ((this.mouse.y + 1) / 2) * 100;
    this.stage.style.setProperty("--hero-focus-x", `${mouseXPercent.toFixed(1)}%`);
    this.stage.style.setProperty("--hero-focus-y", `${mouseYPercent.toFixed(1)}%`);
    this.stage.style.setProperty("--hero-focus-strength", (0.18 + story.impactPriority * 0.18 + story.typeFocus * 0.08).toFixed(3));

    this.composer.render();
  }
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

if (canvas) {
  new ForgeHeroAtmosphere(canvas);
}
