import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * WebGL Shader Background — Premium animated gradient
 * Inspired by high-end fintech platforms (Stripe, Linear, Revolut)
 * Uses Three.js for GPU-accelerated fragment shaders
 */
export default function ShaderBackground({ className = "", intensity = 0.6, speed = 0.03 }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;

    // Premium dark finance shader — deep blues, teals, subtle gold accents
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float intensity;

      // Simplex noise approximation
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main(void) {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float t = time * 0.15;

        // Multi-layer noise for organic motion
        float n1 = snoise(uv * 2.0 + t * 0.3) * 0.5;
        float n2 = snoise(uv * 4.0 - t * 0.2) * 0.25;
        float n3 = snoise(uv * 8.0 + t * 0.1) * 0.125;
        float noise = n1 + n2 + n3;

        // Deep navy base → teal → subtle gold highlight
        vec3 deepNavy = vec3(0.02, 0.03, 0.08);
        vec3 darkBlue = vec3(0.04, 0.08, 0.18);
        vec3 teal     = vec3(0.0, 0.25, 0.35);
        vec3 gold     = vec3(0.6, 0.45, 0.1);

        // Gradient from bottom-left to top-right with noise distortion
        float grad = (uv.x * 0.4 + uv.y * 0.6) + noise * 0.3;

        vec3 color = mix(deepNavy, darkBlue, smoothstep(0.0, 0.5, grad));
        color = mix(color, teal, smoothstep(0.4, 0.9, grad) * intensity * 0.5);

        // Subtle gold accent on peaks
        float goldMask = smoothstep(0.6, 0.8, noise + 0.5) * intensity * 0.15;
        color += gold * goldMask;

        // Subtle vignette
        float vignette = 1.0 - length((uv - 0.5) * 1.3);
        color *= smoothstep(0.0, 0.7, vignette);

        // Floating light orbs
        for(int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 orbPos = vec2(
            0.3 + 0.4 * sin(t * 0.5 + fi * 2.094),
            0.3 + 0.4 * cos(t * 0.3 + fi * 2.094)
          );
          float orb = 0.015 / length(uv - orbPos);
          color += teal * orb * intensity * 0.08;
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2() },
      intensity: { value: intensity },
    };

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    scene.add(new THREE.Mesh(geometry, material));

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.resolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    };
    onResize();
    window.addEventListener("resize", onResize);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      uniforms.time.value += speed;
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, geometry, material, animId };

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [intensity, speed]);

  return <div ref={containerRef} className={`absolute inset-0 ${className}`} />;
}
