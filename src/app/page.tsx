"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Shield,
  ClipboardList,
  Camera,
  MessageSquare,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Work Order Management",
    desc: "Create, assign, and track property preservation work orders from start to finish.",
  },
  {
    icon: Camera,
    title: "Field Documentation",
    desc: "Before, during, and after photo uploads with automatic organization.",
  },
  {
    icon: MessageSquare,
    title: "Threaded Messaging",
    desc: "Slack-like conversations tied to work orders for seamless team communication.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Billing",
    desc: "Generate invoices, track payments, and manage contractor billing.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    desc: "Client, contractor, coordinator, and admin dashboards with appropriate permissions.",
  },
  {
    icon: Shield,
    title: "Compliance Ready",
    desc: "HIPAA mode support, audit trails, and secure data handling.",
  },
];

const serviceTypes = [
  "Grass Cut",
  "Debris Removal",
  "Winterization",
  "Board-Up",
  "Inspection",
  "Mold Remediation",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-hover">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-surface-hover/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-cyan-400" />
              <span className="text-xl font-bold text-text-primary">PropPreserve</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/services" className="text-sm text-text-dim hover:text-text-primary">
                Services
              </Link>
              <Link href="/about" className="text-sm text-text-dim hover:text-text-primary">
                About
              </Link>
              <Link href="/contact" className="text-sm text-text-dim hover:text-text-primary">
                Contact
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              Trusted by property preservation professionals
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-text-primary tracking-tight">
              Property preservation,{" "}
              <span className="text-cyan-400">simplified</span>
            </h1>
            <p className="mt-6 text-lg text-text-dim max-w-2xl mx-auto">
              The all-in-one platform for managing work orders, field documentation,
              team communication, and billing for property preservation companies.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-hover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary">
              Everything you need to run your operation
            </h2>
            <p className="mt-4 text-lg text-text-dim">
              Built specifically for the property preservation industry.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-surface-hover rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="p-2 bg-indigo-50 rounded-lg w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-dim">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary">
              Supported Service Types
            </h2>
            <p className="mt-4 text-lg text-text-dim">
              Manage all types of property preservation work.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {serviceTypes.map((service) => (
              <div
                key={service}
                className="flex items-center gap-3 p-4 bg-surface-hover rounded-xl"
              >
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-text-primary">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-cyan-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to streamline your operations?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Join hundreds of property preservation companies already using PropPreserve.
          </p>
          <div className="mt-8">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-surface-hover text-cyan-400 hover:bg-gray-100">
                Get started today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-text-secondary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-indigo-400" />
                <span className="text-lg font-bold text-white">PropPreserve</span>
              </div>
              <p className="text-sm">
                The modern platform for property preservation management.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="/services" className="block hover:text-white">Services</Link>
                <Link href="/about" className="block hover:text-white">About</Link>
                <Link href="/contact" className="block hover:text-white">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Platform</h4>
              <div className="space-y-2 text-sm">
                <Link href="/auth/signin" className="block hover:text-white">Sign In</Link>
                <Link href="/auth/signup" className="block hover:text-white">Sign Up</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <div className="space-y-2 text-sm">
                <span className="block">Privacy Policy</span>
                <span className="block">Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
            © {new Date().getFullYear()} PropPreserve. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
