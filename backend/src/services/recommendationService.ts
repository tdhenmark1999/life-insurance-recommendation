import { logger } from '../utils/logger';

export interface UserProfile {
  age: number;
  income: number;
  dependents: number;
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  type: string;
  coverage: number;
  term: number;
  monthlyPremium: number;
}

export interface RecommendationResponse {
  recommendation: Recommendation;
  explanation: string;
  factors: {
    incomeMultiplier: number;
    dependentsFactor: number;
    riskAdjustment: number;
  };
}

interface PremiumFactors {
  basePremiumRate: number;
  ageFactor: number;
  termFactor: number;
  typeFactor: number;
  healthFactor: number;
}

export class RecommendationService {
  private readonly BASE_MULTIPLIERS = {
    young: 15,      
    midAge: 12,    
    mature: 10,     
    senior: 8       
  };

  private readonly RISK_ADJUSTMENTS = {
    low: 1.2,       
    medium: 1.0,    
    high: 0.8       
  };

  private readonly DEPENDENT_MULTIPLIER = 0.25; 
  private readonly MIN_COVERAGE = 100000;
  private readonly INCOME_CAP_MULTIPLIER = 30; 

  calculateRecommendation(profile: UserProfile): RecommendationResponse {
    logger.info('Calculating recommendation for profile', profile);

    const incomeMultiplier = this.getIncomeMultiplier(profile.age);
    
    const dependentsFactor = 1 + (profile.dependents * this.DEPENDENT_MULTIPLIER);

    const riskAdjustment = this.RISK_ADJUSTMENTS[profile.riskTolerance];

    let coverage = this.calculateCoverage(
      profile.income,
      incomeMultiplier,
      dependentsFactor,
      riskAdjustment
    );

    const term = this.determineTerm(profile.age);

    const insuranceType = this.determineInsuranceType(profile);

    const monthlyPremium = this.calculatePremium(
      profile.age,
      coverage,
      term,
      insuranceType,
      profile.riskTolerance
    );

    const explanation = this.generateExplanation(
      profile,
      coverage,
      term,
      insuranceType,
      { incomeMultiplier, dependentsFactor, riskAdjustment }
    );

    logger.info('Recommendation calculated', {
      type: insuranceType,
      coverage,
      term,
      monthlyPremium
    });

    return {
      recommendation: {
        type: insuranceType,
        coverage,
        term,
        monthlyPremium
      },
      explanation,
      factors: {
        incomeMultiplier,
        dependentsFactor,
        riskAdjustment
      }
    };
  }

  private getIncomeMultiplier(age: number): number {
    if (age < 30) return this.BASE_MULTIPLIERS.young;
    if (age < 40) return this.BASE_MULTIPLIERS.midAge;
    if (age < 50) return this.BASE_MULTIPLIERS.mature;
    return this.BASE_MULTIPLIERS.senior;
  }

  private calculateCoverage(
    income: number,
    incomeMultiplier: number,
    dependentsFactor: number,
    riskAdjustment: number
  ): number {
    let coverage = income * incomeMultiplier * dependentsFactor * riskAdjustment;
    
    coverage = Math.round(coverage / 10000) * 10000;
    
    coverage = Math.max(coverage, this.MIN_COVERAGE);
    
    const maxCoverage = income * this.INCOME_CAP_MULTIPLIER;
    coverage = Math.min(coverage, maxCoverage);
    
    return coverage;
  }

  private determineTerm(age: number): number {
    if (age < 35) return 30;
    if (age < 45) return 20;
    if (age < 55) return 15;
    return 10;
  }

  private determineInsuranceType(profile: UserProfile): string {
    if (profile.riskTolerance === 'low' && profile.income > 150000) {
      return 'Whole Life';
    }
    
    if (profile.riskTolerance === 'medium' && profile.income > 200000 && profile.age < 50) {
      return 'Universal Life';
    }
    
    return 'Term Life';
  }

  private calculatePremium(
    age: number,
    coverage: number,
    term: number,
    type: string,
    riskTolerance: string
  ): number {
    const factors = this.getPremiumFactors(age, term, type);
    
    const coverageUnits = coverage / 1000;
    let monthlyPremium = coverageUnits * factors.basePremiumRate;
    
    monthlyPremium *= factors.ageFactor;
    monthlyPremium *= factors.termFactor;
    monthlyPremium *= factors.typeFactor;
    monthlyPremium *= factors.healthFactor;
    
    if (riskTolerance === 'high') {
      monthlyPremium *= 0.95; 
    } else if (riskTolerance === 'low') {
      monthlyPremium *= 1.05; 
    }
    
    return Math.round(monthlyPremium);
  }

  private getPremiumFactors(age: number, term: number, type: string): PremiumFactors {
    const basePremiumRate = 0.5;
    
    const ageFactor = Math.pow(1.045, age - 25);
    
    let termFactor = 1.0;
    switch (term) {
      case 10: termFactor = 1.2; break;
      case 15: termFactor = 1.1; break;
      case 20: termFactor = 1.0; break;
      case 30: termFactor = 0.9; break;
    }
    
    let typeFactor = 1.0;
    switch (type) {
      case 'Term Life': typeFactor = 1.0; break;
      case 'Whole Life': typeFactor = 3.5; break;
      case 'Universal Life': typeFactor = 2.5; break;
    }
    
    const healthFactor = 1.0;
    
    return {
      basePremiumRate,
      ageFactor,
      termFactor,
      typeFactor,
      healthFactor
    };
  }

  private generateExplanation(
    profile: UserProfile,
    coverage: number,
    term: number,
    type: string,
    factors: any
  ): string {
    const explanations: string[] = [];

    if (profile.age < 35) {
      explanations.push(
        `At ${profile.age} years old, you're in a prime age for securing affordable life insurance. ` +
        `We recommend a ${term}-year term to provide coverage through your key earning years.`
      );
    } else if (profile.age < 50) {
      explanations.push(
        `At ${profile.age} years old, life insurance is crucial for protecting your family's financial future. ` +
        `A ${term}-year term aligns well with your remaining working years.`
      );
    } else {
      explanations.push(
        `At ${profile.age} years old, a ${term}-year term provides essential coverage ` +
        `while keeping premiums manageable as you approach retirement.`
      );
    }

    explanations.push(
      `Based on your annual income of $${profile.income.toLocaleString()}, ` +
      `we applied a ${factors.incomeMultiplier}x multiplier. This ensures your loved ones ` +
      `can maintain their current lifestyle and meet long-term financial obligations.`
    );

    if (profile.dependents > 0) {
      const dependentText = profile.dependents === 1 ? 'dependent' : 'dependents';
      explanations.push(
        `With ${profile.dependents} ${dependentText}, we've increased your coverage by ` +
        `${((factors.dependentsFactor - 1) * 100).toFixed(0)}% to account for education costs, ` +
        `childcare, and other family expenses.`
      );
    } else {
      explanations.push(
        `While you have no dependents, life insurance can still cover final expenses, ` +
        `outstanding debts, and provide for any future family plans.`
      );
    }

    const riskExplanations = {
      low: `Your conservative risk preference indicates a focus on maximum protection. ` +
           `We've adjusted your coverage upward to provide additional security.`,
      medium: `Your balanced risk tolerance allows for a standard coverage approach ` +
              `that provides solid protection without over-insuring.`,
      high: `Your higher risk tolerance suggests you may have other investments in place. ` +
            `We've recommended efficient coverage that complements your overall financial strategy.`
    };
    explanations.push(riskExplanations[profile.riskTolerance]);

    if (type === 'Whole Life') {
      explanations.push(
        `Given your income level and conservative approach, whole life insurance provides ` +
        `permanent coverage with a cash value component that grows tax-deferred over time.`
      );
    } else if (type === 'Universal Life') {
      explanations.push(
        `Universal life insurance offers flexibility in premiums and death benefits, ` +
        `along with a cash value component that can supplement your retirement planning.`
      );
    } else {
      explanations.push(
        `Term life insurance provides the most affordable way to secure maximum coverage ` +
        `during your working years when your family needs it most.`
      );
    }

    explanations.push(
      `The recommended coverage of $${coverage.toLocaleString()} represents a careful balance ` +
      `of your income replacement needs, family obligations, and premium affordability.`
    );

    return explanations.join(' ');
  }

  async getMLRecommendation(profile: UserProfile): Promise<RecommendationResponse> {
    logger.info('ML recommendation requested - falling back to rules-based system');
    return this.calculateRecommendation(profile);
  }

  adjustForHealthFactors(
    recommendation: RecommendationResponse,
    healthData: any
  ): RecommendationResponse {
    return recommendation;
  }

  compareOptions(profile: UserProfile): any[] {
    const baseRecommendation = this.calculateRecommendation(profile);
    
    const alternatives = [
      {
        ...baseRecommendation,
        label: 'Recommended',
        priority: 1
      },
      {
        ...this.calculateRecommendation({
          ...profile,
          riskTolerance: 'low'
        }),
        label: 'Maximum Protection',
        priority: 2
      },
      {
        ...this.calculateRecommendation({
          ...profile,
          riskTolerance: 'high'
        }),
        label: 'Budget-Friendly',
        priority: 3
      }
    ];
    
    return alternatives;
  }
}