'use client';

import { Group, Text, SegmentedControl, Container } from '@mantine/core';
import { useAppStore } from '@/lib/store';
import { IconActivity } from '@tabler/icons-react';

export function Header() {
    const { mode, setMode, status } = useAppStore();
    const disabled = status !== 'idle' && status !== 'completed';

    return (
        <Container size="md" py="lg">
            <Group justify="space-between" align="center">
                <Group gap="xs">
                    <IconActivity size={28} color="#4ade80" />
                    <Text fw={700} fz="xl" variant="gradient" gradient={{ from: '#4ade80', to: '#2dd4bf', deg: 45 }}>
                        ROK-FIT AI
                    </Text>
                </Group>

                <SegmentedControl
                    disabled={disabled}
                    value={mode}
                    onChange={(val: any) => setMode(val)}
                    data={[
                        { label: 'Push-up', value: 'pushup' },
                        { label: 'Sit-up', value: 'situp' },
                    ]}
                    styles={{
                        root: { backgroundColor: 'rgba(255,255,255,0.1)' },
                        indicator: { backgroundColor: '#4ade80' }
                    }}
                />
            </Group>
        </Container>
    );
}
