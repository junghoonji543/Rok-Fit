import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export class PoseDetector {
    private static instance: PoseDetector;
    private detector: poseDetection.PoseDetector | null = null;

    private constructor() { }

    public static getInstance(): PoseDetector {
        if (!PoseDetector.instance) {
            PoseDetector.instance = new PoseDetector();
        }
        return PoseDetector.instance;
    }

    public async init() {
        if (this.detector) return;

        await tf.ready();
        await tf.setBackend('webgl');

        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        };
        this.detector = await poseDetection.createDetector(model, detectorConfig);
        console.log('MoveNet Thunder Loaded');
    }

    public async estimate(video: HTMLVideoElement) {
        if (!this.detector) throw new Error('Detector not initialized');
        return await this.detector.estimatePoses(video, {
            maxPoses: 1, // Only tracking one person for now as per "Rightmost" logic isn't strictly needed if we crop or select, but strictly:
            // If we need multi-pose to filter rightmost, we should set maxPoses: 3
        });
    }

    // Helper to draw skeleton
    public drawResults(ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) {
        ctx.strokeStyle = '#00ff00'; // Neon Green
        ctx.lineWidth = 4;
        ctx.fillStyle = '#ffffff';

        // Draw Points
        keypoints.forEach((kp) => {
            if ((kp.score || 0) > 0.3) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // Draw Skeleton Lines (Simple version for torso/limbs)
        const adjacencies = [
            [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
            [5, 11], [6, 12], // Torso
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16] // Legs
        ];

        // Check keypoint availability helper
        const get = (i: number) => keypoints.find(k => k.name === i.toString() || k.name === getKeypointName(i));

        // NOTE: Keypoints are usually indexed. 
        // TFJS MoveNet returns name based. But we filtered index in vanilla.
        // Let's assume input is filtered array or full array.
        // If full array, we use indices.

        adjacencies.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];
            if (kp1 && kp2 && (kp1.score || 0) > 0.3 && (kp2.score || 0) > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.stroke();
            }
        });
    }
}

function getKeypointName(index: number): string {
    const names = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    return names[index] || '';
}
