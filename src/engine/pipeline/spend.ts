// A daily spending cap. Each answer's cost is added as it happens; once the day's limit is
// reached, questions get Margin's free answer (the passage and a checked note) until tomorrow.

export interface SpendStore {
  today(): Promise<number>;
  add(usd: number): Promise<void>;
}

const day = () => new Date().toISOString().slice(0, 10);

export function memorySpend(): SpendStore {
  let date = day();
  let usd = 0;
  const roll = () => { if (date !== day()) { date = day(); usd = 0; } };
  return {
    today: async () => { roll(); return usd; },
    add: async (n) => { roll(); usd += n; },
  };
}

// Kept in a small JSON file so the tally survives restarts on a single server.
export function fileSpend(path: string): SpendStore {
  const read = async (): Promise<{ date: string; usd: number }> => {
    try {
      const { readFile } = await import('node:fs/promises');
      const v = JSON.parse(await readFile(path, 'utf8'));
      return v.date === day() ? v : { date: day(), usd: 0 };
    } catch {
      return { date: day(), usd: 0 };
    }
  };
  return {
    today: async () => (await read()).usd,
    async add(n) {
      const v = await read();
      const { mkdir, writeFile } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify({ date: v.date, usd: v.usd + n }));
    },
  };
}
