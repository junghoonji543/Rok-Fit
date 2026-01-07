// This is a dummy implementation to fix build errors.
// @tensorflow-models/pose-detection imports 'Pose' from '@mediapipe/pose',
// but we are using MoveNet, so we don't need the actual BlazePose implementation.
// Also, @mediapipe/pose v0.5+ has export issues in some bundlers.

export class Pose {
    constructor(config: any) { }
    setOptions(options: any) { }
    onResults(callback: any) { }
    async send(inputs: any) { }
    async close() { }
    reset() { }
    initialize() { return Promise.resolve(); }
}
