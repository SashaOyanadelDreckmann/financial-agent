import { useState } from 'react';

export function Test() {
  const [v, setV] = useState('');

  return (
    <textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
    />
  );
}
