import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="notfound" aria-labelledby="notfound-heading">
      <h2 id="notfound-heading">That page is not on the menu</h2>
      <p>
        <Link to="/">Back to the drinks</Link>
      </p>
    </section>
  );
}
