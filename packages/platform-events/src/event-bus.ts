import type { DomainEvent, DomainEventHandler, DomainEventType } from './events.js';

export interface DomainEventBus {
  publish(event: DomainEvent): void;
  subscribe(handler: DomainEventHandler): () => void;
  subscribeToType<T extends DomainEventType>(
    type: T,
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>,
  ): () => void;
}

export function createDomainEventBus(): DomainEventBus {
  const handlers = new Set<DomainEventHandler>();
  const typedHandlers = new Map<DomainEventType, Set<DomainEventHandler>>();

  return {
    publish(event: DomainEvent): void {
      for (const handler of handlers) {
        handler(event);
      }

      const typeHandlers = typedHandlers.get(event.type);
      if (typeHandlers !== undefined) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }
    },

    subscribe(handler: DomainEventHandler): () => void {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    subscribeToType<T extends DomainEventType>(
      type: T,
      handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>,
    ): () => void {
      const existing = typedHandlers.get(type) ?? new Set<DomainEventHandler>();
      existing.add(handler as DomainEventHandler);
      typedHandlers.set(type, existing);

      return () => {
        const current = typedHandlers.get(type);
        current?.delete(handler as DomainEventHandler);
      };
    },
  };
}

export function createDomainEventId(): string {
  return crypto.randomUUID();
}
