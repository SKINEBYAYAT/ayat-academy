import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { listStudentCourses } from '@/lib/learning/service';
import { ReviewForm } from '@/components/learning/review-form';

export const metadata: Metadata = { title: 'Your learning space', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await requirePageUser();
  const courses = await listStudentCourses(user._id);

  return <section className="workspace">
    <div className="workspace-head">
      <div>
        <span className="eyebrow">Your personal academy</span>
        <h1>Hello, {user.fullName.split(' ')[0]}.</h1>
        <p>Continue where you left off, or begin something new.</p>
      </div>
      <div className="actions">{user.role === 'admin' && <Link className="button secondary small" href="/admin">Administration</Link>}<Link className="button secondary small" href="/devices">My devices</Link><Link className="button secondary small" href="/support">Support</Link></div>
    </div>

    <div className="workspace-grid single-column">
      <section className="panel student-course-panel">
        <h2>My courses</h2>
        {courses.length === 0 ? <div className="empty-state">
          <span className="empty-icon"><BookOpen size={28} aria-hidden="true" /></span>
          <h3>No courses yet.</h3>
          <p>Once you purchase a course or an administrator grants you access, it will appear here.</p>
        </div> : <div className="student-course-grid">
          {courses.map(({ course, progress, percentage, completed, lessonCount, certificate, reviewEligible }) => {
            const href = progress?.currentLessonId
              ? '/learn/' + course.slug + '/' + progress.currentLessonId
              : '/learn/' + course.slug;
            return <article className="student-course-card" key={String(course._id)}>
              <div className="student-course-image">
                {course.thumbnail ? <img src={course.thumbnail} alt="" /> : <span>{course.title.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="student-course-copy">
                <div className="status-row">
                  {completed && <span className="status-badge published">Completed</span>}
                  {!completed && percentage > 0 && <span className="status-badge">In progress</span>}
                </div>
                <h3>{course.title}</h3>
                <p>{course.shortDescription || 'Continue your learning journey.'}</p>
                <div className="student-progress-row"><span>{percentage}%</span><span>{lessonCount} lessons</span></div>
                <div className="student-progress-bar"><i style={{ width: percentage + '%' }} /></div>
                <div className="student-course-actions"><Link className="button small" href={href}>{percentage > 0 ? 'Continue learning' : 'Start course'}</Link>{certificate && <Link className="button secondary small" href={'/certificate/' + certificate.certificateId}>View certificate</Link>}</div>
                {reviewEligible && <ReviewForm courseId={String(course._id)} />}
              </div>
            </article>;
          })}
        </div>}
      </section>
    </div>
  </section>;
}
