export interface BatchRunResult {
  batchId: string;
  baselineCount: number;
  finalCount: number;
  delta: number;
  target: number;
  success: boolean;
}

export function calculateBatchDelta(baselineCount: number, finalCount: number): number {
  return Math.max(0, finalCount - baselineCount);
}

export function shouldSkipBatch(existingCount: number, target: number): boolean {
  return existingCount >= target;
}

export function adjustBatchTarget(originalTarget: number, existingCount: number): number {
  return Math.max(0, originalTarget - existingCount);
}

export async function fetchRecipeCount(
  baseUrl: string,
  token: string,
  params: {
    tierLevel?: string;
    mainIngredient?: string;
    createdAfter?: string;
  }
): Promise<number> {
  const url = new URL(`${baseUrl}/api/admin/generate-bulk/recipe-count`);
  if (params.tierLevel) url.searchParams.set('tierLevel', params.tierLevel);
  if (params.mainIngredient) url.searchParams.set('mainIngredient', params.mainIngredient);
  if (params.createdAfter) url.searchParams.set('createdAfter', params.createdAfter);

  const resp = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(`Recipe count query failed: ${resp.status}`);
  }

  const data = await resp.json() as { count: number };
  return data.count;
}
