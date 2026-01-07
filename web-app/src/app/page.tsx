'use client';

import { Container } from '@mantine/core';
import { Header } from '@/components/Header';
import { UploadView } from '@/components/UploadView';
import { Processor } from '@/components/Processor';
import { ResultView } from '@/components/ResultView';
import { useAppStore } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const { status } = useAppStore();

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top right, #111827, #000)' }}>
      <Header />

      <Container size="lg" pb="xl">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <UploadView />
            </motion.div>
          )}
          {(status === 'analyzing' || status === 'encoding') && (
            <motion.div key="proc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Processor />
            </motion.div>
          )}
          {status === 'completed' && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <ResultView />
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </main>
  );
}
