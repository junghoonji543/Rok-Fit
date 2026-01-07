'use client';

import { useAppStore } from '@/lib/store';
import { Stack, Button, Group } from '@mantine/core';
import { IconRefresh, IconDownload } from '@tabler/icons-react';

export function ResultView() {
    const { resultUrl, reset } = useAppStore();

    if (!resultUrl) return null;

    return (
        <Stack align="center" mt="xl" gap="xl">
            <div className="glass-panel" style={{ padding: 10, borderRadius: 20, overflow: 'hidden' }}>
                <video
                    src={resultUrl}
                    controls
                    autoPlay
                    loop
                    style={{
                        borderRadius: 12,
                        display: 'block',
                        maxHeight: '65vh',
                        maxWidth: '100%',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                    }}
                />
            </div>

            <Group>
                <Button
                    variant="light" color="gray" size="lg" radius="xl"
                    leftSection={<IconRefresh size={20} />}
                    onClick={reset}
                >
                    Start Over
                </Button>
                <Button
                    component="a"
                    href={resultUrl}
                    download="rok-fit-analyzed.webm"
                    variant="gradient" gradient={{ from: 'teal', to: 'green', deg: 90 }}
                    size="lg" radius="xl"
                    leftSection={<IconDownload size={20} />}
                >
                    Download Video
                </Button>
            </Group>
        </Stack>
    );
}
