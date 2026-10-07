// Every on-screen word, in one place.
//
// The technical readouts (pressures, modulus, density, mass, airflow) are
// creative values written for this spec film. Before any broadcast or paid use
// they must be replaced with figures substantiated by the product team and
// cleared by legal - advertising claims need evidence.

export const COPY = {
  hook: [
    { word: 'IMPACT', mode: 'solid' },
    { word: 'COMPRESS', mode: 'difference' },
    { word: 'RELEASE', mode: 'solid' },
    { word: '', mode: 'none' },
    { word: 'REPEAT', mode: 'difference' },
    { word: 'DYNAMIC', mode: 'solid' },
    { word: 'DY', mode: 'difference' },
    { word: 'NA', mode: 'difference' },
    { word: 'MIC', mode: 'difference' },
  ],
  hookHud: {
    left: 'AIR MAX Dn / DYNAMIC AIR',
    right: 'REAR CHAMBER',
  },
  matte: 'Dn',
  explode: {
    figure: 'FIG. 01',
    title: 'DYNAMIC AIR SYSTEM - EXPLODED',
  },
  callouts: {
    rearChamber: { title: 'REAR CHAMBER', unit: 'PSI', live: 'rear', note: 'HIGH PRESSURE / HEEL STRIKE' },
    frontChamber: { title: 'FRONT CHAMBER', unit: 'PSI', live: 'front', note: 'LOW PRESSURE / TRANSITION' },
    shank: { title: 'CARBON-TPU SHANK', value: 18.4, decimals: 1, unit: 'GPa', note: 'FLEX MODULUS / TORSIONAL LOCK' },
    midsole: { title: 'FOAM CARRIER', value: 0.21, decimals: 2, unit: 'g/cm3', note: 'CUSHIONING DENSITY' },
    upper: { title: 'ENGINEERED MESH', value: 340, decimals: 0, unit: 'L/m2/s', note: 'AIRFLOW / LOCKDOWN' },
  },
  velocity: {
    a: ['EVERY STEP', 'RE-TUNED.'],
    aBody: 'Four tubes. Two pressures. Tuned from heel strike to toe-off.',
    b: {
      left: { kicker: 'FRONT', line: ['LOW', 'PRESSURE'], note: 'Soft. Responsive. Rolls you forward.' },
      right: { kicker: 'REAR', line: ['HIGH', 'PRESSURE'], note: 'Stable. Supportive. Catches every landing.' },
    },
  },
  lockup: {
    brand: 'NIKE AIR MAX',
    model: 'Dn',
    edition: 'DYNAMIC AIR EDITION',
    tagline: 'FEEL THE UNREAL',
    release: 'AVAILABLE NOW',
    cta: 'NIKE.COM  /  SNKRS',
  },
} as const;
