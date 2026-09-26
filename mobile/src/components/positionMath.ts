/**
 * Pure geometry helpers for PositionSelectorNative, split out so the
 * clamping math (the trickiest part of the drag/resize logic) can be unit
 * tested without rendering the component — this project's RTL setup can't
 * render components (see test/auth.test.ts), so anything worth testing here
 * has to be a plain function.
 */

export interface Size {
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

/** PDF points per displayed pixel, in each axis. */
export function ptPerPx(pageSize: Size, previewWidth: number, previewHeight: number): Point {
    return {
        x: pageSize.width / previewWidth,
        y: pageSize.height / previewHeight,
    };
}

/** Convert a displayed-pixel point to PDF points, rounded to the nearest integer. */
export function pxToPt(px: Point, pageSize: Size, previewWidth: number, previewHeight: number): Point {
    const scale = ptPerPx(pageSize, previewWidth, previewHeight);
    return { x: Math.round(px.x * scale.x), y: Math.round(px.y * scale.y) };
}

/** Clamp a dragged box's new top-left position to stay within the preview bounds. */
export function clampBoxPosition(
    startPos: Point,
    dx: number,
    dy: number,
    boxSizePx: Size,
    previewWidth: number,
    previewHeight: number,
): Point {
    const maxX = previewWidth - boxSizePx.width;
    const maxY = previewHeight - boxSizePx.height;
    return {
        x: Math.max(0, Math.min(startPos.x + dx, maxX)),
        y: Math.max(0, Math.min(startPos.y + dy, maxY)),
    };
}

/** Clamp a resized box's new size to stay within the preview bounds and a minimum size. */
export function clampBoxSize(
    startSize: Size,
    dx: number,
    dy: number,
    boxPos: Point,
    previewWidth: number,
    previewHeight: number,
    minWidth = 40,
    minHeight = 20,
): Size {
    const maxW = previewWidth - boxPos.x;
    const maxH = previewHeight - boxPos.y;
    return {
        width: Math.max(minWidth, Math.min(startSize.width + dx, maxW)),
        height: Math.max(minHeight, Math.min(startSize.height + dy, maxH)),
    };
}
