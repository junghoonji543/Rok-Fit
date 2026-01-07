import { Keypoint } from '@tensorflow-models/pose-detection';

export type ExerciseMode = 'pushup' | 'situp';

export interface CountResult {
    count: number;
    feedback: string;
    debug: string;
}

export class ExerciseCounter {
    private mode: ExerciseMode;
    private count: number = 0;
    private state: number = 0; // 0: Start, 1: Action, 2: Return
    private feedback: string = "Ready";
    private debugText: string = "";

    private lastCountTime: number = -1;
    private minAngleEHK: number = 180;

    // Indices for MoveNet
    private IDX = {
        NOSE: 0,
        L_SHOULDER: 5, R_SHOULDER: 6,
        L_ELBOW: 7, R_ELBOW: 8,
        L_WRIST: 9, R_WRIST: 10,
        L_HIP: 11, R_HIP: 12,
        L_KNEE: 13, R_KNEE: 14,
        L_ANKLE: 15, R_ANKLE: 16
    };

    constructor(mode: ExerciseMode = 'pushup') {
        this.mode = mode;
    }

    public setMode(mode: ExerciseMode) {
        this.mode = mode;
        this.reset();
    }

    public reset() {
        this.count = 0;
        this.state = 0;
        this.feedback = "Ready";
        this.debugText = "";
        this.lastCountTime = -1000;
        this.minAngleEHK = 180;
    }

    public getCount() { return this.count; }

    public process(keypoints: Keypoint[], timestamp: number): CountResult {
        if (!keypoints || keypoints.length === 0) return { count: this.count, feedback: "No Pose", debug: "" };

        // Warm-up check (simple timestamp check)
        // If we want real warm-up logic, handle in UI or here

        if (this.mode === 'pushup') {
            this.processPushup(keypoints);
        } else if (this.mode === 'situp') {
            this.processSitup(keypoints, timestamp);
        }

        return {
            count: this.count,
            feedback: this.feedback,
            debug: this.debugText
        };
    }

    private getPoint(kps: Keypoint[], idx: number) {
        if (!kps[idx] || (kps[idx].score || 0) < 0.1) return null;
        return kps[idx];
    }

    private calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint) {
        const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let ang = Math.abs(rad * 180.0 / Math.PI);
        if (ang > 180.0) ang = 360 - ang;
        return ang;
    }

    private processPushup(kps: Keypoint[]) {
        const ls = this.getPoint(kps, this.IDX.L_SHOULDER);
        const le = this.getPoint(kps, this.IDX.L_ELBOW);
        const lw = this.getPoint(kps, this.IDX.L_WRIST);
        const rs = this.getPoint(kps, this.IDX.R_SHOULDER);
        const re = this.getPoint(kps, this.IDX.R_ELBOW);
        const rw = this.getPoint(kps, this.IDX.R_WRIST);

        let s, e, w;
        const lScore = (ls?.score || 0) + (le?.score || 0) + (lw?.score || 0);
        const rScore = (rs?.score || 0) + (re?.score || 0) + (rw?.score || 0);

        // Pick better side
        if (lScore > rScore && lScore > 0.9) { s = ls; e = le; w = lw; }
        else if (rScore > 0.9) { s = rs; e = re; w = rw; }

        if (!s || !e || !w) { this.feedback = "Pose?"; return; }

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

    private processSitup(kps: Keypoint[], timestamp: number) {
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
        const DOWN_RATIO = 0.6;

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
            } else { // Already Down logic
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
                // Debounce
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
}
