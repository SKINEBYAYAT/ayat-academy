import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { getCourseProgress, getPublishedCourseTree, progressStats, requireCourseAccessBySlug } from '@/lib/learning/service';
import { resolvePrivateAsset, resolveVideoAsset } from '@/lib/learning/assets';
import { HttpError } from '@/lib/http';
import { MarkdownContent } from '@/components/learning/markdown-content';
import { ProgressControls } from '@/components/learning/progress-controls';
import { VideoPlayer } from '@/components/learning/video-player';

export const dynamic = 'force-dynamic';

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requirePageUser();
  const { slug, lessonId } = await params;

  try {
    const course = await requireCourseAccessBySlug(user._id, slug, user.role === 'admin');
    const tree = await getPublishedCourseTree(course._id);
    const lessonIndex = tree.lessons.findIndex(lesson => String(lesson._id) === lessonId);
    if (lessonIndex < 0) notFound();

    const lesson = tree.lessons[lessonIndex];
    const progress = await getCourseProgress(user._id, course._id);
    const completedIds = new Set((progress?.completedLessonIds ?? []).map(String));
    const stats = progressStats(tree.lessons, progress?.completedLessonIds ?? []);
    const previous = lessonIndex > 0 ? tree.lessons[lessonIndex - 1] : null;
    const next = lessonIndex < tree.lessons.length - 1 ? tree.lessons[lessonIndex + 1] : null;
    const video = resolveVideoAsset(lesson.videoAssetId);
    const position = Number(progress?.videoPositions?.get(String(lesson._id)) ?? 0);

    return <div className="learning-shell">
      <aside className="learning-sidebar">
        <div className="learning-course-head">
          <Link className="text-link" href="/dashboard">← My courses</Link>
          <h2>{course.title}</h2>
          <div className="learning-progress"><span>{stats.percentage}% complete</span><div><i style={{ width: stats.percentage + '%' }} /></div></div>
        </div>

        <nav className="learning-tree" aria-label="Course lessons">
          {tree.levels.map(level => {
            const sections = tree.sections.filter(section => String(section.levelId) === String(level._id));
            return <div className="learning-level" key={String(level._id)}>
              <strong>{level.title}</strong>
              {sections.map(section => {
                const lessons = tree.lessons.filter(item => String(item.sectionId) === String(section._id));
                return <div className="learning-section" key={String(section._id)}>
                  <span>{section.title}</span>
                  {lessons.map(item => {
                    const id = String(item._id);
                    return <Link className={id === lessonId ? 'learning-lesson active' : 'learning-lesson'} key={id} href={'/learn/' + course.slug + '/' + id}>
                      <b>{completedIds.has(id) ? '✓' : '•'}</b>
                      <span>{item.title}</span>
                    </Link>;
                  })}
                </div>;
              })}
            </div>;
          })}
        </nav>
      </aside>

      <main className="lesson-stage">
        <div className="lesson-topline">
          <div><span className="eyebrow">{course.title}</span><h1>{lesson.title}</h1>{lesson.description && <p>{lesson.description}</p>}</div>
          <ProgressControls courseId={String(course._id)} lessonId={String(lesson._id)} completed={completedIds.has(String(lesson._id))} />
        </div>

        {video && <VideoPlayer
          src={video.type === 'url' ? video.src : undefined}
          playbackId={video.type === 'mux' ? video.playbackId : undefined}
          playbackToken={video.type === 'mux' ? video.playbackToken : undefined}
          courseId={String(course._id)}
          lessonId={String(lesson._id)}
          initialPosition={position}
        />}
        {lesson.content && <MarkdownContent content={lesson.content} />}

        {lesson.resources?.length ? <section className="student-resources"><span className="eyebrow">Resources</span><div>
          {lesson.resources.map((resource, index) => {
            const href = resolvePrivateAsset(resource.privateAssetId);
            return href ? <a className="resource-download" key={index} href={href} target="_blank" rel="noopener noreferrer">{resource.title || 'Resource'} ↗</a> : null;
          })}
        </div></section> : null}

        <div className="lesson-navigation">
          {previous ? <Link className="button secondary" href={'/learn/' + course.slug + '/' + previous._id}>← Previous</Link> : <span />}
          {next ? <Link className="button" href={'/learn/' + course.slug + '/' + next._id}>Next lesson →</Link> : <Link className="button secondary" href="/dashboard">Back to dashboard</Link>}
        </div>
      </main>
    </div>;
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect('/dashboard');
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}
