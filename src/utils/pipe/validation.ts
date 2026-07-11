import { PipeConfigurationError } from './errors';
import { getPipeableMiddlewareMetadata } from './metadata';
import type { PipeMetadataSnapshot } from './metadata';
import { pipeRelationshipKeys } from './types';

type MiddlewareEdge = {
  readonly from: string;
  readonly to: string;
};

function equalIdentifierSets(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function equalMetadata(left: PipeMetadataSnapshot, right: PipeMetadataSnapshot): boolean {
  return (
    left.duplicate === right.duplicate &&
    equalIdentifierSets(left.adds, right.adds) &&
    equalIdentifierSets(left.after, right.after) &&
    equalIdentifierSets(left.before, right.before) &&
    equalIdentifierSets(left.requires, right.requires)
  );
}

function readMetadata(chain: readonly object[]): readonly PipeMetadataSnapshot[] {
  const metadata: PipeMetadataSnapshot[] = [];

  for (const middleware of chain) {
    const snapshot = getPipeableMiddlewareMetadata(middleware);
    if (snapshot === undefined) {
      throw new PipeConfigurationError(
        'INVALID_METADATA',
        'Pipe middleware must have registered metadata',
        { id: '', ids: [] },
      );
    }
    metadata.push(snapshot);
  }

  return metadata;
}

function validateDuplicateMetadata(metadata: readonly PipeMetadataSnapshot[]): void {
  const byId = new Map<string, PipeMetadataSnapshot[]>();

  for (const item of metadata) {
    const matches = byId.get(item.id);
    if (matches === undefined) {
      byId.set(item.id, [item]);
    } else {
      matches.push(item);
    }
  }

  for (const [id, matches] of byId) {
    const first = matches[0];
    if (first === undefined || matches.length < 2) {
      continue;
    }
    if (!matches.every((item) => item.duplicate === 'allow')) {
      throw new PipeConfigurationError(
        'DUPLICATE_MIDDLEWARE',
        `Pipe middleware ${id} is duplicated without every occurrence allowing duplicates`,
        { id, ids: [id] },
      );
    }
    if (!matches.every((item) => equalMetadata(first, item))) {
      throw new PipeConfigurationError(
        'DUPLICATE_MIDDLEWARE',
        `Pipe middleware ${id} has conflicting metadata`,
        { id, ids: [id] },
      );
    }
  }
}

function validateCapabilities(metadata: readonly PipeMetadataSnapshot[]): void {
  const available = new Set<string>();

  for (const item of metadata) {
    for (const capabilityId of item.requires) {
      if (!available.has(capabilityId)) {
        throw new PipeConfigurationError(
          'MISSING_CAPABILITY',
          `Pipe middleware ${item.id} requires unavailable capability ${capabilityId}`,
          { id: item.id, ids: [item.id, capabilityId] },
        );
      }
    }

    for (const capabilityId of item.adds) {
      if (available.has(capabilityId)) {
        throw new PipeConfigurationError(
          'DUPLICATE_CAPABILITY',
          `Pipe capability ${capabilityId} is added more than once`,
          { id: capabilityId, ids: [capabilityId] },
        );
      }
      available.add(capabilityId);
    }
  }
}

function createEdges(metadata: readonly PipeMetadataSnapshot[]): readonly MiddlewareEdge[] {
  const ids = new Set(metadata.map((item) => item.id));
  const edges: MiddlewareEdge[] = [];

  for (const item of metadata) {
    for (const relationship of pipeRelationshipKeys) {
      for (const target of item[relationship]) {
        if (ids.has(target)) {
          edges.push(
            relationship === 'before'
              ? { from: item.id, to: target }
              : { from: target, to: item.id },
          );
        }
      }
    }
  }

  return edges;
}

function findCycle(edges: readonly MiddlewareEdge[]): readonly string[] | undefined {
  const graph = new Map<string, Set<string>>();

  for (const edge of edges) {
    const targets = graph.get(edge.from);
    if (targets === undefined) {
      graph.set(edge.from, new Set([edge.to]));
    } else {
      targets.add(edge.to);
    }
  }

  const completed = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];

  function visit(id: string): readonly string[] | undefined {
    if (visiting.has(id)) {
      return [...path];
    }
    if (completed.has(id)) {
      return undefined;
    }

    visiting.add(id);
    path.push(id);
    for (const target of graph.get(id) ?? []) {
      const cycle = visit(target);
      if (cycle !== undefined) {
        return cycle;
      }
    }
    path.pop();
    visiting.delete(id);
    completed.add(id);
    return undefined;
  }

  for (const id of graph.keys()) {
    const cycle = visit(id);
    if (cycle !== undefined) {
      return cycle;
    }
  }

  return undefined;
}

function validateRelationshipOrder(metadata: readonly PipeMetadataSnapshot[]): void {
  const indexes = new Map<string, number[]>();

  for (const [index, item] of metadata.entries()) {
    const current = indexes.get(item.id);
    if (current === undefined) {
      indexes.set(item.id, [index]);
    } else {
      current.push(index);
    }
  }

  for (const [index, item] of metadata.entries()) {
    for (const relationship of pipeRelationshipKeys) {
      for (const target of item[relationship]) {
        for (const targetIndex of indexes.get(target) ?? []) {
          const isReversed = relationship === 'before'
            ? targetIndex <= index
            : targetIndex >= index;
          if (isReversed) {
            throw new PipeConfigurationError(
              'MIDDLEWARE_ORDER',
              `Pipe middleware ${item.id} must be declared ${relationship} ${target}`,
              { id: item.id, ids: [item.id, target] },
            );
          }
        }
      }
    }
  }
}

export function validatePipeMiddlewareChain(chain: readonly object[]): void {
  const metadata = readMetadata(chain);
  validateDuplicateMetadata(metadata);
  validateCapabilities(metadata);
  const cycle = findCycle(createEdges(metadata));
  if (cycle !== undefined) {
    throw new PipeConfigurationError(
      'MIDDLEWARE_CYCLE',
      'Pipe middleware relationships contain a cycle',
      { id: cycle[0] ?? '', ids: cycle },
    );
  }
  validateRelationshipOrder(metadata);
}

export function validatePipeMiddlewareAppend(
  chain: readonly object[],
  next: object,
): void {
  validatePipeMiddlewareChain([...chain, next]);
}
