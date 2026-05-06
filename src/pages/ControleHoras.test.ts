import { describe, it, expect } from 'vitest';
import { calculateProjectRhythm, shouldRunAIPrediction, Sessao } from './ControleHoras';
import { subDays, startOfToday, formatISO } from 'date-fns';

describe('AI Prediction Logic', () => {
  const today = startOfToday();

  const createSessao = (daysAgo: number, minutes: number): Sessao => ({
    id: Math.random().toString(),
    projeto_id: 'proj-1',
    etapa: 'Briefing',
    responsavel: 'Leandro',
    inicio: formatISO(subDays(today, daysAgo)),
    fim: null,
    duracao_minutos: minutes,
    observacao: null
  });

  describe('calculateProjectRhythm', () => {
    it('should calculate rhythm correctly based on last 7 days', () => {
      const sessoes: Sessao[] = [
        createSessao(1, 60), // 1h yesterday
        createSessao(2, 120), // 2h two days ago
        createSessao(8, 300), // 5h eight days ago (should be ignored)
      ];
      
      const rhythm = calculateProjectRhythm(sessoes);
      // (1h + 2h) / 7 days = 3/7 = ~0.428h/day
      expect(rhythm).toBeCloseTo(3/7);
    });

    it('should return 0 if no sessions in last 7 days', () => {
      const sessoes: Sessao[] = [
        createSessao(8, 300),
      ];
      const rhythm = calculateProjectRhythm(sessoes);
      expect(rhythm).toBe(0);
    });
  });

  describe('shouldRunAIPrediction', () => {
    it('should return true when there are at least 3 sessions and rhythm is positive', () => {
      const sessoes = [createSessao(1, 60), createSessao(2, 60), createSessao(3, 60)];
      const rhythm = 1;
      expect(shouldRunAIPrediction(sessoes, rhythm)).toBe(true);
    });

    it('should return false when there are fewer than 3 sessions', () => {
      const sessoes = [createSessao(1, 60), createSessao(2, 60)];
      const rhythm = 1;
      expect(shouldRunAIPrediction(sessoes, rhythm)).toBe(false);
    });

    it('should return false when rhythm is 0', () => {
      const sessoes = [createSessao(1, 60), createSessao(2, 60), createSessao(3, 60)];
      const rhythm = 0;
      expect(shouldRunAIPrediction(sessoes, rhythm)).toBe(false);
    });

    it('should return false when rhythm is negative', () => {
      const sessoes = [createSessao(1, 60), createSessao(2, 60), createSessao(3, 60)];
      const rhythm = -0.5;
      expect(shouldRunAIPrediction(sessoes, rhythm)).toBe(false);
    });

    it('should return false when both conditions are unmet', () => {
      const sessoes = [createSessao(1, 60)];
      const rhythm = 0;
      expect(shouldRunAIPrediction(sessoes, rhythm)).toBe(false);
    });
  });
});
