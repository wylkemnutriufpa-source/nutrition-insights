import { ClinicalStrategy, FitJourneyStrategy, BiquiniBrancoStrategy, DefaultV3Strategy } from '../strategies';

export class ClinicalEngineFactory {
  private static strategies: Record<string, ClinicalStrategy> = {
    'fitjourney_protocol': new FitJourneyStrategy(),
    'biquini_branco_protocol': new BiquiniBrancoStrategy(),
    'default_v3': new DefaultV3Strategy()
  };

  static getStrategy(protocolType: string = 'default_v3'): ClinicalStrategy {
    return this.strategies[protocolType] || this.strategies['default_v3'];
  }

  static listAvailableStrategies() {
    return Object.values(this.strategies).map(s => ({ id: s.id, name: s.name }));
  }
}
