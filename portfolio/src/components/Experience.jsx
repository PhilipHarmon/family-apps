import Reveal from './Reveal';
import { experience } from '../data';

export default function Experience() {
  return (
    <section id="experience" className="section section-alt">
      <div className="container">
        <Reveal>
          <p className="section-eyebrow">Experience</p>
          <h2 className="section-title">Where I&apos;ve been</h2>
        </Reveal>
        <div className="timeline">
          {experience.map((job, i) => (
            <Reveal key={job.role} delay={i * 80} className="timeline-item">
              <div className="timeline-marker" aria-hidden="true" />
              <div className="timeline-card">
                <div className="timeline-head">
                  <div>
                    <h3>{job.role}</h3>
                    <p className="timeline-company">
                      {job.company} · {job.place}
                    </p>
                  </div>
                  <span className="timeline-dates">{job.dates}</span>
                </div>
                <ul>
                  {job.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
