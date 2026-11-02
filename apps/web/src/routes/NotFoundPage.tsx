import { ArrowLeft, ArrowUpRight, Compass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found-page" aria-labelledby="not-found-heading">
      <div className="not-found-art" aria-hidden="true">
        <span className="not-found-orbit not-found-orbit--one" />
        <span className="not-found-orbit not-found-orbit--two" />
        <span className="not-found-sun" />
        <span className="not-found-number">404</span>
        <span className="not-found-compass">
          <Compass />
        </span>
      </div>
      <p className="not-found-eyebrow">A LITTLE OFF THE BEATEN PATH</p>
      <h1 id="not-found-heading">
        This page took
        <br />
        <em>a different turn.</em>
      </h1>
      <p className="not-found-description">
        The page you are looking for may have moved, or may not be here yet.
      </p>
      <div className="not-found-actions">
        <Link className="not-found-home" to="/">
          Back home <ArrowUpRight aria-hidden="true" />
        </Link>
        <button className="not-found-back" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden="true" />
          Go back
        </button>
      </div>
    </section>
  );
}
