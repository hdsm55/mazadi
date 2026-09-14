// Money domain — integer minor units only. No floats.

export interface Money {
  amountMinor: number;
  currency: string;
}

export function toMinor(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromMinor(amountMinor: number): number {
  return amountMinor / 100;
}

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(fromMinor(amountMinor));
}

// Default bid increment ladder (configurable per auction/tenant).
export interface IncrementStep {
  fromMinor: number;
  toMinor: number | null; // null = unbounded
  incrementMinor: number;
}

export const DEFAULT_INCREMENT_LADDER: IncrementStep[] = [
  { fromMinor: 0, toMinor: 10000, incrementMinor: 500 }, // 0–100 => +5
  { fromMinor: 10000, toMinor: 50000, incrementMinor: 1000 }, // 100–500 => +10
  { fromMinor: 50000, toMinor: 100000, incrementMinor: 2500 }, // 500–1000 => +25
  { fromMinor: 100000, toMinor: 500000, incrementMinor: 5000 }, // 1000–5000 => +50
  { fromMinor: 500000, toMinor: null, incrementMinor: 10000 }, // 5000+ => +100
];

export function nextIncrement(
  currentMinor: number,
  ladder: IncrementStep[] = DEFAULT_INCREMENT_LADDER,
): number {
  for (const step of ladder) {
    if (currentMinor >= step.fromMinor && (step.toMinor === null || currentMinor < step.toMinor)) {
      return step.incrementMinor;
    }
  }
  return ladder[ladder.length - 1].incrementMinor;
}

export function nextValidBidAmount(currentMinor: number, ladder: IncrementStep[] = DEFAULT_INCREMENT_LADDER): number {
  return currentMinor + nextIncrement(currentMinor, ladder);
}
