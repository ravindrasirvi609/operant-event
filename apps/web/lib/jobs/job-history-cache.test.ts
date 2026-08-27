import { beforeEach, describe, expect, it } from 'vitest';
import { addJobToHistory, readJobHistory } from './job-history-cache';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('job-history-cache', () => {
  it('returns an empty array when nothing has been recorded for a conference', () => {
    expect(readJobHistory('exports', 'conf-1')).toEqual([]);
  });

  it('records job ids per conference and kind, most recent first', () => {
    addJobToHistory('exports', 'conf-1', 'job-1');
    addJobToHistory('exports', 'conf-1', 'job-2');

    expect(readJobHistory('exports', 'conf-1')).toEqual(['job-2', 'job-1']);
    expect(readJobHistory('imports', 'conf-1')).toEqual([]);
    expect(readJobHistory('exports', 'conf-2')).toEqual([]);
  });
});
