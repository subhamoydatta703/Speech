import Link from "next/link";
import { DictationDemo } from "@/components/dictation-demo";

export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="pill">
          <span /> DESIGNED FOR YOUR DESKTOP
        </div>
        <h1>
          Big thoughts.
          <br />
          Less typing.
        </h1>
        <p className="hero-description">
          Let your voice do the writing.
          <br />
          Meet speech, desktop dictation designed to keep your words on your
          computer.
        </p>
        <div className="cta-row">
          <Link className="button" href="/download">
            Get speech for Windows <span aria-hidden="true">↗</span>
          </Link>
          <a className="text-link" href="#how-it-works">
            See how it works <span aria-hidden="true">↓</span>
          </a>
        </div>
        <p className="fine-print">
         Sign in before downloading
        </p>
        <DictationDemo />
      </section>
      <section className="statement">
        <span className="eyebrow">LESS FRICTION. MORE EXPRESSION.</span>
        <h2>
          For the words that come
          <br />
          easier out loud.
        </h2>
        <p>
          From a fleeting thought to a thoughtful reply. Make space for the way
          you naturally think.
        </p>
        <div className="use-cases">
          <span>↗ Everyday notes</span>
          <span>✳ First drafts</span>
          <span>↗ Thoughtful replies</span>
          <span>✳ Your next big idea</span>
        </div>
      </section>
      <section className="section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE SETUP. A NEW WAY TO WRITE.</span>
            <h2>From thought to text.</h2>
          </div>
          <p>
            One website sign-in. Local setup.
            <br />
            Then a little more freedom to speak.
          </p>
        </div>
        <div className="steps">
          {[
            {
              n: "01",
              title: "Make yourself at home.",
              body: "Sign in on the website, then download the Windows installer when the release is available.",
              art: "Your workspace, your voice",
              symbol: "↗",
            },
            {
              n: "02",
              title: "Get ready, locally.",
              body: "Setup connects your account through the browser and downloads the speech model to your computer.",
              art: "A home for your words",
              symbol: "↓",
            },
            {
              n: "03",
              title: "Say what’s on your mind.",
              body: "Once setup is complete, use your configured shortcut to dictate into supported text fields—even offline.",
              art: "A thought becomes text",
              symbol: "≋",
            },
          ].map((step) => (
            <article className="step" key={step.n}>
              <div className="step-art">
                <span>{step.symbol}</span>
                <small>{step.art}</small>
              </div>
              <span className="step-number">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="privacy" id="privacy">
        <div>
          <span className="eyebrow">PERSONAL BY DESIGN</span>
          <h2>
            Your voice.
            <br />
            On your terms.
          </h2>
          <p>
            speech is being built to transcribe on your computer. Your audio and
            transcripts don’t need to travel to our servers.
          </p>
          <Link className="text-link" href="/help">
            Understand offline setup ↗
          </Link>
        </div>
        <div className="privacy-card">
          <div className="local-symbol" aria-hidden="true">
            ⌘
          </div>
          <h3>
            A little less cloud.
            <br />A lot more local.
          </h3>
          <ul>
            <li>Local speech model on your computer</li>
            <li>Offline dictation after initial setup</li>
            <li>Only your account ID and email stored online</li>
          </ul>
          <span className="pill">LOCAL-FIRST ARCHITECTURE</span>
        </div>
      </section>
      <section className="section faq">
        <span className="eyebrow">A FEW THINGS TO KNOW</span>
        <h2>Good questions.</h2>
        {[
          [
            "Is speech a website or an app?",
            "speech is desktop software. This website handles your account, download, and installation confirmation. Dictation runs on your computer.",
          ],
          [
            "Will it work without internet?",
            "The planned desktop experience runs offline once account activation and the model download are complete. Initial setup, sign-in, and updates require internet.",
          ],
          [
            "Do I sign in again after installing?",
            "Setup reuses your website session. You confirm the code shown by your installer in your browser. You only need to sign in again if your browser session has expired.",
          ],
          [
            "Can I download it today?",
            "The Windows release is in development. The download page connects to the backend and will serve the installer once a release is configured.",
          ],
          [
            "Does it remove background noise?",
            "Dedicated noise suppression is not part of the first release. A quiet space and a nearby microphone will give you a better starting point.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="closing">
        <span className="eyebrow">LET YOUR IDEAS DO THE TALKING</span>
        <h2>
          A little less typing.
          <br />A little more you.
        </h2>
        <Link className="button" href="/download">
          Get started with speech ↗
        </Link>
        <p>Sign in to access downloads and setup.</p>
      </section>
    </main>
  );
}
