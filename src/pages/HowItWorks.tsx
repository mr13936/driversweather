import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, CloudSun, Car, Lightbulb } from "lucide-react";
import Footer from "@/components/Footer";

const steps = [
  {
    icon: MapPin,
    title: "Enter Your Route",
    description:
      "Start by entering your departure city and destination. Our autocomplete will help you find the right locations quickly.",
  },
  {
    icon: Clock,
    title: "Set Departure Time",
    description:
      "Choose when you plan to start your journey. This helps us calculate weather conditions at the right times along your route.",
  },
  {
    icon: CloudSun,
    title: "View Weather Forecast",
    description:
      "See detailed weather predictions for each waypoint on your route, including temperature, precipitation, wind, and visibility.",
  },
  {
    icon: Car,
    title: "Check Driving Conditions",
    description:
      "Our driving score helps you understand road conditions based on weather factors that affect driving safety.",
  },
];

const tips = [
  "Plan your trip at least a day in advance for more accurate forecasts",
  "Check the weather comparison to see if leaving earlier or later might give you better conditions",
  "Pay attention to wind speed and visibility, especially for highway driving",
  "Consider the driving score when planning rest stops along your route",
];

const HowItWorks = () => {
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
            <h1 className="text-3xl font-bold text-foreground">How It Works</h1>
            <p className="text-muted-foreground mt-2">
              Learn how to get the most out of the Road Trip Weather Planner.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6 mb-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Data Sources */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Data Sources</h2>
            <div className="p-4 rounded-lg border border-border bg-card space-y-3">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Weather Data:</strong> We combine data from SMHI
                (Swedish Meteorological and Hydrological Institute) and Open-Meteo to provide accurate
                forecasts across different regions.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Route Calculation:</strong> Routes are calculated
                using OSRM (Open Source Routing Machine), which provides realistic driving times and
                waypoints.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Geocoding:</strong> Location search is powered by
                Nominatim and Komoot Photon for accurate place identification.
              </p>
            </div>
          </div>

          {/* Driving Score */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Understanding the Driving Score
            </h2>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-muted-foreground mb-4">
                The driving score (0-100) indicates overall driving conditions based on:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">80-100:</strong> Excellent conditions for driving
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">60-79:</strong> Good conditions, minor concerns
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">40-59:</strong> Fair conditions, exercise caution
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">Below 40:</strong> Poor conditions, consider postponing
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Tips for Best Results
            </h2>
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-primary font-semibold">{index + 1}.</span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HowItWorks;
