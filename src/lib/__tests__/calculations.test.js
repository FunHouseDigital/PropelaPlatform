import { calculateCVScore, calculateFinalScore, calculateTier, calculateReadinessStatus } from '../calculations';

describe('calculateCVScore', () => {
  it('returns 0 when no scorecard fields are present', () => {
    expect(calculateCVScore({})).toBe(0);
    expect(calculateCVScore({ scorecardFields: {} })).toBe(0);
  });

  it('calculates weighted average of hospital, SANC, qualifications, specialisation', () => {
    const nurse = {
      scorecardFields: {
        hospitalExp: 4,
        sancStatus: 5,
        qualifications: 3,
        specialisation: 2,
      },
    };
    // (4*3 + 5*3 + 3*2 + 2*1) / 9 = (12+15+6+2)/9 = 35/9 = 3.888... => 3.9
    expect(calculateCVScore(nurse)).toBe(3.9);
  });

  it('returns max 5 when all fields are 5', () => {
    const nurse = {
      scorecardFields: {
        hospitalExp: 5,
        sancStatus: 5,
        qualifications: 5,
        specialisation: 5,
      },
    };
    expect(calculateCVScore(nurse)).toBe(5);
  });

  it('handles partial scorecard fields', () => {
    const nurse = {
      scorecardFields: {
        hospitalExp: 3,
        sancStatus: 0,
        qualifications: 4,
        specialisation: 0,
      },
    };
    // (3*3 + 0*3 + 4*2 + 0*1) / 9 = (9+0+8+0)/9 = 17/9 = 1.888... => 1.9
    expect(calculateCVScore(nurse)).toBe(1.9);
  });
});

describe('calculateFinalScore', () => {
  it('returns 0 when no scorecard fields or englishPts', () => {
    expect(calculateFinalScore({})).toBe(0);
    expect(calculateFinalScore({ scorecardFields: {} })).toBe(0);
  });

  it('calculates weighted average of all 8 criteria', () => {
    const nurse = {
      englishPts: 3,
      scorecardFields: {
        hospitalExp: 4,
        sancStatus: 5,
        qualifications: 3,
        specialisation: 2,
        financialReadiness: 4,
        motivation: 3,
        passport: 5,
      },
    };
    // (4*3 + 5*3 + 3*2 + 3*2 + 2*1 + 5*1 + 4*1 + 3*2) / 15
    // = (12+15+6+6+2+5+4+6)/15 = 56/15 = 3.733... => 3.7
    expect(calculateFinalScore(nurse)).toBe(3.7);
  });

  it('returns max 5 when all fields are 5', () => {
    const nurse = {
      englishPts: 5,
      scorecardFields: {
        hospitalExp: 5,
        sancStatus: 5,
        qualifications: 5,
        specialisation: 5,
        financialReadiness: 5,
        motivation: 5,
        passport: 5,
      },
    };
    expect(calculateFinalScore(nurse)).toBe(5);
  });
});

describe('calculateTier', () => {
  it('returns Tier 1 Priority for scores >= 4.0', () => {
    expect(calculateTier(4.0)).toBe('Tier 1 Priority');
    expect(calculateTier(5.0)).toBe('Tier 1 Priority');
    expect(calculateTier(4.5)).toBe('Tier 1 Priority');
  });

  it('returns Tier 1 Standard for scores 3.0-3.9', () => {
    expect(calculateTier(3.0)).toBe('Tier 1 Standard');
    expect(calculateTier(3.9)).toBe('Tier 1 Standard');
  });

  it('returns Tier 2 Development for scores 2.0-2.9', () => {
    expect(calculateTier(2.0)).toBe('Tier 2 Development');
    expect(calculateTier(2.9)).toBe('Tier 2 Development');
  });

  it('returns Tier 3 for scores 1.0-1.9', () => {
    expect(calculateTier(1.0)).toBe('Tier 3');
    expect(calculateTier(1.9)).toBe('Tier 3');
  });

  it('returns Not Suitable for scores below 1.0', () => {
    expect(calculateTier(0.9)).toBe('Not Suitable');
    expect(calculateTier(0)).toBe('Not Suitable');
  });
});

describe('calculateReadinessStatus', () => {
  it('returns Not Ready for early pipeline stages', () => {
    expect(calculateReadinessStatus('Applied')).toBe('Not Ready');
    expect(calculateReadinessStatus('CV Submitted')).toBe('Not Ready');
    expect(calculateReadinessStatus('Under Review')).toBe('Not Ready');
    expect(calculateReadinessStatus('Shortlisted - Yes')).toBe('Not Ready');
    expect(calculateReadinessStatus('OET Registered')).toBe('Not Ready');
    expect(calculateReadinessStatus('OET Failed')).toBe('Not Ready');
  });

  it('returns Placement Ready for OET Passed and Placement Ready stages', () => {
    expect(calculateReadinessStatus('OET Passed')).toBe('Placement Ready');
    expect(calculateReadinessStatus('Placement Ready')).toBe('Placement Ready');
  });

  it('returns Placed for Placed stage', () => {
    expect(calculateReadinessStatus('Placed')).toBe('Placed');
  });

  it('returns the stage name for exit states', () => {
    expect(calculateReadinessStatus('Deferred')).toBe('Deferred');
    expect(calculateReadinessStatus('Dropped Out')).toBe('Dropped Out');
    expect(calculateReadinessStatus('Recommended Pathway')).toBe('Recommended Pathway');
  });

  it('returns Not Ready for unknown stages', () => {
    expect(calculateReadinessStatus('Unknown Stage')).toBe('Not Ready');
    expect(calculateReadinessStatus('')).toBe('Not Ready');
  });
});
