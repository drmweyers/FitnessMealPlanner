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
  // Use POST to avoid ViteExpress HTML interception on GET requests in dev mode
  const resp = await fetch(`${baseUrl}/api/admin/generate-bulk/recipe-count`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    throw new Error(`Recipe count query failed: ${resp.status}`);
  }

  const data = await resp.json() as { count: number };
  return data.count;
}
