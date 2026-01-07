const app = {
    video: null,
    canvas: null,
    ctx: null,
    detector: null,
    counter: null,
    rafId: null,
    currentMode: 'pushup',

    // State
    isProcessing: false,
    isAnalyzing: false,
    isEncoding: false,
    analysisData: [],
    analysisStep: 0.05,

    // Recording
    mediaRecorder: null,
    recordedChunks: [],

    init: async () => {
        try {
            app.video = document.getElementById('video');
            app.canvas = document.getElementById('canvas');
            app.ctx = app.canvas.getContext('2d');

            app.detector = new PoseDetector();
            app.counter = new ExerciseCounter();

            await app.detector.init();
            document.getElementById('loading').style.display = 'none';

            app.setupListeners();
        } catch (e) {
            console.error(e);
            alert("Init Error: " + e.message);
        }
    },

    setupListeners: () => {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                app.setMode(e.target.dataset.mode);
            });
        });

        document.getElementById('file-in').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                app.loadVideo(url);
            }
        });

        // When video ends during encoding, stop recorder
        app.video.addEventListener('ended', () => {
            if (app.isEncoding) {
                app.finishEncoding();
            }
        });
    },

    setMode: (mode) => {
        app.currentMode = mode;
        if (app.counter) app.counter.setMode(mode);
    },

    loadVideo: (src) => {
        if (app.rafId) cancelAnimationFrame(app.rafId);

        app.isProcessing = true;
        app.video.controls = false;

        // Important: Set the callback BEFORE src
        app.video.onloadedmetadata = () => {
            // Only auto-start analysis if we are in the initial processing state
            if (app.isProcessing && !app.isEncoding && !app.video.src.startsWith('blob:')) {
                app.startAnalysis();
            }
        };

        app.video.src = src;
    },

    reset: () => {
        if (app.mediaRecorder && app.mediaRecorder.state !== 'inactive') {
            app.mediaRecorder.stop();
        }
        app.isProcessing = false;
        app.isAnalyzing = false;
        app.isEncoding = false;

        app.video.pause();
        app.video.onloadedmetadata = null; // Clear handler
        app.video.removeAttribute('src');
        app.video.load();
        app.video.controls = true;

        app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
        if (app.counter) app.counter.reset();
        app.analysisData = [];

        app.updateUI({ count: 0, feedback: 'Ready', debug: '-' });

        const loader = document.getElementById('loading');
        loader.style.display = 'none';
        document.querySelector('.loading-text').innerText = "AI 모델 로딩중...";
    },

    // --- STEP 1: ANALYSIS ---
    startAnalysis: async () => {
        app.isAnalyzing = true;
        app.analysisData = [];
        app.counter.reset();

        const loader = document.getElementById('loading');
        const text = document.querySelector('.loading-text');
        loader.style.display = 'flex';

        const duration = app.video.duration;
        // Safety check
        if (!duration || duration === Infinity) {
            // Wait a bit or retry
            await new Promise(r => setTimeout(r, 500));
        }

        let currentTime = 0;

        // Prevent infinite loop if duration is weird
        const maxTime = app.video.duration || 600;

        while (currentTime <= maxTime) {
            text.innerText = `Analyzing... ${(currentTime / maxTime * 100).toFixed(0)}%`;

            app.video.currentTime = currentTime;
            await new Promise(r => {
                const onSeek = () => { app.video.removeEventListener('seeked', onSeek); r(); };
                app.video.addEventListener('seeked', onSeek);
            });
            await new Promise(r => setTimeout(r, 50));

            try {
                const poses = await app.detector.estimate(app.video);
                const validPoses = poses.filter(p => p.score > 0.1);

                let targetPose = null;
                if (validPoses.length > 0) {
                    targetPose = validPoses.reduce((prev, curr) => {
                        const getX = (p) => (p.keypoints[0]?.x || 0);
                        return (getX(curr) > getX(prev)) ? curr : prev;
                    });
                }

                let countRes = null;
                if (targetPose) {
                    countRes = app.counter.process(targetPose.keypoints, null, currentTime);
                }

                app.analysisData.push({
                    time: currentTime,
                    pose: targetPose,
                    result: countRes
                });

                app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
                app.ctx.drawImage(app.video, 0, 0, app.canvas.width, app.canvas.height);

            } catch (err) {
                console.error("Analysis Error", err);
            }

            currentTime += app.analysisStep;
        }

        app.isAnalyzing = false;
        app.startEncoding();
    },

    // --- STEP 2: ENCODING ---
    startEncoding: () => {
        app.isEncoding = true;
        const loader = document.getElementById('loading');
        const text = document.querySelector('.loading-text');
        text.innerText = "Creating Video Option... (Do not switch tabs)";

        const stream = app.canvas.captureStream(30);
        app.recordedChunks = [];

        const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? { mimeType: 'video/webm; codecs=vp9' }
            : { mimeType: 'video/webm' };

        app.mediaRecorder = new MediaRecorder(stream, options);

        app.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) app.recordedChunks.push(e.data);
        };

        app.mediaRecorder.start();

        app.video.currentTime = 0;
        app.video.muted = true;
        app.video.playbackRate = 1.0;
        app.video.play().catch(e => console.error("Play failed", e));

        app.renderForRecording();
    },

    renderForRecording: () => {
        if (!app.isEncoding) return;

        app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
        app.ctx.drawImage(app.video, 0, 0, app.canvas.width, app.canvas.height);

        const t = app.video.currentTime;
        const rawIndex = t / app.analysisStep;
        const index = Math.round(rawIndex);

        if (index >= 0 && index < app.analysisData.length) {
            const data = app.analysisData[index];
            if (data && data.pose) {
                const kpsToDraw = data.pose.keypoints.filter((k, i) => i >= 5 && i <= 14);
                app.detector.drawResults(app.ctx, kpsToDraw, app.currentMode);

                if (data.result) {
                    app.drawOverlayText(data.result);
                }
            }
        }

        const text = document.querySelector('.loading-text');
        if (text && app.video.duration) {
            text.innerText = `Generating Video... ${(t / app.video.duration * 100).toFixed(0)}%`;
        }

        requestAnimationFrame(app.renderForRecording);
    },

    drawOverlayText: (result) => {
        app.ctx.save();
        // Semi-transparent box
        app.ctx.fillStyle = "rgba(0,0,0,0.5)";
        app.ctx.beginPath();
        app.ctx.roundRect(20, 20, 250, 100, 10);
        app.ctx.fill();

        // Count
        app.ctx.fillStyle = "#00ff88"; // Neon green
        app.ctx.font = "bold 50px Arial";
        app.ctx.fillText(result.count, 40, 75);

        // status
        app.ctx.font = "20px Arial";
        app.ctx.fillStyle = "white";
        app.ctx.fillText(result.feedback, 40, 105);

        app.ctx.restore();
    },

    finishEncoding: () => {
        console.log("Encoding Finished.");
        app.isEncoding = false;
        app.mediaRecorder.stop();

        setTimeout(() => {
            const blob = new Blob(app.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // CRITICAL FIX: Disable callback before setting new src
            app.video.onloadedmetadata = null;

            app.video.src = url;
            app.video.muted = false;
            app.video.controls = true;
            app.video.currentTime = 0;
            app.video.loop = true; // Loop the result?

            const loader = document.getElementById('loading');
            loader.style.display = 'none';

            console.log("Swapped to Blob URL");

            // Should be ready to play manually
            alert("Video Ready! Press Play.");

        }, 500);
    },

    updateUI: (data) => {
        const countEl = document.getElementById('count-val');
        if (countEl) countEl.innerText = data.count;
    }
};

window.addEventListener('DOMContentLoaded', app.init);
