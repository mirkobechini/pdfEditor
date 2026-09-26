import React, { useEffect, useRef, useState } from "react";
import { View, Image, PanResponder } from "react-native";
import Pdf from "react-native-pdf";
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
    const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
    const [previewHeight, setPreviewHeight] = useState(previewWidth);
    const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
    const [boxSizePx, setBoxSizePx] = useState<{ width: number; height: number } | null>(null);
    const dragStart = useRef({ boxX: 0, boxY: 0 });
    const resizeStart = useRef({ w: 0, h: 0 });

    function handleLoadComplete(_numberOfPages: number, _path: string, size: { width: number; height: number }) {
        setPageSize(size);
        const previewH = previewWidth * (size.height / size.width);
        setPreviewHeight(previewH);
        setBoxPos({ x: 0, y: 0 });
        const pxScale = previewWidth / size.width;
        setBoxSizePx({ width: boxSize.width * pxScale, height: boxSize.height * pxScale });
    }

    // Report position whenever the box moves
    useEffect(() => {
        if (!pageSize) return;
        const pt = pxToPt(boxPos, pageSize, previewWidth, previewHeight);
        onPositionChange(pt.x, pt.y);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxPos, pageSize, previewHeight]);

    // Report box size whenever it changes
    useEffect(() => {
        if (!pageSize || !boxSizePx) return;
        const pt = pxToPt({ x: boxSizePx.width, y: boxSizePx.height }, pageSize, previewWidth, previewHeight);
        onSizeChange?.(pt.x, pt.y);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxSizePx, pageSize, previewHeight]);

    const dragResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                dragStart.current = { boxX: boxPos.x, boxY: boxPos.y };
            },
            onPanResponderMove: (_evt, gesture) => {
                setBoxPos(
                    clampBoxPosition(
                        { x: dragStart.current.boxX, y: dragStart.current.boxY },
                        gesture.dx,
                        gesture.dy,
                        boxSizePx || { width: 0, height: 0 },
                        previewWidth,
                        previewHeight,
                    ),
                );
            },
        }),
    ).current;

    const resizeResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                resizeStart.current = { w: boxSizePx?.width || 0, h: boxSizePx?.height || 0 };
            },
            onPanResponderMove: (_evt, gesture) => {
                setBoxSizePx(
                    clampBoxSize(
                        { width: resizeStart.current.w, height: resizeStart.current.h },
                        gesture.dx,
                        gesture.dy,
                        boxPos,
                        previewWidth,
                        previewHeight,
                    ),
                );
            },
        }),
    ).current;

    if (!pdfUri) return null;

    return (
        <View
            style={{
                width: previewWidth,
                height: previewHeight,
                borderRadius: 8,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#ccc",
            }}
        >
            <Pdf
                source={{ uri: pdfUri }}
                page={pageNumber}
                singlePage
                onLoadComplete={handleLoadComplete}
                style={{ width: previewWidth, height: previewHeight }}
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
                    <View
                        {...resizeResponder.panHandlers}
                        testID="resize-handle"
                        style={{ position: "absolute", right: 0, bottom: 0, width: 24, height: 24 }}
                    />
                </View>
            )}
        </View>
    );
}
