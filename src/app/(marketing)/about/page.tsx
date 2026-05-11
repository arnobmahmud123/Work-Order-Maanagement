"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Shield, Users, Target, Heart, ArrowRight } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Efficiency",
    desc: "We streamline every step of the preservation process so you can focus on growing your business.",
  },
  {
    icon: Users,
    title: "Collaboration",
    desc: "Built for teams — clients, contractors, and coordinators all work together seamlessly.",
  },
  {
    icon: Heart,
    title: "Reliability",
    desc: "Enterprise-grade infrastructure with uptime and data integrity you can count on.",
  },
];

export default function AboutPage() {
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
              <Link href="/services" className="text-sm text-text-dim hover:text-gray-900">Services</Link>
              <Link href="/about" className="text-sm font-medium text-indigo-600">About</Link>
              <Link href="/contact" className="text-sm text-text-dim hover:text-gray-900">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/signin"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link href="/auth/signup"><Button size="sm">Get Started</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">About PropPreserve</h1>
          <p className="mt-4 text-lg text-text-dim max-w-2xl mx-auto">
            We&apos;re building the modern operating system for property preservation companies.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="pro prose-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-text-dim mb-6">
              PropPreserve was born from frustration with outdated tools and fragmented workflows
              in the property preservation industry. We saw teams juggling spreadsheets, text
              messages, and paper forms to manage critical preservation work.
            </p>
            <p className="text-text-dim mb-6">
              We built a platform that brings everything together — work orders, photo documentation,
              team messaging, invoicing, and reporting — into one place. Designed by people who
              understand the industry, for the teams who do the work every day.
            </p>
            <p className="text-text-dim">
              Today, PropPreserve serves property preservation companies of all sizes, from
              small local operations to national service providers managing thousands of properties.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="bg-white rounded-xl p-8 text-center shadow-sm">
                <div className="inline-flex p-3 bg-indigo-50 rounded-xl mb-4">
                  <value.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-text-dim">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join us</h2>
          <p className="text-text-dim mb-8">Ready to modernize your property preservation workflow?</p>
          <Link href="/auth/signup">
            <Button size="lg">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
