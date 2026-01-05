class ExerciseCounter {
    constructor() {
        this.reset();
        // MoveNet Keypoint Indices
        this.IDX = {
            NOSE: 0,
            L_SHOULDER: 5, R_SHOULDER: 6,
            L_ELBOW: 7, R_ELBOW: 8,
            L_WRIST: 9, R_WRIST: 10,
            L_HIP: 11, R_HIP: 12,
            L_KNEE: 13, R_KNEE: 14,
            L_ANKLE: 15, R_ANKLE: 16
        };
    }

    reset() {
        this.count = 0;
        this.state = 0; // 0: Start, 1: Action (Down/Up)
        this.feedback = "Ready";
        this.mode = 'pushup';
        this.debugText = "";
    }

    setMode(mode) {
        this.mode = mode;
        this.reset();
    }

    process(keypoints, ctx) {
        if (!keypoints) return;

        // Draw Debug Text on Canvas
        if (ctx) {
            ctx.font = '24px Arial';
            ctx.fillStyle = 'yellow';
            ctx.fillText(this.debugText, 20, 40);
        }

        if (this.mode === 'pushup') {
            this.processPushup(keypoints);
        } else if (this.mode === 'situp') {
            this.processSitup(keypoints);
        }

        return {
            count: this.count,
            feedback: this.feedback,
            debug: this.debugText
        };
    }

    getPoint(kps, idx) {
        // Lower threshold (0.2) for robustness, especially in difficult angles like sit-ups
        if (!kps[idx] || kps[idx].score < 0.1) return null;
        return kps[idx];
    }

    // --- PUSH-UP LOGIC ---
    processPushup(kps) {
        const ls = this.getPoint(kps, this.IDX.L_SHOULDER);
        const le = this.getPoint(kps, this.IDX.L_ELBOW);
        const lw = this.getPoint(kps, this.IDX.L_WRIST);

        const rs = this.getPoint(kps, this.IDX.R_SHOULDER);
        const re = this.getPoint(kps, this.IDX.R_ELBOW);
        const rw = this.getPoint(kps, this.IDX.R_WRIST);

        // Choose side with better visibility
        let side = null; // 'left' or 'right'
        let s, e, w; // shoulder, elbow, wrist

        const lScore = (ls?.score || 0) + (le?.score || 0) + (lw?.score || 0);
        const rScore = (rs?.score || 0) + (re?.score || 0) + (rw?.score || 0);

        if (lScore > rScore && lScore > 0.9) {
            side = 'left'; s = ls; e = le; w = lw;
        } else if (rScore > 0.9) {
            side = 'right'; s = rs; e = re; w = rw;
        }

        if (!side) {
            this.feedback = "No Pose";
            return;
        }

        const angle = this.calculateAngle(s, e, w);
        this.debugText = `Angle: ${Math.round(angle)}°`;

        // Logic
        // Down: Angle < 90
        // Up: Angle > 160
        if (angle <= 90) {
            if (this.state === 0 || this.state === 2) {
                this.state = 1;
                this.feedback = "Down ▼";
            }
        } else if (angle >= 160) {
            if (this.state === 1) {
                this.count++;
                this.state = 2;
                this.feedback = "Up ▲ (Count!)";
            } else {
                this.feedback = "Ready";
            }
        }
    }

    // --- SIT-UP LOGIC ---
    processSitup(kps) {
        // 1. Decide which side is visible (Left vs Right)
        const leftScore = (kps[this.IDX.L_SHOULDER]?.score || 0) + (kps[this.IDX.L_HIP]?.score || 0) + (kps[this.IDX.L_KNEE]?.score || 0);
        const rightScore = (kps[this.IDX.R_SHOULDER]?.score || 0) + (kps[this.IDX.R_HIP]?.score || 0) + (kps[this.IDX.R_KNEE]?.score || 0);

        const isLeft = leftScore > rightScore;
        const s = this.getPoint(kps, isLeft ? this.IDX.L_SHOULDER : this.IDX.R_SHOULDER);
        const h = this.getPoint(kps, isLeft ? this.IDX.L_HIP : this.IDX.R_HIP);
        const k = this.getPoint(kps, isLeft ? this.IDX.L_KNEE : this.IDX.R_KNEE);
        const nose = this.getPoint(kps, this.IDX.NOSE);

        if (!s || !h || !k) {
            this.feedback = "Pose?";
            this.debugText = "Need Side Body";
            return;
        }

        // 2. UP CHECK: Nose close to Knee
        // If nose is missing, fallback to Elbow-Knee? 
        // Or just use Shoulder-Knee distance getting small?
        // Let's stick to Nose-Knee if Nose exists, else Shoulder-Knee.

        let distTarget = 0;
        let distRef = Math.hypot(s.x - h.x, s.y - h.y); // Torso length

        if (nose) {
            distTarget = Math.hypot(nose.x - k.x, nose.y - k.y);
        } else {
            // Fallback: Shoulder to Knee
            distTarget = Math.hypot(s.x - k.x, s.y - k.y);
            // Relax threshold for Shoulder-Knee
            distRef = distRef * 1.5;
        }

        const normDist = distTarget / distRef;
        const isUp = normDist < 1.1; // < 1.1 means nose/shoulder is close to knee relative to torso

        // 3. DOWN CHECK: Torso Flat (Horizontal)
        // Check difference in Y between Shoulder and Hip
        const dy = Math.abs(s.y - h.y);
        const isDown = dy < 50;

        this.debugText = `Dist:${normDist.toFixed(2)} | Flat:${Math.round(dy)}`;

        // State Machine
        if (isDown) {
            if (this.state === 1) {
                this.state = 0;
                this.feedback = "Down (Reset)";
            } else {
                this.feedback = "Ready";
            }
        }

        if (isUp) {
            if (this.state === 0) {
                this.state = 1;
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
}
