'use client';

import {
  financialClarityMap,
  decisionStyleMap,
  timeHorizonMap,
  financialPressureMap,
  emotionalPatternMap,
} from '@/lib/diagnosis.i18n';

interface FinancialProfile {
  financialClarity: keyof typeof financialClarityMap;
  decisionStyle: keyof typeof decisionStyleMap;
  timeHorizon: keyof typeof timeHorizonMap;
  financialPressure: keyof typeof financialPressureMap;
  emotionalPattern: keyof typeof emotionalPatternMap;
  coherenceScore: number;
}

interface FinancialProfileCardProps {
  profile: FinancialProfile;
}

export function FinancialProfileCard({
  profile,
}: FinancialProfileCardProps) {
  return (
    <section className="app-section animate-fade-in">
      <h2 className="text-muted text-small">
        Perfil financiero inferido
      </h2>

      <div className="home-card" style={{ marginTop: 24 }}>
        <ul style={{ lineHeight: 1.8, fontSize: 15 }}>
          <li>
            <strong>Claridad financiera:</strong>{' '}
            {financialClarityMap[profile.financialClarity]}
          </li>

          <li>
            <strong>Estilo de decisión:</strong>{' '}
            {decisionStyleMap[profile.decisionStyle]}
          </li>

          <li>
            <strong>Horizonte temporal:</strong>{' '}
            {timeHorizonMap[profile.timeHorizon]}
          </li>

          <li>
            <strong>Presión financiera:</strong>{' '}
            {financialPressureMap[profile.financialPressure]}
          </li>

          <li>
            <strong>Patrón emocional:</strong>{' '}
            {emotionalPatternMap[profile.emotionalPattern]}
          </li>

          <li>
            <strong>Coherencia interna:</strong>{' '}
            {(profile.coherenceScore * 100).toFixed(0)}%
          </li>
        </ul>
      </div>
    </section>
  );
}
