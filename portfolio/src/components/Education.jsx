import Reveal from './Reveal';
import { education } from '../data';

export default function Education() {
  return (
    <section id="education" className="section">
      <div className="container container-narrow">
        <Reveal>
          <p className="section-eyebrow">Education</p>
          <h2 className="section-title">The foundation</h2>
        </Reveal>
        <div className="edu-list">
          {education.map((e, i) => (
            <Reveal key={e.school} delay={i * 80} className="edu-card">
              <div className="edu-cap" aria-hidden="true">
                🎓
              </div>
              <div>
                <h3>{e.school}</h3>
                <p>{e.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
