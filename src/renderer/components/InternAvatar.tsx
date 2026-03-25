/*
 * Path: /Users/ghost/Desktop/aiterminal/src/renderer/components/InternAvatar.tsx
 * Module: renderer/components
 * Purpose: 3D VRM avatar visualizer for interns - displays anime-style avatars with real-time expressions
 * Dependencies: react, three, @pixiv/three-vrm
 * Related: /Users/ghost/Desktop/aiterminal/src/renderer/components/AgentMode.tsx
 * Keywords: vrm, three.js, avatar, anime, intern-visualizer, expressions, 3d-model
 * Last Updated: 2026-03-24
 */

import { useEffect, useRef, useState } from 'react';
import type { AgentEvent } from '../../agent-loop/events';
import { getModelForIntern } from '../vrm-models';
import { VRMModelSelector } from './VRMModelSelector';
import { getPreloadedVRM } from '../vrm-preloader';

// Expression presets from VRM
type VRMExpression = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised' | 'joy' | 'sorrow' | 'fun' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'blink';

// Map agent events to expressions
const EVENT_TO_EXPRESSION: Record<string, VRMExpression> = {
  // Lifecycle events
  'lifecycle:start': 'neutral',
  'lifecycle:end': 'happy',
  'lifecycle:error': 'sad',

  // Tool events
  'tool:start': 'ou', // Thinking/concentrating face
  'tool:end': 'happy',

  // Assistant events (generating output)
  'assistant:delta': 'aa', // Talking/working

  // Handoff events
  'handoff': 'surprised',

  // Error events
  'error': 'angry'
};

// Idle animations when intern is waiting
const IDLE_EXPRESSIONS: VRMExpression[] = ['neutral', 'blink', 'neutral', 'blink'];
const IDLE_INTERVAL = 3000; // Switch idle expression every 3 seconds

interface InternAvatarProps {
  intern: string | null;
  isRunning: boolean;
  events: AgentEvent[];
  onInternSelect?: (intern: string) => void;
  showModelSelector?: boolean;
}

export function InternAvatar({ intern, isRunning, events, onInternSelect, showModelSelector = false }: InternAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const vrmInitializedRef = useRef(false); // Track if VRM is initialized to prevent re-renders
  const [currentExpression, setCurrentExpression] = useState<VRMExpression>('neutral');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Use default model if no intern specified
  const currentModel = getModelForIntern(intern);
  const effectiveIntern = intern || 'mei';

  console.log(`[InternAvatar] Rendering intern=${effectiveIntern}, isRunning=${isRunning}, vrmInitialized=${vrmInitializedRef.current}`);

  // Initialize Three.js scene and load VRM
  useEffect(() => {
    // Prevent re-initialization on re-renders
    if (vrmInitializedRef.current) {
      console.log(`[InternAvatar] ⏭️ Skipping VRM init - already initialized for ${effectiveIntern}`);
      return () => {
        // NOOP - don't cleanup on re-render
      };
    }

    console.log(`[InternAvatar] useEffect triggered for ${effectiveIntern}, containerRef.current =`, containerRef.current);

    // Wait for next tick when ref will be available
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        console.error('[InternAvatar] ❌ containerRef still NULL after setTimeout - ref not set!');
        return;
      }

      console.log(`[InternAvatar] ✅ Container ref available after delay, initializing VRM for ${effectiveIntern}`);

    let cleanup: (() => void) | null = null;

    const initVRM = async () => {
      const container = containerRef.current;
      if (!container) {
        console.error('[InternAvatar] Container ref lost during init!');
        return;
      }

      // Clear previous content
      container.innerHTML = '';

      // CHECK PRELOADER CACHE FIRST — instant display if available!
      console.log(`[InternAvatar] Checking cache for ${effectiveIntern}...`);
      const preloaded = getPreloadedVRM(effectiveIntern);

      // Dynamic import of Three.js (needed in both paths)
      const THREE_module = await import('three');
      const THREE = THREE_module as any;
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

      if (preloaded) {
        console.log(`%c⚡ ${effectiveIntern.toUpperCase()} VRM from cache!`, 'color:#00ff00;font-weight:bold');

        // Extract only the VRM model from cache
        const { vrm: vrmModel, expressionManager, VRMExpressionPresetName } = preloaded;

        // Create FRESH scene/camera/renderer (don't reuse from cache to avoid React DOM conflicts)
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const camera = new THREE.PerspectiveCamera(
          30,
          container.clientWidth / container.clientHeight,
          0.1,
          20
        );
        camera.position.set(0, 1.4, 4);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.4, 0);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.update();

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(2, 3, 5);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x888888, 0.8);
        scene.add(ambientLight);

        const backLight = new THREE.DirectionalLight(0x6688cc, 0.5);
        backLight.position.set(-2, 2, -5);
        scene.add(backLight);

        // Clone the VRM model scene for this instance
        scene.add(vrmModel.scene.clone(true));

        vrmRef.current = {
          vrm: vrmModel,
          expressionManager,
          VRMExpressionPresetName,
          scene,
          camera,
          renderer,
          controls
        };

        vrmInitializedRef.current = true;
        setModelLoaded(true);
        console.log(`%c✅ ${effectiveIntern.toUpperCase()} VRM loaded instantly!`, 'color:#ff66aa;font-weight:bold');

        // Set initial expression
        vrmModel.expressionManager.setValue(VRMExpressionPresetName.Neutral, 1);

        // Animation loop
        const clock = new THREE.Clock();
        let idleTimer = 0;
        let idleIndex = 0;

        const animate = () => {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();

          if (vrmModel) {
            vrmModel.update(delta);

            // Idle breathing animation
            if (vrmModel.humanoid) {
              const breath = Math.sin(clock.elapsedTime * 2) * 0.03;
              vrmModel.humanoid.getNormalizedBoneNode('chest')!.rotation.x = breath;
            }

            // Idle expression cycling
            idleTimer += delta * 1000;
            if (idleTimer > IDLE_INTERVAL && !isRunning) {
              idleTimer = 0;
              idleIndex = (idleIndex + 1) % IDLE_EXPRESSIONS.length;
              const idleExpr = IDLE_EXPRESSIONS[idleIndex];
              // Apply idle expression subtly
              Object.values(VRMExpressionPresetName).forEach((preset: any) => {
                vrmModel.expressionManager.setValue(preset, 0);
              });
              if (idleExpr === 'blink') {
                vrmModel.expressionManager.setValue(VRMExpressionPresetName.Blink, 0.5);
              }
            }
          }

          controls.update();
          renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          // Dispose renderer but let React handle DOM cleanup
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
          renderer.dispose();
        };

        return; // DONE — instant load complete!
      }

      // FALLBACK: Load on-demand if not preloaded
      console.log(`[InternAvatar] No cached VRM for ${effectiveIntern}, loading on-demand...`);

      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } = await import('@pixiv/three-vrm');

      // Scene setup with theme-based background
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e); // Dark blue background

      const camera = new THREE.PerspectiveCamera(
        30,
        container.clientWidth / container.clientHeight,
        0.1,
        20
      );
      camera.position.set(0, 1.4, 4);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.4, 0);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.update();

      // Lighting
      const light = new THREE.DirectionalLight(0xffffff, 1.5);
      light.position.set(2, 3, 5);
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0x888888, 0.8);
      scene.add(ambientLight);

      const backLight = new THREE.DirectionalLight(0x6688cc, 0.5);
      backLight.position.set(-2, 2, -5);
      scene.add(backLight);

      // Load VRM model from config
      const loader = new GLTFLoader();
      loader.crossOrigin = 'anonymous'; // CRITICAL: Set CORS for VRM loading
      loader.register((parser: any) => new VRMLoaderPlugin(parser));

      const vrmUrl = currentModel.url;

      // Timeout: fail fast if VRM doesn't load (likely invalid VRM)
      const timeoutId = setTimeout(() => {
        if (!modelLoaded) {
          console.warn(`[InternAvatar] VRM load timeout/failure for ${effectiveIntern}`);
          setModelError('VRM model could not be loaded. This is usually because the model is missing proper VRM humanoid bone mappings.');
        }
      }, 3000);

      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            vrmUrl,
            resolve,
            (progress: any) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              console.log(`[InternAvatar] Loading VRM for ${effectiveIntern}... ${percent}%`);
            },
            (error: any) => {
              console.error(`[InternAvatar] GLTFLoader error:`, error);
              reject(error);
            }
          );
        });

        const vrmModel = gltf.userData.vrm;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.combineMorphs(vrmModel);

        // Disable frustum culling (CRITICAL for VRM rendering)
        vrmModel.scene.traverse((obj: any) => {
          obj.frustumCulled = false;
        });

        vrmModel.scene.rotation.y = Math.PI; // Face forward
        scene.add(vrmModel.scene);

        vrmRef.current = {
          vrm: vrmModel,
          expressionManager: vrmModel.expressionManager,
          VRMExpressionPresetName,
          scene,
          camera,
          renderer,
          controls
        };

        vrmInitializedRef.current = true;
        setModelLoaded(true);
        console.log(`%c✅ ${effectiveIntern.toUpperCase()} VRM loaded!`, 'color:#ff66aa;font-weight:bold');

        // Set initial expression
        vrmModel.expressionManager.setValue(VRMExpressionPresetName.Neutral, 1);

        // Animation loop
        const clock = new THREE.Clock();
        let idleTimer = 0;
        let idleIndex = 0;

        const animate = () => {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();

          if (vrmModel) {
            vrmModel.update(delta);

            // Idle breathing animation
            if (vrmModel.humanoid) {
              const breath = Math.sin(clock.elapsedTime * 2) * 0.03;
              vrmModel.humanoid.getNormalizedBoneNode('chest')!.rotation.x = breath;
            }

            // Idle expression cycling
            idleTimer += delta * 1000;
            if (idleTimer > IDLE_INTERVAL && !isRunning) {
              idleTimer = 0;
              idleIndex = (idleIndex + 1) % IDLE_EXPRESSIONS.length;
              const idleExpr = IDLE_EXPRESSIONS[idleIndex];
              // Apply idle expression subtly
              Object.values(VRMExpressionPresetName).forEach((preset: any) => {
                vrmModel.expressionManager.setValue(preset, 0);
              });
              if (idleExpr === 'blink') {
                vrmModel.expressionManager.setValue(VRMExpressionPresetName.Blink, 0.5);
              }
            }
          }

          controls.update();
          renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          // Dispose renderer but let React handle DOM cleanup
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
          renderer.dispose();
          clearTimeout(timeoutId);
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load VRM model';
        console.error(`[InternAvatar] Failed to load VRM for ${effectiveIntern}:`, error);
        console.error(`[InternAvatar] URL attempted: ${vrmUrl}`);
        setModelLoaded(false);
        setModelError(errorMessage);
        clearTimeout(timeoutId);
      }
    };

    initVRM();

    return () => {
      if (cleanup) cleanup();
      if (vrmRef.current?.renderer) {
        vrmRef.current.renderer.dispose();
      }
    };

    // End of initVRM scope
    }, 0); // End of setTimeout

    return () => clearTimeout(timer);
  }, [effectiveIntern, currentModel]);

  // Update expression based on latest event
  useEffect(() => {
    if (!vrmRef.current || events.length === 0) return;

    const { expressionManager, VRMExpressionPresetName } = vrmRef.current;
    const latestEvent = events[events.length - 1];

    if (!latestEvent) return;

    // Determine expression from event
    let eventKey = latestEvent.stream;

    // Safely access event data properties
    if (latestEvent.data && typeof latestEvent.data === 'object') {
      const data = latestEvent.data as any;
      if (data.phase) eventKey += `:${data.phase}`;
      else if (data.status) eventKey += `:${data.status}`;
    }

    const expressionName = EVENT_TO_EXPRESSION[eventKey] ||
                           EVENT_TO_EXPRESSION[latestEvent.stream] ||
                           'neutral';

    // Apply expression
    Object.values(VRMExpressionPresetName).forEach((preset: any) => {
      expressionManager.setValue(preset, 0);
    });

    const preset = (VRMExpressionPresetName as any)[expressionName.charAt(0).toUpperCase() + expressionName.slice(1)];
    if (preset) {
      expressionManager.setValue(preset, 0.9);
      setCurrentExpression(expressionName as VRMExpression);
    }

    // Auto-reset to neutral after 3 seconds
    const timer = setTimeout(() => {
      if (vrmRef.current && !isRunning) {
        Object.values(VRMExpressionPresetName).forEach((preset: any) => {
          vrmRef.current.expressionManager.setValue(preset, 0);
        });
        vrmRef.current.expressionManager.setValue(VRMExpressionPresetName.Neutral, 1);
        setCurrentExpression('neutral');
      }
    }, 3000);

    return () => clearTimeout(timer);

  }, [events, isRunning]);

  if (!intern) {
    return (
      <div className="intern-avatar offline">
        <div className="avatar-placeholder">
          <div className="avatar-icon">{currentModel.emoji}</div>
          <p className="avatar-text">{currentModel.displayName} ready</p>
          <p className="avatar-description">{currentModel.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="intern-avatar">
      {/* Header with model info and settings button */}
      <div
        className="avatar-header"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="avatar-info">
          <span className="intern-emoji">{currentModel.emoji}</span>
          <span className="intern-name" style={{ color: currentModel.color }}>
            {currentModel.displayName}
          </span>
        </div>
        <div className="avatar-controls">
          <span className={`status-indicator ${isRunning ? 'running' : 'idle'}`}>
            {isRunning ? '● Working' : '○ Idle'}
          </span>
          {showModelSelector && (
            <button
              className="avatar-settings-btn"
              onClick={() => setShowSelector(true)}
              title="Change Avatar Model"
              aria-label="Change Avatar Model"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="avatar-tooltip" style={{ borderColor: currentModel.color }}>
          <div className="tooltip-content">
            <strong>{currentModel.displayName}</strong>
            <p>{currentModel.description}</p>
            <div className="tooltip-specialties">
              {currentModel.specialties.map(s => (
                <span key={s} className="specialty-tag">{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VRM Canvas */}
      <div
        key={`vrm-canvas-${effectiveIntern}`}
        ref={containerRef}
        className="vrm-canvas-container"
        style={{
          width: '100%',
          height: '300px',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <div className="loading-overlay" style={{
          position: 'absolute',
          inset: 0,
          display: modelLoaded || modelError ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px'
        }}>
          <div className="loading-spinner" />
          <p>Loading {effectiveIntern} model from {currentModel.url.slice(0, 40)}...</p>
        </div>
        {modelError && (
          <div className="loading-overlay error" style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,0,0,0.1)',
            borderRadius: '12px',
            color: '#ff6b6b',
            fontSize: '12px',
            textAlign: 'center',
            padding: '20px'
          }}>
            <p>⚠️ Failed to load 3D model</p>
            <p style={{fontSize: '11px', opacity: 0.7}}>{modelError}</p>
            <p style={{fontSize: '10px', marginTop: '8px'}}>Using emoji fallback instead</p>
          </div>
        )}
      </div>

      {/* Expression Indicator */}
      <div className="expression-indicator">
        <span className="expression-label">Expression:</span>
        <span className="expression-value">{currentExpression}</span>
      </div>

      {/* Model Selector Modal */}
      {showSelector && (
        <VRMModelSelector
          selectedIntern={intern}
          onSelectIntern={(newIntern) => {
            if (onInternSelect) {
              onInternSelect(newIntern);
            }
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
