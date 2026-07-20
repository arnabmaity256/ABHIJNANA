import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export function Terms() {
  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 60, maxWidth: 720 }}>
      <div style={{ marginBottom: 30 }}>
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginLeft: -12 }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
      
      <div className="page-head">
        <div className="eyebrow">Legal</div>
        <h1 className="page-title" style={{ fontSize: 32, marginTop: 8 }}>Terms of Service & Licensing</h1>
        <p className="page-sub" style={{ margin: '10px 0 0' }}>
          Last updated: July 2026
        </p>
      </div>

      <div className="card card-pad stack gap-24" style={{ marginTop: 32 }}>
        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>1. Acceptance of Terms</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            By accessing or using the ABHIJÑĀNA public portal or authority console, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you must not access the system.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>2. Proprietary Rights & Licensing</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            All software, design, text, algorithms, architecture, and other content making up this platform are the exclusive intellectual property of the developer. The platform and its underlying codebase are <strong>closed-source and proprietary</strong>. 
          </p>
          <div className="verdict verdict-clear" style={{ padding: '16px 20px', marginTop: 16 }}>
            <div className="verdict-icon" style={{ background: 'var(--ink-800)', color: 'var(--gold-bright)' }}><ShieldCheck /></div>
            <div className="grow">
              <strong style={{ display: 'block', marginBottom: 4 }}>Strictly Prohibited Actions:</strong>
              <ul className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.5 }}>
                <li>Copying, reproducing, or distributing the software or its interface.</li>
                <li>Reverse engineering, decompiling, or attempting to extract the source code or fingerprinting algorithms.</li>
                <li>Scraping, automated data mining, or programmatic access to the registry outside of intended use.</li>
                <li>Creating derivative works based on the platform.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>3. Access & Usage Restrictions</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            The Authority Console is restricted to verified law enforcement and regulatory bodies. Unauthorized attempts to access the console, bypass security controls, or manipulate the tamper-evident ledger will result in permanent bans and may be reported to relevant authorities.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>4. Disclaimer of Warranties</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>5. Limitation of Liability</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            In no event shall the developer be liable for any claim, damages, or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
          </p>
        </section>
      </div>
    </div>
  );
}
