import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Corpus } from '../corpus/store.ts';
import { fileLoader } from '../corpus/loaders.ts';

export const CORPUS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/corpus');

let cached: Promise<Corpus> | undefined;
export const openTestCorpus = (): Promise<Corpus> => (cached ??= Corpus.open(fileLoader(CORPUS_DIR)));
