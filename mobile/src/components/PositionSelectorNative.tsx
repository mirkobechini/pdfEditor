import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Image, PanResponder, ScrollView } from "react-native";
import { IconButton } from "react-native-paper";
import Pdf from "react-native-pdf";
import { File } from "expo-file-system";
import { PDFDocument } from "@cantoo/pdf-lib";
import { clampBoxPosition, clampBoxSize, pxToPt } from "./positionMath";

interface PositionSelectorNativeProps {
    pdfUri: string | null;
    pageNumber: number;
    /** Default box size in PDF points (width, height). */
    boxSize: { width: number; height: number };
    /** Optional signature preview: a base64 PNG (with or without the data: prefix). */
    signatureImage?: string | null;
    /** Called with the top-left position in PDF points. */
    onPositionChange: (x: number, y: number) => void;
    /** Called with the box size in PDF points when resized. */
    onSizeChange?: (width: number, height: number) => void;
    /** Preview width in px — height is derived from the page's own aspect ratio. */
    previewWidth?: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.5;
// How close to a viewport edge (in px) the box has to get before the preview
// starts auto-scrolling to follow it. Step size ramps from MIN to MAX the
// deeper past that margin the box goes, so nudging the edge scrolls slowly
// while pushing further in scrolls faster — standard "edge scroll" feel.
const EDGE_MARGIN = 40;
const AUTO_SCROLL_STEP_MIN = 10;
const AUTO_SCROLL_STEP_MAX = 45;
// Runs independently of touch-move events so scrolling continues smoothly
// even while the finger holds still right at the edge, instead of only
// advancing whenever a new move event happens to fire.
const AUTO_SCROLL_INTERVAL_MS = 16;

/**
 * Mobile equivalent of the web/desktop shared PositionSelector: renders a
 * single PDF page (via react-native-pdf's singlePage mode) and lets the user
 * drag/resize a box over it, reporting position/size in PDF points — the
 * coordinate system pdf-lib's signPdf uses on-device.
 */
export default function PositionSelectorNative({
    pdfUri,
    pageNumber,
    boxSize,
    signatureImage,
    onPositionChange,
    onSizeChange,
    previewWidth = 300,
}: PositionSelectorNativeProps) {
    const [zoom, setZoomState] = useState(1);
    // The zoomed-in render size — everything below (page load, box math,
    // drag/resize bounds) works in this space, not the base previewWidth.
    // PanResponder callbacks are created once (see the `useRef(PanResponder
    // .create(...))` below) and never see new renders, so anything they read
    // has to come from a ref kept in sync, not a plain closed-over variable —
    // that's what caught out `boxPos`/`boxSizePx` originally, and renderWidth
    // itself: after zooming, the drag bound was still clamping against the
    // *original* zoom=1 width, capping how far right the box could go.
    const renderWidthRef = useRef(previewWidth * zoom);
    renderWidthRef.current = previewWidth * zoom;
    const renderWidth = renderWidthRef.current;

    // react-native-pdf's onLoadComplete `size` is NOT in true PDF points — on
    // some documents it reports a DPI-scaled render size instead, which threw
    // off every pt conversion by a fixed but PDF-dependent factor (positions
    // stayed on-page thanks to the clamp in signPdf, but boxes/signatures came
    // out far bigger than the preview showed). `pageSize` below is only ever
    // used to size the preview's aspect ratio; `truePageSize`, read straight
    // from pdf-lib (the same library that later draws the signature), is the
    // one used for every px<->pt conversion.
    const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
    const [truePageSize, setTruePageSize] = useState<{ width: number; height: number } | null>(null);
    // Derived synchronously from renderWidth + the page's own aspect ratio —
    // NOT from react-native-pdf's onLoadComplete, which only fires after the
    // native view remounts (see the `key` on <Pdf> below). That remount is
    // asynchronous, so on zoom a render could momentarily pair the *new*
    // renderWidth with the *old* renderHeight — pxToPt then divides the
    // (correctly rescaled) box size by a stale denominator, inflating the
    // reported height. Deriving it here keeps it always in lockstep with
    // renderWidth, same-render, no race.
    const aspectRatio = truePageSize
        ? truePageSize.height / truePageSize.width
        : pageSize
            ? pageSize.height / pageSize.width
            : 1.414;
    const renderHeight = renderWidth * aspectRatio;
    const renderHeightRef = useRef(renderHeight);
    renderHeightRef.current = renderHeight;
    const [boxPos, setBoxPosState] = useState({ x: 0, y: 0 });
    const [boxSizePx, setBoxSizePxState] = useState<{ width: number; height: number } | null>(null);
    const dragStart = useRef({ boxX: 0, boxY: 0 });
    const resizeStart = useRef({ w: 0, h: 0 });
    // Disabling scroll while a drag/resize touch is active stops the
    // surrounding pan-to-see-more ScrollViews from stealing the gesture —
    // otherwise, once zoomed in, dragging the box would just scroll the page
    // underneath it instead of moving the box.
    const [panEnabled, setPanEnabled] = useState(true);

    const boxPosRef = useRef(boxPos);
    const boxSizePxRef = useRef(boxSizePx);
    function setBoxPos(next: { x: number; y: number }) {
        boxPosRef.current = next;
        setBoxPosState(next);
    }
    function setBoxSizePx(next: { width: number; height: number } | null) {
        boxSizePxRef.current = next;
        setBoxSizePxState(next);
    }
    function setZoom(updater: (z: number) => number) {
        setZoomState(updater);
    }

    // The viewport (what's actually visible without scrolling) stays fixed
    // at the base, unzoomed size — only the content inside grows and becomes
    // pannable. Capped so a very tall/narrow page doesn't blow up the dialog.
    const viewportHeight = Math.min(previewWidth * 1.6, 420);

    // Auto-scroll-while-dragging support: refs to imperatively scroll the
    // nested ScrollViews, plus the current scroll offset (updated on every
    // onScroll) so onPanResponderMove can tell whether the box, in content
    // coordinates, is nearing an edge of the currently visible viewport.
    const outerScrollRef = useRef<ScrollView>(null);
    const innerScrollRef = useRef<ScrollView>(null);
    const scrollOffsetRef = useRef({ x: 0, y: 0 });
    const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // How far past the margin the box has overshot, as a 0..1 ratio, scaled
    // into a step size between MIN (right at the edge) and MAX (deep past it).
    function scaledStep(overshoot: number): number {
        const ratio = Math.min(1, Math.max(0, overshoot) / EDGE_MARGIN);
        return AUTO_SCROLL_STEP_MIN + ratio * (AUTO_SCROLL_STEP_MAX - AUTO_SCROLL_STEP_MIN);
    }

    function autoScrollTowards(pos: { x: number; y: number }, size: { width: number; height: number }) {
        const so = scrollOffsetRef.current;
        let nextX = so.x;
        let nextY = so.y;

        const leftGap = pos.x - so.x;
        const rightGap = previewWidth - (pos.x + size.width - so.x);
        if (leftGap < EDGE_MARGIN) {
            nextX = Math.max(0, so.x - scaledStep(EDGE_MARGIN - leftGap));
        } else if (rightGap < EDGE_MARGIN) {
            nextX = Math.min(Math.max(0, renderWidthRef.current - previewWidth), so.x + scaledStep(EDGE_MARGIN - rightGap));
        }

        const topGap = pos.y - so.y;
        const bottomGap = viewportHeight - (pos.y + size.height - so.y);
        if (topGap < EDGE_MARGIN) {
            nextY = Math.max(0, so.y - scaledStep(EDGE_MARGIN - topGap));
        } else if (bottomGap < EDGE_MARGIN) {
            nextY = Math.min(Math.max(0, renderHeightRef.current - viewportHeight), so.y + scaledStep(EDGE_MARGIN - bottomGap));
        }

        if (nextX !== so.x) innerScrollRef.current?.scrollTo({ x: nextX, animated: false });
        if (nextY !== so.y) outerScrollRef.current?.scrollTo({ y: nextY, animated: false });
    }

    function startAutoScrollLoop() {
        if (autoScrollIntervalRef.current) return;
        autoScrollIntervalRef.current = setInterval(() => {
            autoScrollTowards(boxPosRef.current, boxSizePxRef.current || { width: 0, height: 0 });
        }, AUTO_SCROLL_INTERVAL_MS);
    }

    function stopAutoScrollLoop() {
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }
    }

    // react-native-pdf reloads the document whenever `source` gets a new
    // object reference — a plain `{ uri: pdfUri }` literal is recreated on
    // every render, and this component re-renders on every drag/resize move
    // (each one calls onPositionChange/onSizeChange, which update state in
    // the parent). Without memoizing this, the page kept reloading mid-drag,
    // resetting the box back to (0, 0) — the "always snaps to top-left and
    // can't be dragged far" bug.
    const source = useMemo(() => ({ uri: pdfUri ?? "" }), [pdfUri]);

    // Safety net: if the dialog closes mid-drag, don't leave the interval running.
    useEffect(() => stopAutoScrollLoop, []);

    // Read the page's real point dimensions from pdf-lib — see the comment on
    // `truePageSize` above for why react-native-pdf's own size can't be
    // trusted for this.
    useEffect(() => {
        let cancelled = false;
        async function loadTruePageSize() {
            if (!pdfUri) return;
            try {
                const file = new File(pdfUri);
                const bytes = new Uint8Array(await file.arrayBuffer());
                const doc = await PDFDocument.load(bytes);
                if (pageNumber < 1 || pageNumber > doc.getPageCount()) return;
                const page = doc.getPage(pageNumber - 1);
                if (!cancelled) {
                    setTruePageSize({ width: page.getWidth(), height: page.getHeight() });
                }
            } catch (e) {
                console.error("[PositionSelectorNative] failed to read true page size:", e);
            }
        }
        loadTruePageSize();
        return () => {
            cancelled = true;
        };
    }, [pdfUri, pageNumber]);

    // <Pdf> is keyed on `${pageNumber}-${zoom}`, so it remounts (firing this
    // callback again) both on a real page change AND on a zoom change. Only
    // a real page change should reset the box back to (0, 0) — resetting on
    // every zoom step silently relocated the box the user had just placed.
    const pageNumberRef = useRef(pageNumber);
    pageNumberRef.current = pageNumber;
    const loadedForPageRef = useRef<number | null>(null);
    const handleLoadComplete = useCallback(
        (_numberOfPages: number, _path: string, size: { width: number; height: number }) => {
            setPageSize(size);
            if (loadedForPageRef.current !== pageNumberRef.current) {
                setBoxPos({ x: 0, y: 0 });
            }
            loadedForPageRef.current = pageNumberRef.current;
        },
        [],
    );

    // (Re)compute the box's initial pixel size from the *true* page
    // dimensions whenever those become available or the render width changes
    // (zoom). Split out from handleLoadComplete because truePageSize loads
    // asynchronously via pdf-lib and may not be ready yet when RN-pdf's own
    // onLoadComplete fires.
    const sizedForRenderWidthRef = useRef<number | null>(null);
    useEffect(() => {
        if (!truePageSize) return;
        if (sizedForRenderWidthRef.current === null) {
            // First time we have real page dimensions: set the box to its
            // default size (in points, converted to the current pixel scale).
            const pxScale = renderWidth / truePageSize.width;
            setBoxSizePx({ width: boxSize.width * pxScale, height: boxSize.height * pxScale });
        } else if (sizedForRenderWidthRef.current !== renderWidth && boxSizePxRef.current) {
            // renderWidth changed (zoom) — rescale whatever size the box is
            // currently at (including any manual resize) instead of
            // resetting back to the default, which was wiping out resizes.
            const ratio = renderWidth / sizedForRenderWidthRef.current;
            const prev = boxSizePxRef.current;
            setBoxSizePx({ width: prev.width * ratio, height: prev.height * ratio });
        }
        sizedForRenderWidthRef.current = renderWidth;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [truePageSize, renderWidth]);

    // Report position whenever the box moves
    useEffect(() => {
        if (!truePageSize) return;
        const pt = pxToPt(boxPos, truePageSize, renderWidth, renderHeight);
        onPositionChange(pt.x, pt.y);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxPos, truePageSize, renderHeight, renderWidth]);

    // Report box size whenever it changes
    useEffect(() => {
        if (!truePageSize || !boxSizePx) return;
        const pt = pxToPt({ x: boxSizePx.width, y: boxSizePx.height }, truePageSize, renderWidth, renderHeight);
        onSizeChange?.(pt.x, pt.y);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxSizePx, truePageSize, renderHeight, renderWidth]);

    // Nested PanResponders (a drag responder on the box, a resize responder
    // on a handle inside it) don't reliably negotiate "innermost wins" under
    // the new architecture (Fabric/Bridgeless) the way they did on the
    // legacy bridge — touches meant for the resize handle kept getting
    // claimed by the drag box underneath it instead, no matter how the
    // negotiation callbacks were tuned. A single PanResponder that decides
    // its mode once, at grant time, based on where the touch started,
    // sidesteps the negotiation entirely — there's only ever one responder,
    // so there's nothing for the two to disagree about.
    const RESIZE_HANDLE_HIT_SIZE = 40;
    const isResizingRef = useRef(false);
    function isInResizeHandle(locationX: number, locationY: number): boolean {
        const size = boxSizePxRef.current;
        if (!size) return false;
        return (
            locationX > size.width - RESIZE_HANDLE_HIT_SIZE &&
            locationY > size.height - RESIZE_HANDLE_HIT_SIZE
        );
    }

    const dragResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                isResizingRef.current = isInResizeHandle(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
                setPanEnabled(false);
                dragStart.current = { boxX: boxPosRef.current.x, boxY: boxPosRef.current.y };
                resizeStart.current = { w: boxSizePxRef.current?.width || 0, h: boxSizePxRef.current?.height || 0 };
                startAutoScrollLoop();
            },
            onPanResponderMove: (_evt, gesture) => {
                if (isResizingRef.current) {
                    const next = clampBoxSize(
                        { width: resizeStart.current.w, height: resizeStart.current.h },
                        gesture.dx,
                        gesture.dy,
                        boxPosRef.current,
                        renderWidthRef.current,
                        renderHeightRef.current,
                    );
                    setBoxSizePx(next);
                    autoScrollTowards(boxPosRef.current, next);
                } else {
                    const next = clampBoxPosition(
                        { x: dragStart.current.boxX, y: dragStart.current.boxY },
                        gesture.dx,
                        gesture.dy,
                        boxSizePxRef.current || { width: 0, height: 0 },
                        renderWidthRef.current,
                        renderHeightRef.current,
                    );
                    setBoxPos(next);
                    // Also nudge immediately on every touch-move — the interval
                    // alone can lag behind while the JS thread is busy handling
                    // a fast-moving gesture, which looked like "nothing scrolls".
                    autoScrollTowards(next, boxSizePxRef.current || { width: 0, height: 0 });
                }
            },
            onPanResponderEnd: () => { setPanEnabled(true); stopAutoScrollLoop(); },
            onPanResponderTerminate: () => { setPanEnabled(true); stopAutoScrollLoop(); },
        }),
    ).current;

    if (!pdfUri) return null;

    return (
        <View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 }}>
                <IconButton
                    icon="magnify-minus-outline"
                    size={18}
                    disabled={zoom <= ZOOM_MIN}
                    onPress={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                    testID="position-zoom-out"
                />
                <IconButton
                    icon="magnify-plus-outline"
                    size={18}
                    disabled={zoom >= ZOOM_MAX}
                    onPress={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                    testID="position-zoom-in"
                />
            </View>
            <View
                style={{
                    width: previewWidth,
                    height: viewportHeight,
                    borderRadius: 8,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#ccc",
                }}
            >
                {/* `flex: 1` doesn't reliably resolve for a ScrollView nested
                    inside another ScrollView's content (the content container
                    has no fixed height to flex against), so both dimensions
                    are given explicitly instead — the standard, documented
                    way to get 2D pan out of RN's ScrollView, which only
                    scrolls one axis per instance. Outer scrolls vertically
                    across the full zoomed height; inner scrolls horizontally
                    across the full zoomed width, but keeps the outer's frame
                    width/height so it doesn't itself grow past the viewport. */}
                <ScrollView
                    ref={outerScrollRef}
                    style={{ width: previewWidth, height: viewportHeight }}
                    scrollEnabled={panEnabled}
                    onScroll={(e) => { scrollOffsetRef.current.y = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                >
                    <ScrollView
                        ref={innerScrollRef}
                        style={{ width: previewWidth, height: renderHeight }}
                        horizontal
                        scrollEnabled={panEnabled}
                        onScroll={(e) => { scrollOffsetRef.current.x = e.nativeEvent.contentOffset.x; }}
                        scrollEventThrottle={16}
                    >
                        <View style={{ width: renderWidth, height: renderHeight }}>
                            <Pdf
                                // react-native-pdf's singlePage mode only honors `page` and the
                                // rendered size at mount time — changing either afterward (page
                                // navigation, zoom level) doesn't take effect in place. Keying on
                                // both forces a full remount so it actually picks up the change.
                                key={`${pageNumber}-${zoom}`}
                                source={source}
                                page={pageNumber}
                                singlePage
                                onLoadComplete={handleLoadComplete}
                                style={{ width: renderWidth, height: renderHeight }}
                            />
                            {boxSizePx && (
                                <View
                                    {...dragResponder.panHandlers}
                                    testID="position-box"
                                    style={{
                                        position: "absolute",
                                        left: boxPos.x,
                                        top: boxPos.y,
                                        width: boxSizePx.width,
                                        height: boxSizePx.height,
                                        borderWidth: 2,
                                        borderColor: "#f7871f",
                                        backgroundColor: "rgba(247,135,31,0.2)",
                                    }}
                                >
                                    {signatureImage && (
                                        <Image
                                            source={{ uri: signatureImage.startsWith("data:") ? signatureImage : `data:image/png;base64,${signatureImage}` }}
                                            style={{ width: "100%", height: "100%" }}
                                            resizeMode="contain"
                                        />
                                    )}
                                    {/* Purely visual now — no PanHandlers of its own. The parent
                                        box's single PanResponder (above) decides drag vs. resize
                                        by checking whether the initial touch fell in this corner,
                                        which needs this handle's hit-zone to stay fully inside the
                                        box's own touchable bounds (not overlapping outside it). */}
                                    <View
                                        testID="resize-handle"
                                        pointerEvents="none"
                                        style={{
                                            position: "absolute",
                                            right: 0,
                                            bottom: 0,
                                            width: 40,
                                            height: 40,
                                            alignItems: "flex-end",
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 11,
                                                backgroundColor: "#f7871f",
                                                borderWidth: 2,
                                                borderColor: "#fff",
                                            }}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </ScrollView>
            </View>
        </View>
    );
}
