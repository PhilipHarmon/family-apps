import Reveal from './Reveal';
import { skills } from '../data';

export default function Skills() {
  return (
    <section id="skills" className="section section-alt">
      <div className="container">
        <Reveal>
          <p className="section-eyebrow">Skills</p>
          <h2 className="section-title">The toolbox</h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="skills-grid">
            {skills.map((s) => (
              <span key={s} className="skill-pill">
                {s}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={180}>
          <p className="studying-note">
            <span className="studying-dot" aria-hidden="true" />
            Currently studying for the <strong>Microsoft PL-300</strong> — Power BI Data Analyst
            Associate certification.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
