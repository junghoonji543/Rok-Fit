class PoseDetector {
    constructor() {
        this.detector = null;
        this.model = poseDetection.SupportedModels.MoveNet;
        this.config = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
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

    drawResults(ctx, keypoints, exerciseType, feedback) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw Skeleton
        this.drawSkeleton(ctx, keypoints);

        // Draw Keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = this.getKeypointColor(kp.name, exerciseType); // '#00ADB5'
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            }
        });

        // specific drawing for exercises can go here (e.g. angles)
    }

    drawSkeleton(ctx, keypoints) {
        const adjacentPairs = poseDetection.util.getAdjacentPairs(this.model);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fff';

        adjacentPairs.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];

            if (kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.stroke();
            }
        });
    }

    getKeypointColor(name, type) {
        // Highlight relevant joints based on exercise
        if (type === 'pushup') {
            if (name.includes('shoulder') || name.includes('elbow') || name.includes('wrist')) return '#00ff88';
        } else if (type === 'situp') {
            if (name.includes('shoulder') || name.includes('hip') || name.includes('knee') || name.includes('elbow')) return '#ff4d4d';
        }
        return '#00ADB5';
    }
}
