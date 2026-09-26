import test from 'node:test';
import assert from 'node:assert/strict';
import { progressStats } from '../src/lib/learning/service';

test('progress percentage counts required lessons only', () => {
  const lessons = [
    { _id: 'a', required: true },
    { _id: 'b', required: true },
    { _id: 'c', required: false },
  ];

  assert.deepEqual(progressStats(lessons, []), {
    requiredCount: 2,
    completedRequired: 0,
    percentage: 0,
  });

  assert.deepEqual(progressStats(lessons, ['a']), {
    requiredCount: 2,
    completedRequired: 1,
    percentage: 50,
  });

  assert.deepEqual(progressStats(lessons, ['a', 'b']), {
    requiredCount: 2,
    completedRequired: 2,
    percentage: 100,
  });

  assert.deepEqual(progressStats(lessons, ['c']), {
    requiredCount: 2,
    completedRequired: 0,
    percentage: 0,
  });
});

test('progress ignores duplicate completed lesson ids', () => {
  const lessons = [{ _id: 'a', required: true }, { _id: 'b', required: true }];
  assert.equal(progressStats(lessons, ['a', 'a', 'a']).percentage, 50);
});
