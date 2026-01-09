import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-12 border-t border-border bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-6 mb-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Planner
          </Link>
          <Link
            to="/how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </Link>
          <Link
            to="/about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            to="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/feedback"
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Share Feedback
          </Link>
        </nav>

        {/* Attribution */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            Weather data from{" "}
            <a
              href="https://www.smhi.se/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              SMHI
            </a>{" "}
            &{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Open-Meteo
            </a>{" "}
            • Route data from{" "}
            <a
              href="https://project-osrm.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              OSRM
            </a>
          </p>
          <p>
            Geocoding by{" "}
            <a
              href="https://nominatim.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Nominatim
            </a>{" "}
            &{" "}
            <a
              href="https://photon.komoot.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Komoot Photon
            </a>
          </p>
          <p className="mt-2">Created by Pasheman Studios</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
