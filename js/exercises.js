class ExerciseCounter {
    constructor() {
        this.IDX = {
            NOSE: 0,
            L_SHOULDER: 5, R_SHOULDER: 6,
            L_ELBOW: 7, R_ELBOW: 8,
            L_WRIST: 9, R_WRIST: 10,
            L_HIP: 11, R_HIP: 12,
            L_KNEE: 13, R_KNEE: 14,
            L_ANKLE: 15, R_ANKLE: 16
        };
        this.reset();
    }

    reset() {
        this.count = 0;
        this.state = 0; // 0: Start(Down), 1: Up/Action
        this.feedback = "Ready";
        this.debugText = "";
        this.lastCountTime = -1000;
        this.startTime = 0;
        this.minAngleEHK = 180;
    }

    setMode(mode) {
        this.mode = mode;
        this.reset();
    }

    getPoint(kps, idx) {
        if (!kps[idx] || kps[idx].score < 0.1) return null;
        return kps[idx];
    }

    process(keypoints, ctx, timestamp) {
        if (!keypoints) return;

        // 1. Warm-up
        if (timestamp < 3.0) {
            const timeLeft = 3 - Math.floor(timestamp);
            return { count: this.count, feedback: `Starting in ${timeLeft}...`, debug: "Warm-up" };
        }

        if (this.mode === 'pushup') {
            this.processPushup(keypoints, timestamp);
        } else if (this.mode === 'situp') {
            this.processSitup(keypoints, timestamp);
        }

        return {
            count: this.count,
            feedback: this.feedback,
            debug: this.debugText
        };
    }

    processPushup(kps, timestamp) {
        const ls = this.getPoint(kps, this.IDX.L_SHOULDER);
        const le = this.getPoint(kps, this.IDX.L_ELBOW);
        const lw = this.getPoint(kps, this.IDX.L_WRIST);
        const rs = this.getPoint(kps, this.IDX.R_SHOULDER);
        const re = this.getPoint(kps, this.IDX.R_ELBOW);
        const rw = this.getPoint(kps, this.IDX.R_WRIST);

        let s, e, w;
        const lScore = (ls?.score || 0) + (le?.score || 0) + (lw?.score || 0);
        const rScore = (rs?.score || 0) + (re?.score || 0) + (rw?.score || 0);
        if (lScore > rScore && lScore > 0.9) { s = ls; e = le; w = lw; }
        else if (rScore > 0.9) { s = rs; e = re; w = rw; }

        if (!s) { this.feedback = "Pose?"; return; }

        const angle = this.calculateAngle(s, e, w);
        this.debugText = `Angle: ${Math.round(angle)}°`;

        const UP_THRES = 160;
        const DOWN_THRES = 90;

        if (angle <= DOWN_THRES) {
            if (this.state === 0 || this.state === 2) {
                this.state = 1;
                this.feedback = "Down ▼";
            }
        } else if (angle >= UP_THRES) {
            if (this.state === 1) {
                this.count++;
                this.state = 2;
                this.feedback = "Up ▲";
            }
        }
    }

    processSitup(kps, timestamp) {
        const leftScore = (kps[this.IDX.L_HIP]?.score || 0) + (kps[this.IDX.L_KNEE]?.score || 0) + (kps[this.IDX.L_ELBOW]?.score || 0);
        const rightScore = (kps[this.IDX.R_HIP]?.score || 0) + (kps[this.IDX.R_KNEE]?.score || 0) + (kps[this.IDX.R_ELBOW]?.score || 0);

        const isLeft = leftScore > rightScore;
        const s = this.getPoint(kps, isLeft ? this.IDX.L_SHOULDER : this.IDX.R_SHOULDER);
        const h = this.getPoint(kps, isLeft ? this.IDX.L_HIP : this.IDX.R_HIP);
        const k = this.getPoint(kps, isLeft ? this.IDX.L_KNEE : this.IDX.R_KNEE);
        const e = this.getPoint(kps, isLeft ? this.IDX.L_ELBOW : this.IDX.R_ELBOW);

        if (!h || !k || !e || !s) {
            this.feedback = "Pose?";
            this.debugText = "Need Points";
            return;
        }

        const angleEHK = this.calculateAngle(e, h, k);
        const torsoLen = Math.hypot(s.x - h.x, s.y - h.y) || 1;
        const dy = Math.abs(s.y - h.y);
        const flatRatio = dy / torsoLen;

        const UP_ANGLE = 50;
        const DOWN_RATIO = 0.6; // Relaxed to 0.6 from 0.5

        const isUp = angleEHK < UP_ANGLE;
        const isDown = flatRatio < DOWN_RATIO;

        if (angleEHK < this.minAngleEHK) {
            this.minAngleEHK = angleEHK;
        }

        this.debugText = `Ang:${Math.round(angleEHK)} | Flat:${flatRatio.toFixed(2)}`;

        if (isDown) {
            if (this.state === 1) {
                this.state = 0;
                this.feedback = "Down (Reset)";
                this.minAngleEHK = 180;
            } else {
                if (this.minAngleEHK < 80 && this.minAngleEHK > UP_ANGLE) {
                    this.feedback = `No Count: Best ${Math.round(this.minAngleEHK)}°`;
                } else {
                    this.feedback = "Ready";
                }
                this.minAngleEHK = 180;
            }
        }
        else if (isUp) {
            if (this.state === 0) {
                // REDUCED DEBOUNCE to 0.4s
                if (timestamp - this.lastCountTime > 0.4) {
                    this.state = 1;
                    this.count++;
                    this.lastCountTime = timestamp;
                    this.feedback = "Sit-up! ▲";
                }
            } else {
                this.feedback = "Down Now ▼";
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
