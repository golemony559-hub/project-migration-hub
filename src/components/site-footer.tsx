import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/doerly-logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src={logoAsset.url} alt="" aria-hidden="true" />
          <span>© 2026 Doerly · Learn it from someone who’s done it.</span>
        </div>
        <nav aria-label="Legal">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Notice</Link>
          <Link to="/creator-rules">Creator rules</Link>
          <Link to="/creator-help">Creator help</Link>
        </nav>
      </div>
    </footer>
  );
}
