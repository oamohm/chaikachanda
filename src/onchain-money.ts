// Arc Studio onchain-money — BigInt formatting helpers

export class Amount {
  private constructor(private readonly raw: bigint, private readonly decimals: number) {}

  static fromRaw(raw: bigint, decimals: number): Amount {
    return new Amount(raw, decimals)
  }

  toFixed(dp = 2): string {
    const divisor = BigInt(10 ** this.decimals)
    const whole = this.raw / divisor
    const frac = this.raw % divisor
    const fracStr = frac.toString().padStart(this.decimals, '0').slice(0, dp)
    return `${whole}.${fracStr}`
  }

  toNumber(): number {
    return Number(this.raw) / 10 ** this.decimals
  }
}
