const app = {
    video: null,
    canvas: null,
    ctx: null,
    detector: null,
    counter: null,
    rafId: null,
    currentMode: 'pushup',

    init: async () => {
        app.video = document.getElementById('video');
        app.canvas = document.getElementById('canvas');
        app.ctx = app.canvas.getContext('2d');

        // Initialize Modules
        app.detector = new PoseDetector();
        app.counter = new ExerciseCounter();

        await app.detector.init();
        document.getElementById('loading').style.display = 'none';

        // Event Listeners
        app.setupListeners();
    },

    setupListeners: () => {
        // Mode Selectors
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                app.setMode(e.target.dataset.mode);
            });
        });

        // File Input
        document.getElementById('file-in').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                app.loadVideo(url);
            }
        });

        // Video Metadata
        app.video.addEventListener('loadedmetadata', () => {
            app.canvas.width = app.video.videoWidth;
            app.canvas.height = app.video.videoHeight;
            app.video.play();
            app.loop();
        });
    },

    setMode: (mode) => {
        app.currentMode = mode;
        app.counter.setMode(mode);
        console.log("Mode changed to:", mode);
    },

    startCamera: async () => {
        if (app.rafId) cancelAnimationFrame(app.rafId);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            app.video.srcObject = stream;
            // Video metadata listener will trigger loop
        } catch (err) {
            alert("Camera Error: " + err.message);
        }
    },

    loadVideo: (src) => {
        if (app.rafId) cancelAnimationFrame(app.rafId);

        // Stop previous stream if any
        if (app.video.srcObject) {
            app.video.srcObject.getTracks().forEach(t => t.stop());
            app.video.srcObject = null;
        }

        app.video.src = src;
    },

    reset: () => {
        app.counter.reset();
        app.updateUI({ count: 0, feedback: 'Ready', debug: '-' });
    },

    loop: async () => {
        if (app.video.paused || app.video.ended) {
            app.rafId = requestAnimationFrame(app.loop);
            return;
        }

        const poses = await app.detector.estimate(app.video);

        // Draw
        app.detector.drawResults(app.ctx, poses, app.currentMode);

        // Count
        if (poses.length > 0) {
            const result = app.counter.process(poses[0].keypoints);
            if (result) app.updateUI(result);
        }

        app.rafId = requestAnimationFrame(app.loop);
    },

    updateUI: (data) => {
        document.getElementById('count-val').innerText = data.count;
        const statusEl = document.getElementById('status-val');
        statusEl.innerText = data.feedback;

        // Color update based on feedback
        if (data.feedback.includes('Count') || data.feedback.includes('Sit-up')) {
            statusEl.className = 'stat-value status-active';
        } else {
            statusEl.className = 'stat-value status-ready';
        }

        // Overlay update
        document.getElementById('feedback-overlay').innerText = data.feedback;

        // Debug update
        if (data.debug) {
            document.getElementById('debug-val').innerText = data.debug;
        }
    }
};

// Start App
window.addEventListener('DOMContentLoaded', app.init);
