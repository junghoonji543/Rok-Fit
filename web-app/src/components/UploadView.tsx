'use client';

import { Group, Text, Stack } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconCloudUpload, IconMovie, IconX } from '@tabler/icons-react';
import { useAppStore } from '@/lib/store';

export function UploadView() {
    const { setFile, setStatus } = useAppStore();

    const handleDrop = (files: File[]) => {
        if (files[0]) {
            setFile(files[0]);
            setStatus('analyzing'); // Trigger start
        }
    };

    return (
        <Stack align="center" mt={40} gap="xl">
            <Stack gap={0} align="center">
                <Text fz={48} fw={900} className="neon-text" ta="center">
                    Analyze Your Form
                </Text>
                <Text c="dimmed" fz="lg" ta="center" maw={500}>
                    Upload your workout video. AI will burn the rep counts and pose skeleton directly into a new high-quality video.
                </Text>
            </Stack>

            <Dropzone
                onDrop={handleDrop}
                onReject={() => alert('Video files only please!')}
                maxSize={200 * 1024 * 1024}
                accept={[MIME_TYPES.mp4, 'video/webm', 'video/quicktime']}
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: 600,
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 24,
                    cursor: 'pointer'
                }}
            >
                <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                        <IconCloudUpload size={50} color="#4ade80" stroke={1.5} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                        <IconX size={50} color="red" stroke={1.5} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                        <IconMovie size={50} color="white" stroke={1.5} />
                    </Dropzone.Idle>

                    <Stack gap="xs" style={{ textAlign: 'center' }}>
                        <Text size="xl" inline>
                            Drag video here or click to select
                        </Text>
                        <Text size="sm" c="dimmed" inline>
                            MP4, WebM supported
                        </Text>
                    </Stack>
                </Group>
            </Dropzone>
        </Stack>
    );
}
