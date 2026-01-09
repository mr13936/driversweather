import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Planner
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: January 2025
            </p>
          </div>

          <div className="prose prose-sm max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground">
                  At Road Trip Weather Planner, we take your privacy seriously. This policy explains
                  what information we collect, how we use it, and your rights regarding your data.
                </p>
              </div>
            </section>

            {/* Data Collection */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Data We Collect</h2>
              <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">Route Information</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    When you plan a trip, we temporarily process your origin and destination
                    locations to calculate routes and fetch weather data. This information is not
                    stored on our servers after your session ends.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Feedback Submissions</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    If you submit feedback, we collect the category, message, and optionally your
                    email address. We also collect basic browser information to help us reproduce and
                    fix any issues you report.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Analytics</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    We may collect anonymous usage data to understand how people use our application
                    and improve the experience.
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Services */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Third-Party Services</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground mb-4">
                  We use the following third-party services to provide our functionality:
                </p>
                <ul className="space-y-3">
                  <li>
                    <strong className="text-foreground">SMHI & Open-Meteo</strong>
                    <p className="text-muted-foreground text-sm">
                      Weather data providers. Your location coordinates are sent to these services
                      to retrieve weather forecasts.
                    </p>
                  </li>
                  <li>
                    <strong className="text-foreground">OSRM</strong>
                    <p className="text-muted-foreground text-sm">
                      Route calculation service. Your origin and destination are sent to calculate
                      driving routes.
                    </p>
                  </li>
                  <li>
                    <strong className="text-foreground">Nominatim & Komoot Photon</strong>
                    <p className="text-muted-foreground text-sm">
                      Geocoding services. Your search queries are sent to find matching locations.
                    </p>
                  </li>
                </ul>
              </div>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Cookies & Local Storage</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground">
                  We may use local storage to remember your preferences and improve your experience.
                  We do not use tracking cookies. Any data stored locally remains on your device and
                  is not transmitted to our servers.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Your Rights</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground mb-3">You have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Access any personal data we hold about you</li>
                  <li>Request deletion of your feedback submissions</li>
                  <li>Opt out of any analytics tracking</li>
                  <li>Contact us with any privacy concerns</li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground">
                  If you have any questions about this privacy policy or our data practices, please
                  reach out through our{" "}
                  <Link to="/feedback" className="text-primary hover:underline">
                    feedback form
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Changes to This Policy</h2>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. Any changes will be posted on
                  this page with an updated revision date.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
