import { PoseDetector } from './poseDetector';
import { ExerciseCounter, ExerciseMode } from './exerciseCounter';
import * as poseDetection from '@tensorflow-models/pose-detection';

export type PipelineState = 'idle' | 'analyzing' | 'encoding' | 'completed';

export class VideoPipeline {
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private detector: PoseDetector;
    private counter: ExerciseCounter;

    // Data
    public analysisData: any[] = [];
    public analysisStep = 0.05;

    // Events
    public onProgress?: (phase: string, percent: number) => void;
    public onComplete?: (blobUrl: string) => void;

    constructor(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) {
        this.video = videoEl;
        this.canvas = canvasEl;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) throw new Error("No Canvas Context");
        this.ctx = ctx;

        this.detector = PoseDetector.getInstance();
        this.counter = new ExerciseCounter();
    }

    public setMode(mode: ExerciseMode) {
        this.counter.setMode(mode);
    }

    public async process(file: File) {
        await this.detector.init();

        const url = URL.createObjectURL(file);
        this.video.src = url;

        // Wait for metadata
        await new Promise<void>((resolve) => {
            this.video.onloadedmetadata = () => resolve();
        });

        // 1. Analyze
        await this.runAnalysis();

        // 2. Encode
        await this.runEncoding();
    }

    private async runAnalysis() {
        this.analysisData = [];
        this.counter.reset();

        const duration = this.video.duration || 10;
        let currentTime = 0;

        // Mute during process
        this.video.muted = true;
        this.video.pause();

        while (currentTime <= duration) {
            // Report Progress
            if (this.onProgress) this.onProgress('analyzing', Math.round((currentTime / duration) * 100));

            // Seek
            this.video.currentTime = currentTime;
            await new Promise<void>(r => {
                const onSeek = () => { this.video.removeEventListener('seeked', onSeek); r(); };
                this.video.addEventListener('seeked', onSeek);
            });

            // Wait for GPU logic (Seek complete) -> 50ms safely
            await new Promise(r => setTimeout(r, 50));

            // Estimate
            try {
                const poses = await this.detector.estimate(this.video);
                // Simple rightmost logic
                let target = null;
                const valid = poses.filter(p => (p.score || 0) > 0.1);
                if (valid.length > 0) {
                    target = valid.reduce((prev, curr) => (curr.keypoints[0].x > prev.keypoints[0].x) ? curr : prev);
                }

                let result = null;
                if (target) {
                    result = this.counter.process(target.keypoints, currentTime);
                }

                this.analysisData.push({
                    time: currentTime,
                    pose: target,
                    result: result
                });

                // Optional: Draw to canvas just so it's not empty, but we are analysis phase
                // this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            } catch (e) {
                console.error(e);
            }

            currentTime += this.analysisStep;
        }
    }

    private async runEncoding() {
        // Setup Recorder
        const stream = this.canvas.captureStream(30);
        const chunks: BlobPart[] = [];
        let recorder: MediaRecorder;

        try {
            recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        } catch (e) {
            recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.start();

        // Play for recording
        this.video.currentTime = 0;
        this.video.muted = true;

        // We'll use a promise to wait for 'ended'
        const playPromise = new Promise<void>((resolve) => {
            this.video.onended = () => resolve();
        });

        this.video.play();

        const drawLoop = () => {
            if (this.video.paused || this.video.ended) return;

            const t = this.video.currentTime;

            // Report
            if (this.onProgress && this.video.duration) {
                this.onProgress('encoding', Math.round((t / this.video.duration) * 100));
            }

            // Draw Video
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            // Draw Overlay
            const index = Math.round(t / this.analysisStep);
            const data = this.analysisData[index];
            if (data && data.pose) {
                this.detector.drawResults(this.ctx, data.pose.keypoints);
                if (data.result) {
                    this.drawHUD(data.result);
                }
            }

            requestAnimationFrame(drawLoop);
        };
        drawLoop();

        await playPromise;
        recorder.stop();

        // Wait for stop
        await new Promise(r => setTimeout(r, 500));

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        if (this.onComplete) this.onComplete(url);
    }

    private drawHUD(result: any) {
        const { count, feedback } = result;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.roundRect(20, 20, 250, 100, 16);
        this.ctx.fill();
        this.ctx.backdropFilter = 'blur(10px)'; // Not supported in 2d context directly usually, but good intent

        this.ctx.fillStyle = '#4ade80'; // Neon Green
        this.ctx.font = 'bold 48px Inter, sans-serif';
        this.ctx.fillText(count.toString(), 40, 75);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '500 20px Inter, sans-serif';
        this.ctx.fillText(feedback, 40, 105);

        this.ctx.restore();
    }
}
