class PoseDetector {
    constructor() {
        this.detector = null;
        this.model = poseDetection.SupportedModels.MoveNet;
        this.config = {
            modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
            enableSmoothing: true
        };
    }

    async init() {
        await tf.ready();
        this.detector = await poseDetection.createDetector(this.model, this.config);
        console.log("PoseDetector Initialized");
    }

    async estimate(video) {
        if (!this.detector) return [];
        try {
            const poses = await this.detector.estimatePoses(video);
            return poses;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    drawResults(ctx, keypoints, exerciseType) {
        // Ensure we clear the canvas to show video underneath
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!keypoints || keypoints.length === 0) return;

        // Draw Skeleton
        this.drawSkeleton(ctx, keypoints, exerciseType);

        // Draw Keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 8, 0, 2 * Math.PI); // Larger dots
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.strokeStyle = this.getKeypointColor(kp.name, exerciseType);
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }

    drawSkeleton(ctx, keypoints, exerciseType) {
        const adjacentPairs = poseDetection.util.getAdjacentPairs(this.model);
        ctx.lineWidth = 6; // Thicker lines

        adjacentPairs.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];

            if (kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.strokeStyle = (exerciseType === 'pushup') ? '#00ADB5' : '#FF4D4D';
                ctx.stroke();
            }
        });
    }

    getKeypointColor(name, type) {
        if (!name) return '#00ADB5';
        if (type === 'pushup') {
            if (name.includes('shoulder') || name.includes('elbow') || name.includes('wrist')) return '#00ff88';
        } else if (type === 'situp') {
            if (name.includes('shoulder') || name.includes('hip') || name.includes('knee') || name.includes('elbow')) return '#ff4d4d';
        }
        return '#00ADB5';
    }
}
