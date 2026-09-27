import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface SignaturePadRef {
    clear: () => void;
    undo: () => void;
    hasSignature: () => boolean;
    /** Resolves the drawing as a base64-encoded PNG (no data: prefix), or null if empty. */
    toPngBase64: () => Promise<string | null>;
}

interface SignaturePadProps {
    width: number;
    height: number;
    strokeColor?: string;
    strokeWidth?: number;
}

/**
 * Freehand signature pad: captures touch points via PanResponder into SVG
 * path strings. Uses react-native-svg's own native toDataURL() (bundled with
 * the library on iOS/Android — no extra dependency needed) to rasterize the
 * drawing to a PNG for embedding into the PDF via pdf-lib.
 */
const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
    // A thin stroke gets partially anti-aliased into semi-transparent gray
    // along most of its length rather than solid color, which is what made
    // the signature look washed out once it was composited (with a
    // transparent background) directly onto the page instead of sitting on
    // its own opaque white square. A bolder stroke keeps enough fully-opaque
    // pixels to stay legible regardless of what's underneath.
    { width, height, strokeColor = "#000", strokeWidth = 5 },
    ref,
) {
    const svgRef = useRef<Svg>(null);
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState("");

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath((prev) => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
            },
            onPanResponderRelease: () => {
                setCurrentPath((prev) => {
                    if (prev) setPaths((p) => [...p, prev]);
                    return "";
                });
            },
        }),
    ).current;

    useImperativeHandle(
        ref,
        () => ({
            clear: () => {
                setPaths([]);
                setCurrentPath("");
            },
            undo: () => {
                setPaths((p) => p.slice(0, -1));
            },
            hasSignature: () => paths.length > 0,
            toPngBase64: () =>
                new Promise((resolve) => {
                    if (!svgRef.current || paths.length === 0) {
                        resolve(null);
                        return;
                    }
                    svgRef.current.toDataURL((base64: string) => resolve(base64));
                }),
        }),
        [paths],
    );

    return (
        // The white backing here is only so the pad is visible while drawing
        // — it lives on the View, not inside the Svg, so it isn't baked into
        // the exported PNG. The signature itself is captured with a
        // transparent background (matching desktop/web's plain <canvas>,
        // which is transparent by default) so it blends into whatever part
        // of the PDF page it's later placed on, instead of covering it with
        // an opaque white square.
        <View {...panResponder.panHandlers} testID="signature-pad" style={{ width, height, backgroundColor: "#fff" }}>
            <Svg ref={svgRef} width={width} height={height}>
                {paths.map((d, i) => (
                    <Path key={i} d={d} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath ? (
                    <Path d={currentPath} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
            </Svg>
        </View>
    );
});

export default SignaturePad;
