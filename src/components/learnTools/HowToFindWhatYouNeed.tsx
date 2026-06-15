export function HowToFindWhatYouNeed() {
  return (
    <div className="learn-tools-find-guide" aria-labelledby="learn-tools-find-heading">
      <article className="learn-tools-find-guide__card">
        <h3 id="learn-tools-find-heading" className="learn-tools-find-guide__title">
          How to Find What You Need
        </h3>
        <p className="learn-tools-find-guide__lead">Find it before you ask.</p>

        <ol className="learn-tools-find-guide__steps">
          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">1. Name the specific thing.</p>
            <p className="learn-tools-find-guide__text">
              Not &ldquo;I don&apos;t know TinkerCAD.&rdquo;
            </p>
            <p className="learn-tools-find-guide__text">
              &ldquo;How do I make a hole in TinkerCAD.&rdquo; That&apos;s searchable.
            </p>
          </li>

          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">2. Search: tool + technique + what you want.</p>
            <ul className="learn-tools-find-guide__examples">
              <li>TinkerCAD + hole + subtract shapes</li>
              <li>Cricut + score line + fold card</li>
              <li>MakeCode + micro:bit + button LED</li>
              <li>pop-up book + V-fold + paper mechanism</li>
            </ul>
          </li>

          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">3. Filter for short and recent.</p>
            <p className="learn-tools-find-guide__text">
              Add 2024, 2025, or 2026 to your search. Pick videos under 5 minutes. You need one
              answer, not a full course.
            </p>
          </li>

          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">4. If it doesn&apos;t work, change one word.</p>
            <p className="learn-tools-find-guide__text">
              &ldquo;TinkerCAD + hole + subtract&rdquo; not working? Try &ldquo;TinkerCAD + boolean&rdquo;
              or &ldquo;TinkerCAD + make a hole.&rdquo; Different people use different words for the same
              thing.
            </p>
          </li>

          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">5. Ask an AI.</p>
            <p className="learn-tools-find-guide__text">Same rules — specific beats vague.</p>
            <ul className="learn-tools-find-guide__compare">
              <li className="learn-tools-find-guide__compare--good">
                <span aria-hidden="true">✓</span>{' '}
                &ldquo;Why is my Cricut cutting through the score line instead of folding?&rdquo;
              </li>
              <li className="learn-tools-find-guide__compare--bad">
                <span aria-hidden="true">✗</span> &ldquo;How do I use the Cricut?&rdquo;
              </li>
            </ul>
          </li>

          <li className="learn-tools-find-guide__step">
            <p className="learn-tools-find-guide__step-title">
              6. Found something good? Email Mr. Cook or use the share a resource button on the bottom
              of the page
            </p>
            <p className="learn-tools-find-guide__text">
              One line: what it covers and the link. If it&apos;s good it goes on this page.
            </p>
          </li>
        </ol>
      </article>
    </div>
  )
}
