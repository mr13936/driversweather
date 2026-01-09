import { Link } from "react-router-dom";
import { ArrowLeft, Car, Cloud, MapPin, MessageSquare } from "lucide-react";
import Footer from "@/components/Footer";

const About = () => {
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
            <h1 className="text-3xl font-bold text-foreground">About</h1>
            <p className="text-muted-foreground mt-2">
              Learn more about the Road Trip Weather Planner.
            </p>
          </div>

          {/* Mission */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
            <div className="p-6 rounded-lg border border-border bg-card">
              <p className="text-muted-foreground leading-relaxed">
                The Road Trip Weather Planner was created to help travelers make informed decisions
                about their journeys. We believe that knowing the weather conditions along your route
                can make the difference between a stressful drive and an enjoyable road trip.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Whether you're planning a weekend getaway or a cross-country adventure, our tool
                provides you with the weather insights you need to travel safely and comfortably.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Key Features</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border border-border bg-card">
                <MapPin className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Route-Based Forecasts</h3>
                <p className="text-sm text-muted-foreground">
                  Get weather predictions for multiple waypoints along your entire route, not just
                  your destination.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <Cloud className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Time-Accurate Weather</h3>
                <p className="text-sm text-muted-foreground">
                  See the weather as it will be when you arrive at each location, based on your
                  departure time.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <Car className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Driving Conditions</h3>
                <p className="text-sm text-muted-foreground">
                  Our driving score helps you understand how weather affects road conditions and
                  safety.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <MessageSquare className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Weather Comparison</h3>
                <p className="text-sm text-muted-foreground">
                  Compare weather conditions for different departure times to find the best window
                  for your trip.
                </p>
              </div>
            </div>
          </div>

          {/* Technology */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Built With</h2>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-muted-foreground mb-4">
                Road Trip Weather Planner is built using modern web technologies:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• React & TypeScript for a robust, type-safe frontend</li>
                <li>• Tailwind CSS for responsive, beautiful design</li>
                <li>• Leaflet for interactive route maps</li>
                <li>• Open-source weather and routing APIs</li>
              </ul>
            </div>
          </div>

          {/* Creator */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Created By</h2>
            <div className="p-6 rounded-lg border border-border bg-card text-center">
              <p className="text-xl font-semibold text-foreground">Pasheman Studios</p>
              <p className="text-muted-foreground mt-2">
                Building useful tools for everyday adventures.
              </p>
            </div>
          </div>

          {/* Feedback CTA */}
          <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">Have Ideas for Improvement?</h3>
            <p className="text-muted-foreground mb-4">
              We're always looking to make the Road Trip Weather Planner better.
            </p>
            <Link
              to="/feedback"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Share Your Feedback
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
