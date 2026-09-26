import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { courseInput, levelInput, sectionInput, lessonInput, contentAction } from '../src/lib/admin/course-validation';
import { Course, Level, Section, Lesson } from '../src/lib/db/models/courses';

test('Phase 2 validation rejects unsafe course-admin input', () => {
  assert.equal(courseInput.safeParse({
    title: 'Professional Skincare',
    slug: 'Professional Skincare',
    priceMinor: 10000,
    currency: 'USD',
  }).success, false);

  assert.equal(sectionInput.safeParse({
    levelId: { $ne: null },
    title: 'Injected section',
    order: 0,
  }).success, false);

  assert.equal(lessonInput.safeParse({
    levelId: 'not-an-object-id',
    sectionId: 'also-invalid',
    title: 'Lesson',
  }).success, false);

  assert.equal(contentAction.safeParse({
    action: 'reorder',
    kind: 'lesson',
    ids: [{ $gt: '' }],
  }).success, false);

  assert.equal(levelInput.safeParse({ title: '', order: 0 }).success, false);
});

test('Phase 2 models enforce unique slugs and support unlimited hierarchy records', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  await mongoose.connect(mongo.getUri());
  await Promise.all([Course.init(), Level.init(), Section.init(), Lesson.init()]);

  const course = await Course.create({
    title: 'Professional Skincare',
    slug: 'professional-skincare',
    priceMinor: 10000,
    currency: 'USD',
  });

  await assert.rejects(
    Course.create({
      title: 'Duplicate',
      slug: 'professional-skincare',
      priceMinor: 10000,
      currency: 'USD',
    }),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000,
  );

  for (let index = 0; index < 12; index += 1) {
    const level = await Level.create({
      courseId: course._id,
      title: 'Level ' + index,
      order: index,
      published: index % 2 === 0,
    });
    const section = await Section.create({
      courseId: course._id,
      levelId: level._id,
      title: 'Section ' + index,
      order: index,
      published: false,
    });
    await Lesson.create({
      courseId: course._id,
      levelId: level._id,
      sectionId: section._id,
      title: 'Lesson ' + index,
      order: index,
      required: true,
      published: false,
    });
  }

  assert.equal(await Level.countDocuments({ courseId: course._id }), 12);
  assert.equal(await Section.countDocuments({ courseId: course._id }), 12);
  assert.equal(await Lesson.countDocuments({ courseId: course._id }), 12);
});
