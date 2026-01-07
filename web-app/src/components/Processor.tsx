'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { VideoPipeline } from '@/lib/videoPipeline';
import { Stack, Text, RingProgress, Center, ThemeIcon } from '@mantine/core';
import { IconCpu } from '@tabler/icons-react';

export function Processor() {
    const {
        originalFile, mode,
        setProgress, setResult, setStatus,
        progress, progressPhase
    } = useAppStore();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pipelineRef = useRef<VideoPipeline | null>(null);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (!originalFile || !videoRef.current || !canvasRef.current || hasStarted.current) return;

        hasStarted.current = true;
        const pipeline = new VideoPipeline(videoRef.current, canvasRef.current);
        pipelineRef.current = pipeline;

        // Hooks
        pipeline.onProgress = (phase, pct) => setProgress(phase, pct);
        pipeline.onComplete = (url) => {
            setResult(url);
            // Cleanup handled by store state change unmounting this component
        };

        // Start
        pipeline.setMode(mode);
        pipeline.process(originalFile).catch(err => {
            console.error(err);
            alert("Processing Failed: " + err.message);
            setStatus('idle');
        });

    }, [originalFile, mode, setProgress, setResult, setStatus]);

    // Labels
    const label = progressPhase === 'analyzing' ? 'Analyzing Movement...' : 'Generating Video...';
    const color = progressPhase === 'analyzing' ? 'cyan' : 'teal';

    return (
        <Center style={{ height: '60vh', flexDirection: 'column' }}>
            {/* Hidden workers */}
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
                <video ref={videoRef} playsInline crossOrigin="anonymous" />
                <canvas ref={canvasRef} width={1280} height={720} />
            </div>

            <Stack align="center" gap="md" className="glass-panel" p={40} style={{ borderRadius: 32 }}>
                <RingProgress
                    size={240}
                    thickness={16}
                    roundCaps
                    sections={[{ value: progress, color: color }]}
                    label={
                        <Center>
                            <ThemeIcon variant="light" radius="xl" size="xl" color={color}>
                                <IconCpu size={32} />
                            </ThemeIcon>
                        </Center>
                    }
                />
                <Text fz={24} fw={600} className="neon-text">{label}</Text>
                <Text c="dimmed">{progress.toFixed(0)}% Complete</Text>
            </Stack>
        </Center>
    );
}
