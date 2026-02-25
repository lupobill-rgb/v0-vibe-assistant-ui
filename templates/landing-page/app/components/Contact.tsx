"use client";

import { useState } from "react";

interface FormState {
  name: string;
  email: string;
  message: string;
}

interface SubmitStatus {
  type: "success" | "error";
  message: string;
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<SubmitStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    // Replace this with your actual form submission logic (e.g. API route, Resend, Formspree).
    await new Promise((resolve) => setTimeout(resolve, 800));

    setStatus({
      type: "success",
      message: "Thanks! We'll be in touch shortly.",
    });
    setForm({ name: "", email: "", message: "" });
    setSubmitting(false);
  }

  return (
    <section
      id="contact"
      className="py-24 bg-gradient-to-b from-[#0a0f1e] to-[#0d1530]"
    >
      <div className="max-w-2xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Contact
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Get in touch
          </h2>
          <p className="text-slate-400 text-lg">
            Questions, feedback, or want a demo? We&apos;d love to hear from
            you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 bg-white/5 border border-white/10 rounded-2xl p-8"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm text-slate-300 font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Smith"
              className="bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors duration-200 text-sm"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm text-slate-300 font-medium"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className="bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors duration-200 text-sm"
            />
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="message"
              className="text-sm text-slate-300 font-medium"
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us about your project…"
              className="bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors duration-200 text-sm resize-none"
            />
          </div>

          {/* Status */}
          {status && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                status.type === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-600/25"
          >
            {submitting ? "Sending…" : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}
