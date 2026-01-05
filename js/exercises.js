class ExerciseCounter {
    constructor() {
        this.reset();
    }

    reset() {
        this.count = 0;
        this.state = 0; // 0: Idle/Start, 1: Down/Action, 2: Up/Complete
        this.feedback = "Ready";
        this.mode = 'pushup'; // 'pushup' or 'situp'
    }

    setMode(mode) {
        this.mode = mode;
        this.reset();
    }

    process(keypoints) {
        if (!keypoints || keypoints.length === 0) return;

        const kps = this.keypointsToMap(keypoints);

        if (this.mode === 'pushup') {
            this.processPushup(kps);
        } else if (this.mode === 'situp') {
            this.processSitup(kps);
        }

        return {
            count: this.count,
            feedback: this.feedback,
            debug: this.getDebugInfo(kps)
        };
    }

    keypointsToMap(keypoints) {
        const map = {};
        keypoints.forEach(kp => {
            map[kp.name] = { x: kp.x, y: kp.y, score: kp.score };
        });
        return map;
    }

    // --- PUSH-UP LOGIC ---
    processPushup(kps) {
        // Need Shoulder, Elbow, Wrist
        // Check availability (left or right)
        const leftConf = (kps['left_shoulder'].score + kps['left_elbow'].score + kps['left_wrist'].score) / 3;
        const rightConf = (kps['right_shoulder'].score + kps['right_elbow'].score + kps['right_wrist'].score) / 3;

        const side = leftConf > rightConf ? 'left' : 'right';
        const s = kps[`${side}_shoulder`];
        const e = kps[`${side}_elbow`];
        const w = kps[`${side}_wrist`];

        if (s.score < 0.3 || e.score < 0.3 || w.score < 0.3) {
            this.feedback = "No Pose";
            return;
        }

        const angle = this.calculateAngle(s, e, w);

        // State Machine
        // State 0: Ready (Up)
        // State 1: Down (Angle < 90) -> trigger "UP" readiness

        if (angle <= 90) {
            if (this.state === 0 || this.state === 2) {
                this.state = 1; // Down
                this.feedback = "Down ▼";
            }
        } else if (angle >= 160) {
            if (this.state === 1) {
                this.count++;
                this.state = 2; // Up
                this.feedback = "Up ▲ (Count!)";
                // Play sound?
            } else {
                this.feedback = "Ready";
            }
        }
    }

    // --- SIT-UP LOGIC ---
    processSitup(kps) {
        // Logic: 
        // UP: Elbow close to Knee
        // DOWN: Shoulders on ground (Torso horizontal)

        const leftConf = (kps['left_shoulder'].score + kps['left_hip'].score + kps['left_knee'].score) / 3;
        const rightConf = (kps['right_shoulder'].score + kps['right_hip'].score + kps['right_knee'].score) / 3;

        const side = leftConf > rightConf ? 'left' : 'right';
        const s = kps[`${side}_shoulder`];
        const h = kps[`${side}_hip`];
        const e = kps[`${side}_elbow`];
        const k = kps[`${side}_knee`];


        if (s.score < 0.3 || h.score < 0.3 || e.score < 0.3 || k.score < 0.3) {
            this.feedback = "No Pose";
            return;
        }

        // 1. Check DOWN state (Lying down)
        // Calculate Torso Angle relative to horizontal
        // (If y difference is small, it's horizontal)
        const torsoAngle = Math.abs(Math.atan2(s.y - h.y, s.x - h.x) * 180 / Math.PI);
        // Horizontal means angle is near 0 or 180. Vertical means near 90.
        // Actually, atan2(dy, dx). If lying flat, dy is small. S.y approx H.y.

        const isLyingDown = Math.abs(s.y - h.y) < 50; // Simple pixel diff heuristic or use angle
        // Better: Use angle. If lying flat, angle is < 30 or > 150.
        const isTorsoFlat = (torsoAngle < 30 || torsoAngle > 150);

        // 2. Check UP state (Elbow-Knee touch)
        const distEK = Math.hypot(e.x - k.x, e.y - k.y);
        // Normalize distance by leg length or torso length to be scale invariant? 
        // For now, use raw pixel threshold assuming standard distance, or normalize by Shoulder-Hip dist.
        const distTorso = Math.hypot(s.x - h.x, s.y - h.y);
        const normDist = distEK / distTorso; // If < 0.5 (Elbow is close to Knee relative to body size)

        const isTouching = normDist < 0.8; // Threshold to be tuned

        // State Machine
        if (isTorsoFlat) {
            if (this.state === 1) { // Was Up?
                // Resetting for next rep
                this.state = 0; // Ready / Down
                this.feedback = "Down (Reset)";
            } else {
                this.feedback = "Ready";
                this.state = 0;
            }
        }

        if (isTouching) {
            if (this.state === 0) {
                this.state = 1; // Up
                this.count++;
                this.feedback = "Sit-up! ▲";
            }
        }
    }

    calculateAngle(a, b, c) {
        const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let ang = Math.abs(rad * 180.0 / Math.PI);
        if (ang > 180.0) ang = 360 - ang;
        return ang;
    }

    getDebugInfo(kps) {
        if (this.mode === 'situp') {
            // Return relevant values for debugging
            // Using 'left' or 'right' logic duplicated here for brevity, practically should be stored class prop
            const s = kps['left_shoulder'];
            const h = kps['left_hip'];
            const e = kps['left_elbow'];
            const k = kps['left_knee'];
            if (!s) return "-";

            const distEK = Math.hypot(e.x - k.x, e.y - k.y);
            const distTorso = Math.hypot(s.x - h.x, s.y - h.y);
            const normDist = (distEK / distTorso).toFixed(2);
            const torsoDiff = Math.abs(s.y - h.y).toFixed(0);

            return `EK:${normDist} | TorsoY:${torsoDiff}`;
        }
        return "-";
    }
}
