"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { onBoost } from "./starfield-bus";
import { StarfieldEngine } from "./starfield-engine";

/**
 * Interaktiver WebGL-Sternenhintergrund hinter allen Seiten.
 * Der statische CSS-Nebel-Fallback liegt immer darunter und bleibt allein
 * sichtbar bei prefers-reduced-motion, fehlendem WebGL oder Context-Loss.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const reducedQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let engine: StarfieldEngine | null = null;
    let cleanups: Array<() => void> = [];

    const teardown = () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups = [];
      engine?.destroy();
      engine = null;
      setActive(false);
    };

    const init = () => {
      if (engine) {
        return;
      }
      let gl: WebGLRenderingContext | null = null;
      try {
        gl = canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: "low-power",
        }) as WebGLRenderingContext | null;
      } catch {
        gl = null;
      }
      if (!gl) {
        return;
      }

      try {
        engine = new StarfieldEngine(gl, canvas);
      } catch {
        engine = null;
        return;
      }

      const currentEngine = engine;

      const resize = () => {
        currentEngine.resize(
          window.innerWidth,
          window.innerHeight,
          window.devicePixelRatio || 1,
        );
      };
      resize();

      const onPointerMove = (event: PointerEvent) => {
        currentEngine.setParallaxTarget(
          (event.clientX / window.innerWidth) * 2 - 1,
          (event.clientY / window.innerHeight) * 2 - 1,
        );
      };
      const onScroll = () => {
        currentEngine.setScroll(window.scrollY);
      };
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          currentEngine.stop();
        } else {
          currentEngine.start();
        }
      };
      const onContextLost = (event: Event) => {
        event.preventDefault();
        teardown();
      };

      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      canvas.addEventListener("webglcontextlost", onContextLost);
      const offBoost = onBoost(() => currentEngine.boost());

      cleanups.push(() => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        offBoost();
      });

      currentEngine.start();
      setActive(true);
    };

    if (!reducedQuery?.matches) {
      init();
    }

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        teardown();
      } else {
        init();
      }
    };
    reducedQuery?.addEventListener?.("change", onReducedMotionChange);

    return () => {
      reducedQuery?.removeEventListener?.("change", onReducedMotionChange);
      teardown();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="starfield-fallback absolute inset-0" />
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-700",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
