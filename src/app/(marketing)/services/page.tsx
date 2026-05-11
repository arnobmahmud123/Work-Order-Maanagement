"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Shield,
  Scissors,
  Trash2,
  Snowflake,
  Hammer,
  Search,
  Bug,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    icon: Scissors,
    name: "Grass Cut",
    desc: "Regular lawn maintenance and overgrowth management for vacant properties. Includes mowing, edging, and trimming to maintain curb appeal and HOA compliance.",
    features: ["Scheduled maintenance", "Before/after photos", "Height compliance reporting"],
  },
  {
    icon: Trash2,
    name: "Debris Removal",
    desc: "Complete interior and exterior debris removal. We handle everything from abandoned belongings to construction waste.",
    features: ["Full property cleanout", "Haul-away disposal", "Dumpster coordination"],
  },
  {
    icon: Snowflake,
    name: "Winterization",
    desc: "Protect vacant properties from freeze damage with complete winterization services including plumbing and HVAC preparation.",
    features: ["Plumbing drain-down", "Anti-freeze treatment", "HVAC winterization"],
  },
  {
    icon: Hammer,
    name: "Board-Up",
    desc: "Secure vacant properties with professional board-up services to prevent unauthorized access and vandalism.",
    features: ["Window/door boarding", "Lock replacement", "Security screening"],
  },
  {
    icon: Search,
    name: "Inspection",
    desc: "Detailed property condition inspections with comprehensive reporting and photographic documentation.",
    features: ["Interior/exterior inspection", "Condition reporting", "Photo documentation"],
  },
  {
    icon: Bug,
    name: "Mold Remediation",
    desc: "Professional mold assessment and remediation services to restore property safety and habitability.",
    features: ["Mold assessment", "Containment setup", "Remediation & clearance testing"],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">PropPreserve</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/services" className="text-sm font-medium text-indigo-600">Services</Link>
              <Link href="/about" className="text-sm text-text-dim hover:text-gray-900">About</Link>
              <Link href="/contact" className="text-sm text-text-dim hover:text-gray-900">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/signin"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link href="/auth/signup"><Button size="sm">Get Started</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Our Services</h1>
          <p className="mt-4 text-lg text-text-dim max-w-2xl mx-auto">
            Comprehensive property preservation services managed through our platform.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.name}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-4">
                  <service.icon className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-sm text-text-dim mb-4">{service.desc}</p>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-dim">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need a custom service?</h2>
          <p className="text-text-dim mb-8">Contact us to discuss your specific property preservation needs.</p>
          <Link href="/contact">
            <Button size="lg">
              Contact us
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
