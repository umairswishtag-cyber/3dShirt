export function designObjectToKonvaProps(object, canvasSize, flipEditorY = false) {
    return {
        x: object.x * canvasSize,
        y: (flipEditorY ? 1 - object.y : object.y) * canvasSize,
        width: object.width * canvasSize,
        height: object.height * canvasSize,
        offsetX: (object.width * canvasSize) / 2,
        offsetY: (object.height * canvasSize) / 2,
        scaleX: object.scaleX * (object.flipX ? -1 : 1),
        scaleY: object.scaleY * (object.flipY ? -1 : 1),
        rotation: flipEditorY ? -object.rotation : object.rotation,
        opacity: object.opacity,
    };
}

export function konvaNodeToDesignPatch(node, canvasSize, flipEditorY = false) {
    const scale = Math.max(Math.abs(node.scaleX()), Math.abs(node.scaleY()));

    return {
        x: node.x() / canvasSize,
        y: flipEditorY ? 1 - node.y() / canvasSize : node.y() / canvasSize,
        // Customer artwork always keeps its source aspect ratio. Using one
        // scale also prevents repeated boundary fitting from collapsing an
        // independently resized axis toward zero.
        scaleX: scale,
        scaleY: scale,
        flipX: node.scaleX() < 0,
        flipY: node.scaleY() < 0,
        rotation: flipEditorY ? -node.rotation() : node.rotation(),
    };
}
