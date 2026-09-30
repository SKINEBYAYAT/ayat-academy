import { requirePageUser } from '@/lib/auth/session';
import { User } from '@/lib/db/models/auth';
import { Course, Enrollment } from '@/lib/db/models/courses';
import { StudentAccess } from '@/components/admin/student-access';
import { StudentNameEditor } from '@/components/admin/student-name-editor';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  await requirePageUser(true);
  const [students, courses, enrollments] = await Promise.all([
    User.find({ role: 'student' }).sort({ createdAt: -1 }).lean(),
    Course.find().sort({ order: 1, title: 1 }).lean(),
    Enrollment.find({ active: true }).lean(),
  ]);

  const byUser = new Map<string, string[]>();
  for (const enrollment of enrollments) {
    const key = String(enrollment.userId);
    byUser.set(key, [...(byUser.get(key) ?? []), String(enrollment.courseId)]);
  }

  const courseOptions = courses.map(course => ({
    id: String(course._id),
    title: course.title,
    published: course.published,
  }));

  return <section className="admin-page">
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">Student access</span>
        <h1>Students</h1>
        <p>Grant or revoke course access manually. Payment-based enrollment will connect to the same access system later.</p>
      </div>
    </div>

    {students.length === 0 ? <div className="panel empty-state"><h3>No students yet.</h3><p>Registered student accounts will appear here.</p></div> :
      <div className="student-admin-list">{students.map(student => <article className="panel student-admin-card" key={String(student._id)}>
        <div className="student-admin-head">
          <div><h3>{student.fullName}</h3><p>{student.email}</p></div>
          <span className="status-badge">{(byUser.get(String(student._id)) ?? []).length} courses</span>
        </div>
        <StudentNameEditor userId={String(student._id)} fullName={student.fullName} />
        <StudentAccess userId={String(student._id)} courses={courseOptions} activeCourseIds={byUser.get(String(student._id)) ?? []} />
      </article>)}</div>}
  </section>;
}
