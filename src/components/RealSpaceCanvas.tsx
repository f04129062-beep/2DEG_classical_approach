import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationParams, TrajectoryPoint, PhysicsDerived, ParticleState } from '../types/physics';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Eye } from 'lucide-react';
import { MathView } from './MathView';

interface RealSpaceCanvasProps {
  params: SimulationParams;
  derived: PhysicsDerived;
  points: TrajectoryPoint[];
  beamParticles?: ParticleState[];
  currentIdx: number;
  onUpdateParams: (newParams: Partial<SimulationParams>) => void;
  showFieldGradient: boolean;
  setShowFieldGradient: (v: boolean) => void;
  showTurningLines: boolean;
  setShowTurningLines: (v: boolean) => void;
  showVelocityVector: boolean;
  setShowVelocityVector: (v: boolean) => void;
  isMultiBeam: boolean;
}

export const RealSpaceCanvas: React.FC<RealSpaceCanvasProps> = ({
  params,
  derived,
  points,
  beamParticles,
  currentIdx,
  onUpdateParams,
  showFieldGradient,
  setShowFieldGradient,
  showTurningLines,
  setShowTurningLines,
  showVelocityVector,
  setShowVelocityVector,
  isMultiBeam,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan and zoom camera state in nm
  const [zoom, setZoom] = useState<number>(2.2); // pixels per nm
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // in nm (center offset)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover coordinates
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Dragging initial position or aim vector
  const [isDraggingInitPos, setIsDraggingInitPos] = useState(false);
  const [isDraggingAim, setIsDraggingAim] = useState(false);

  // Reset view to fit trajectory
  const handleResetView = useCallback(() => {
    if (points.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(2.2);
      return;
    }
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const spanX = Math.max(120, maxX - minX);
    const spanY = Math.max(120, maxY - minY);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const targetZoom = Math.min((width * 0.75) / spanX, (height * 0.75) / spanY, 4.0);
    setZoom(Math.max(0.6, Math.min(targetZoom, 5.0)));
    setPan({ x: midX, y: midY });
  }, [points]);

  // Coordinate transforms
  const toScreenX = (nmX: number, width: number) => {
    return width / 2 + (nmX - pan.x) * zoom;
  };
  const toScreenY = (nmY: number, height: number) => {
    return height / 2 - (nmY - pan.y) * zoom; // inverted y for physics coordinate system
  };
  const toWorldX = (screenX: number, width: number) => {
    return pan.x + (screenX - width / 2) / zoom;
  };
  const toWorldY = (screenY: number, height: number) => {
    return pan.y - (screenY - height / 2) / zoom;
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Magnetic Field Gradient background if enabled
    if (showFieldGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      const worldLeft = toWorldX(0, width);
      const worldRight = toWorldX(width, width);
      const maxRange = Math.max(Math.abs(worldLeft), Math.abs(worldRight), params.L * 1.5);

      // Color representation:
      // x < 0: B_z < 0 (pointing in -z, into screen, cool cyan/blue #0f2744)
      // x = 0: B_z = 0 (neutral dark #080d1a)
      // x > 0: B_z > 0 (pointing in +z, out of screen, warm amber/rust #382412)
      const zeroScreen = toScreenX(0, width);
      const zeroClamped = Math.max(0, Math.min(width, zeroScreen));
      const zeroRatio = zeroClamped / width;

      // Draw subtle background strips
      const leftCol = 'rgba(14, 52, 90, 0.45)';
      const zeroCol = 'rgba(8, 14, 26, 0.2)';
      const rightCol = 'rgba(92, 45, 12, 0.45)';

      if (zeroRatio > 0 && zeroRatio < 1) {
        grad.addColorStop(0, leftCol);
        grad.addColorStop(Math.max(0, zeroRatio - 0.05), 'rgba(14, 38, 70, 0.25)');
        grad.addColorStop(zeroRatio, zeroCol);
        grad.addColorStop(Math.min(1, zeroRatio + 0.05), 'rgba(70, 32, 14, 0.25)');
        grad.addColorStop(1, rightCol);
      } else if (zeroRatio <= 0) {
        grad.addColorStop(0, zeroCol);
        grad.addColorStop(1, rightCol);
      } else {
        grad.addColorStop(0, leftCol);
        grad.addColorStop(1, zeroCol);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Field Direction Vector Glyphs: (x) for B_z < 0, (.) for B_z > 0
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const stepX = Math.max(40, 40 * (zoom / 2));
      for (let sx = stepX / 2; sx < width; sx += stepX) {
        const wx = toWorldX(sx, width);
        const bVal = (params.B0 * wx) / params.L;
        if (Math.abs(bVal) > 0.05) {
          ctx.fillStyle = bVal < 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 146, 60, 0.15)';
          const symbol = bVal < 0 ? '⊗' : '⊙';
          for (let sy = 30; sy < height; sy += 60) {
            ctx.fillText(symbol, sx, sy);
          }
        }
      }
    }

    // 2. Draw Grid & Axes
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';

    // Dynamic grid spacing based on zoom
    let gridStepNm = 20;
    if (zoom < 0.8) gridStepNm = 100;
    else if (zoom < 1.5) gridStepNm = 50;
    else if (zoom > 3.5) gridStepNm = 10;

    const startXNm = Math.floor(toWorldX(0, width) / gridStepNm) * gridStepNm;
    const endXNm = Math.ceil(toWorldX(width, width) / gridStepNm) * gridStepNm;
    const startYNm = Math.floor(toWorldY(height, height) / gridStepNm) * gridStepNm;
    const endYNm = Math.ceil(toWorldY(0, height) / gridStepNm) * gridStepNm;

    ctx.beginPath();
    for (let gx = startXNm; gx <= endXNm; gx += gridStepNm) {
      const sx = toScreenX(gx, width);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let gy = startYNm; gy <= endYNm; gy += gridStepNm) {
      const sy = toScreenY(gy, height);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // Zero-field line x = 0 (Crucial interface line)
    const zeroX = toScreenX(0, width);
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zero y line
    const zeroY = toScreenY(0, height);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // Scale numbers on axes
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let gx = startXNm; gx <= endXNm; gx += gridStepNm) {
      if (gx === 0) continue;
      const sx = toScreenX(gx, width);
      ctx.fillText(`${gx}nm`, sx, Math.min(height - 8, Math.max(16, zeroY + 14)));
    }
    ctx.textAlign = 'right';
    for (let gy = startYNm; gy <= endYNm; gy += gridStepNm) {
      if (gy === 0) continue;
      const sy = toScreenY(gy, height);
      ctx.fillText(`${gy}`, Math.min(width - 8, Math.max(30, zeroX - 6)), sy + 3);
    }

    // Label x=0 (B=0 界面)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x = 0 (B = 0 介面)', Math.min(width - 120, Math.max(10, zeroX + 6)), 24);

    // 3. Draw Classical Turning Points if enabled
    if (showTurningLines && derived.turningPoints.outer !== null) {
      const outerX = derived.turningPoints.outer;
      const screenOuterRight = toScreenX(outerX, width);
      const screenOuterLeft = toScreenX(-outerX, width);

      // Outer turning lines
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red-500

      ctx.beginPath();
      ctx.moveTo(screenOuterRight, 0);
      ctx.lineTo(screenOuterRight, height);
      ctx.moveTo(screenOuterLeft, 0);
      ctx.lineTo(screenOuterLeft, height);
      ctx.stroke();

      // Outer label
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`+x_turn (+${outerX.toFixed(1)} nm)`, screenOuterRight, height - 24);
      ctx.fillText(`-x_turn (-${outerX.toFixed(1)} nm)`, screenOuterLeft, height - 24);

      // Inner turning lines if magnetic barrier exists
      if (derived.turningPoints.inner !== null) {
        const innerX = derived.turningPoints.inner;
        const screenInnerRight = toScreenX(innerX, width);
        const screenInnerLeft = toScreenX(-innerX, width);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)'; // Amber
        ctx.beginPath();
        ctx.moveTo(screenInnerRight, 0);
        ctx.lineTo(screenInnerRight, height);
        ctx.moveTo(screenInnerLeft, 0);
        ctx.lineTo(screenInnerLeft, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillText(`+x_inner (+${innerX.toFixed(1)} nm)`, screenInnerRight, 40);
        ctx.fillText(`-x_inner (-${innerX.toFixed(1)} nm)`, screenInnerLeft, 40);

        // Forbidden central band
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        ctx.fillRect(screenInnerLeft, 0, screenInnerRight - screenInnerLeft, height);
      }
      ctx.setLineDash([]);
    }

    // 4. Draw Multi-Particle Beam Trajectories if active
    if (isMultiBeam && beamParticles && beamParticles.length > 0) {
      beamParticles.forEach((particle) => {
        if (particle.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 4;

        const maxLen = Math.min(particle.points.length, currentIdx + 1);
        ctx.moveTo(toScreenX(particle.points[0].x, width), toScreenY(particle.points[0].y, height));
        for (let i = 1; i < maxLen; i++) {
          ctx.lineTo(toScreenX(particle.points[i].x, width), toScreenY(particle.points[i].y, height));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Particle head
        if (maxLen > 0) {
          const pt = particle.points[maxLen - 1];
          const px = toScreenX(pt.x, width);
          const py = toScreenY(pt.y, height);
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.fill();
        }
      });
    } else {
      // 5. Draw Single Electron Trajectory
      if (points.length >= 2) {
        const renderLen = Math.min(points.length, currentIdx + 1);

        // Draw Full preview trajectory subtly
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(toScreenX(points[0].x, width), toScreenY(points[0].y, height));
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(toScreenX(points[i].x, width), toScreenY(points[i].y, height));
        }
        ctx.stroke();

        // Draw Traversed Glow Path
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8'; // Sky cyan
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.moveTo(toScreenX(points[0].x, width), toScreenY(points[0].y, height));
        for (let i = 1; i < renderLen; i++) {
          ctx.lineTo(toScreenX(points[i].x, width), toScreenY(points[i].y, height));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Trajectory Direction Arrows every N points
        const arrowInterval = Math.max(30, Math.floor(points.length / 25));
        for (let i = arrowInterval; i < renderLen; i += arrowInterval) {
          const p1 = points[i - 2];
          const p2 = points[i];
          const sx1 = toScreenX(p1.x, width);
          const sy1 = toScreenY(p1.y, height);
          const sx2 = toScreenX(p2.x, width);
          const sy2 = toScreenY(p2.y, height);

          const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
          const headLen = 6;
          ctx.beginPath();
          ctx.moveTo(sx2, sy2);
          ctx.lineTo(
            sx2 - headLen * Math.cos(angle - Math.PI / 6),
            sy2 - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(sx2, sy2);
          ctx.lineTo(
            sx2 - headLen * Math.cos(angle + Math.PI / 6),
            sy2 - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Current Active Electron
        const currentPt = points[Math.min(currentIdx, points.length - 1)];
        const curSX = toScreenX(currentPt.x, width);
        const curSY = toScreenY(currentPt.y, height);

        // Halo
        const glowRad = 12;
        const radGrad = ctx.createRadialGradient(curSX, curSY, 2, curSX, curSY, glowRad);
        radGrad.addColorStop(0, 'rgba(165, 243, 252, 0.9)');
        radGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)');
        radGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(curSX, curSY, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(curSX, curSY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Velocity vector arrow if enabled
        if (showVelocityVector) {
          const vScale = 0.25; // vector display scale
          const tipSX = curSX + currentPt.vx * vScale;
          const tipSY = curSY - currentPt.vy * vScale; // y inverted in screen

          ctx.beginPath();
          ctx.strokeStyle = '#f59e0b'; // Amber-500
          ctx.lineWidth = 2;
          ctx.moveTo(curSX, curSY);
          ctx.lineTo(tipSX, tipSY);
          ctx.stroke();

          // Arrowhead
          const vAngle = Math.atan2(tipSY - curSY, tipSX - curSX);
          ctx.beginPath();
          ctx.moveTo(tipSX, tipSY);
          ctx.lineTo(
            tipSX - 8 * Math.cos(vAngle - Math.PI / 6),
            tipSY - 8 * Math.sin(vAngle - Math.PI / 6)
          );
          ctx.lineTo(
            tipSX - 8 * Math.cos(vAngle + Math.PI / 6),
            tipSY - 8 * Math.sin(vAngle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      }
    }

    // 6. Draw Initial Launch Point (x0, y0) Marker and Angle Aim Indicator
    const initSX = toScreenX(params.x0, width);
    const initSY = toScreenY(params.y0, height);

    ctx.beginPath();
    ctx.arc(initSX, initSY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; // Green
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aim angle handle
    const aimLength = 40;
    const thetaRad = (params.theta * Math.PI) / 180;
    const aimSX = initSX + aimLength * Math.cos(thetaRad);
    const aimSY = initSY - aimLength * Math.sin(thetaRad);

    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.moveTo(initSX, initSY);
    ctx.lineTo(aimSX, aimSY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim tip circle
    ctx.beginPath();
    ctx.arc(aimSX, aimSY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();

    // 7. Scale bar in corner
    const scaleBarLengthNm = 50;
    const scaleBarPixels = scaleBarLengthNm * zoom;
    const sbX = width - scaleBarPixels - 20;
    const sbY = height - 20;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(sbX, sbY);
    ctx.lineTo(sbX + scaleBarPixels, sbY);
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(`${scaleBarLengthNm} nm`, sbX + scaleBarPixels / 2, sbY - 6);
  }, [
    params,
    derived,
    points,
    beamParticles,
    currentIdx,
    zoom,
    pan,
    showFieldGradient,
    showTurningLines,
    showVelocityVector,
    isMultiBeam,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const initSX = toScreenX(params.x0, canvas.width);
    const initSY = toScreenY(params.y0, canvas.height);

    const aimLen = 40;
    const thetaRad = (params.theta * Math.PI) / 180;
    const aimSX = initSX + aimLen * Math.cos(thetaRad);
    const aimSY = initSY - aimLen * Math.sin(thetaRad);

    const distToInit = Math.hypot(mouseX - initSX, mouseY - initSY);
    const distToAim = Math.hypot(mouseX - aimSX, mouseY - aimSY);

    if (distToAim < 12) {
      setIsDraggingAim(true);
    } else if (distToInit < 12) {
      setIsDraggingInitPos(true);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wx = toWorldX(mouseX, canvas.width);
    const wy = toWorldY(mouseY, canvas.height);
    setHoverCoord({ x: wx, y: wy });

    if (isDraggingInitPos) {
      onUpdateParams({
        x0: Math.round(wx * 2) / 2,
        y0: Math.round(wy * 2) / 2,
      });
    } else if (isDraggingAim) {
      const initSX = toScreenX(params.x0, canvas.width);
      const initSY = toScreenY(params.y0, canvas.height);
      const angleRad = Math.atan2(-(mouseY - initSY), mouseX - initSX);
      let angleDeg = Math.round((angleRad * 180) / Math.PI);
      if (angleDeg < -180) angleDeg += 360;
      if (angleDeg > 180) angleDeg -= 360;
      onUpdateParams({ theta: angleDeg });
    } else if (isPanning) {
      const dx = (e.clientX - panStart.x) / zoom;
      const dy = -(e.clientY - panStart.y) / zoom;
      setPan((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingInitPos(false);
    setIsDraggingAim(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.max(0.3, Math.min(prev * factor, 8.0)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverCoord(null);
        }}
        onWheel={handleWheel}
        className={`w-full h-full block cursor-${
          isDraggingInitPos || isDraggingAim ? 'grabbing' : isPanning ? 'grab' : 'crosshair'
        }`}
      />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/60 shadow-lg z-10 text-xs text-slate-300">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.25, 8.0))}
          title="放大 (Zoom In)"
          className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.3))}
          title="縮小 (Zoom Out)"
          className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="重設視野 (Fit View)"
          className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
        <button
          onClick={() => setShowFieldGradient(!showFieldGradient)}
          title="切換磁場梯度底色"
          className={`px-2 py-0.5 rounded transition font-mono ${
            showFieldGradient ? 'bg-indigo-600/60 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          B(x) 色階
        </button>
        <button
          onClick={() => setShowTurningLines(!showTurningLines)}
          title="顯示轉折點線"
          className={`px-2 py-0.5 rounded transition font-mono ${
            showTurningLines ? 'bg-indigo-600/60 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          x_turn
        </button>
        <button
          onClick={() => setShowVelocityVector(!showVelocityVector)}
          title="顯示速度向量"
          className={`px-2 py-0.5 rounded transition font-mono ${
            showVelocityVector ? 'bg-amber-600/60 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          v 向量
        </button>
      </div>

      {/* Real-space Coordinates Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono shadow-md pointer-events-none">
        <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
        {hoverCoord ? (
          <>
            <span>x: {hoverCoord.x.toFixed(1)} nm</span>
            <span>y: {hoverCoord.y.toFixed(1)} nm</span>
            <span className="text-amber-400">
              B(x): {((params.B0 * hoverCoord.x) / params.L).toFixed(3)} T
            </span>
          </>
        ) : (
          <span>拖曳綠點設定 (x₀, y₀) 或發射角度 θ</span>
        )}
      </div>

      {/* Hint overlay on top left */}
      <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/60 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-cyan-400" />
        <span className="flex items-center gap-1">
          實空間軌道 (x, y) · 梯度 <MathView math="\vec{B} = \frac{B_0 x}{L} \hat{k}" />
        </span>
      </div>
    </div>
  );
};
