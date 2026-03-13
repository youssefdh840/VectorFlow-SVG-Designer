import { CoordinateUtils } from '../utils/CoordinateUtils';

export interface EngineState {
  viewBox: { x: number; y: number; w: number; h: number };
  zoom: number;
}

/**
 * High-performance SVG Engine for handling zooming and panning.
 */
export class SVGEngine {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private state: EngineState;
  private isPanning: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private rafId: number | null = null;

  constructor(svgElement: SVGSVGElement, containerElement: HTMLElement) {
    this.svg = svgElement;
    this.container = containerElement;
    
    const width = containerElement.clientWidth;
    const height = containerElement.clientHeight;
    
    this.state = {
      viewBox: { x: 0, y: 0, w: width, h: height },
      zoom: 1
    };

    this.init();
  }

  private init() {
    this.updateViewBox();
    this.setupEventListeners();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.state.viewBox.w = this.container.clientWidth;
      this.state.viewBox.h = this.container.clientHeight;
      this.requestUpdate();
    });
  }

  private setupEventListeners() {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left click for pan
      this.isPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.container.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isPanning) return;

    const dx = (e.clientX - this.lastMousePos.x) * this.state.zoom;
    const dy = (e.clientY - this.lastMousePos.y) * this.state.zoom;

    this.state.viewBox.x -= dx;
    this.state.viewBox.y -= dy;

    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.requestUpdate();
  }

  private onMouseUp() {
    this.isPanning = false;
    this.container.style.cursor = 'default';
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomSpeed = 0.001;
    const delta = e.deltaY;
    const factor = Math.pow(1.1, -delta / 100);
    
    const mousePos = CoordinateUtils.screenToSVG(this.svg, e.clientX, e.clientY);

    const newZoom = this.state.zoom / factor;
    
    // Limit zoom
    if (newZoom < 0.01 || newZoom > 100) return;

    // Adjust viewBox to zoom towards mouse position
    this.state.viewBox.x = mousePos.x - (mousePos.x - this.state.viewBox.x) / factor;
    this.state.viewBox.y = mousePos.y - (mousePos.y - this.state.viewBox.y) / factor;
    this.state.viewBox.w /= factor;
    this.state.viewBox.h /= factor;
    this.state.zoom = newZoom;

    this.requestUpdate();
  }

  private requestUpdate() {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.updateViewBox();
      this.rafId = null;
    });
  }

  private updateViewBox() {
    const { x, y, w, h } = this.state.viewBox;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  public getSVGElement(): SVGSVGElement {
    return this.svg;
  }
}
