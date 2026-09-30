import React from 'react';
import { motion } from 'framer-motion';

/**
 * Indicador de "pensando": 3 puntos animados para respuestas de agentes IA.
 */
const ThinkingDots: React.FC = () => {
  return (
    <span
      role="status"
      aria-label="El asistente está pensando"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-secondary)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
};

export default ThinkingDots;
