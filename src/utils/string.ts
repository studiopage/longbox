/**
 * Calculates string similarity using Levenshtein distance.
 * Returns 1.0 (exact match) to 0.0 (no match).
 */
export function getSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const costs = new Array();
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}

/**
 * Normalizes title for loose comparison.
 * Removes: casing, special chars, and leading 'the'.
 * Ex: "The Amazing Spider-Man (2018)" -> "amazingspiderman2018"
 */
export function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/^(the\s)/, '') // Remove leading "The "
    .replace(/[^a-z0-9]/g, ''); // Strip ALL non-alphanumeric
}


