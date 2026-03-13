//apps/web/components/ui/TypewriterText.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export function TypewriterText({
  text,
  speed = 18,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setVisible('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setVisible(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{visible}</span>;
}
