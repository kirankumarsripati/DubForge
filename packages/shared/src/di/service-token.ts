export interface ServiceToken<T> {
  readonly id: symbol;
  readonly description: string;
  readonly _type?: T;
}

export function createToken<T>(description: string): ServiceToken<T> {
  return {
    id: Symbol(description),
    description,
  };
}
