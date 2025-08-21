import React from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme/CodeBlock";
import { motion } from "framer-motion";
import {themes as prismThemes} from 'prism-react-renderer';
import {useColorMode} from '@docusaurus/theme-common';
import {
  Code2,
  GitBranch,
  Rocket,
  ShieldCheck,
  Zap,
  Workflow,
  BookOpen,
  Puzzle,
} from "lucide-react";

// --- Small UI helpers -------------------------------------------------------
const Section = ({ id, children, className = "" }: any) => (
  <section id={id} className={`py-16 md:py-24 ${className}`}>{children}</section>
);

const Container = ({ children, className = "" }: any) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

const H = ({ k, title, subtitle }: any) => (
  <div className="text-center max-w-3xl mx-auto">
    <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-400">
        {subtitle}
      </p>
    )}
  </div>
);

const FeatureCard = ({ icon: Icon, title, children }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl shadow-sm p-6"
    style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-color-emphasis-200)'
    }}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl" style={{ border: '1px solid var(--ifm-color-emphasis-200)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--ifm-font-color-base)' }}>{title}</h3>
    </div>
    <div className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ifm-font-color-secondary)' }}>
      {children}
    </div>
  </motion.div>
);

// --- Home -------------------------------------------------------------------
export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  const GITHUB_URL = "https://github.com/intrigsoft/intrig-core"; // ← replace

  // Brand helpers (uses Docusaurus CSS vars)
  const BRAND = "var(--ifm-color-primary)";
  const BRAND_TINT_BG = "rgba(0, 216, 192, 0.05)"; // subtle brand-tinted surface
  const BRAND_TINT_BORDER = "rgba(0, 216, 192, 0.18)"; // soft border

  return (
    <Layout>
      <Head>
        <title>{siteConfig?.title ?? "Intrig"} — API Codegen & Docs Workbench</title>
        <meta
          name="description"
          content="Intrig turns OpenAPI into type-safe React hooks, docs, and a developer workbench. Generate, explore, and try APIs with confidence."
        />
      </Head>

      {/* HERO */}
      <Section id="hero" className="pt-20 md:pt-28">
        <Container>
          <div className="grid md:grid-cols-2 items-center gap-10">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-3xl md:text-6xl font-extrabold tracking-tight"
              >
                Intrig
                <span className="block" style={{ color: BRAND, opacity: 0.9 }}>Codegen & Docs for your APIs</span>
              </motion.h1>

              <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-xl">
                Generate type-safe hooks and unified docs from any OpenAPI spec — with code awareness. Built for React. SDKs are generated into node_modules (keep your repo clean).
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold" style={{ border: `1px solid ${BRAND}`, color: BRAND, background: "transparent" }}
                  to="/docs/intro"
                >
                  Get started
                </Link>
                <a
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                </a>
              </div>

              <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1"><Zap className="w-4 h-4"/> Type-safe</div>
                <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Zod-validated</div>
                <div className="flex items-center gap-1"><Code2 className="w-4 h-4"/> Code awareness</div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl shadow-sm p-4" style={{ background: 'var(--ifm-background-surface-color)', border: '1px solid var(--ifm-color-emphasis-200)' }}
            >
              <div className="text-xs mb-2 font-semibold text-gray-700 dark:text-gray-300">OpenAPI → Intrig Hook</div>
              <CodeBlock language="yaml" className={'p-1 rounded-xl'}>{`paths:
  /employee/{id}:
    get:
      operationId: getEmployee
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Employee'`}</CodeBlock>

              <div className="text-xs mt-4 mb-2 font-semibold text-gray-700 dark:text-gray-300">Generated React usage</div>
              <CodeBlock language="tsx" className={'p-1 rounded-xl'}>{`import { isPending, isError, isSuccess } from '@intrig/react';
import { useGetEmployee } from '@intrig/react/employee/client';

export default function EmployeeCard({ id }: { id: string }) {
  // Stateful hook: [state, execute, clear]
  const [state, getEmployee, clear] = useGetEmployee({
    fetchOnMount: true,
    clearOnUnmount: true,
    params: { id },
  });

  if (isPending(state)) return <p>Loading…</p>;
  if (isError(state)) return <p>Failed: {String(state.error)}</p>;
  if (!isSuccess(state)) return null;

  return (
    <div className="card">
      <h3>{state.data.name}</h3>
      <div className="flex gap-2">
        <button onClick={() => getEmployee({ id })}>Refresh</button>
        <button onClick={clear}>Reset</button>
      </div>
    </div>
  );
}`}</CodeBlock>
            </motion.div>
          </div>
        </Container>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <Container>
          <H title="Everything you need for API-driven frontends" subtitle="From code generation to searchable docs and a live workbench." />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={Code2} title="Typed React hooks">
              Generate hooks for GET/POST/PUT/DELETE with strong types, params/body schemas, and predictable network-state.
            </FeatureCard>
            <FeatureCard icon={Puzzle} title="Docs from source">
              Build docs from your OpenAPI + TypeScript types. Intrig commits normalized specs to git and generates the SDK into <code>node_modules</code> (don’t commit generated code).
            </FeatureCard>
            <FeatureCard icon={ShieldCheck} title="Validation built-in">
              Zod schemas alongside types ensure safer runtime behavior and better DX.
            </FeatureCard>
            <FeatureCard icon={Puzzle} title="Monorepo friendly">
              Works smoothly in any React repo; monorepos welcome. Export static sites for GitHub Pages or host anywhere.
            </FeatureCard>
            <FeatureCard icon={GitBranch} title="Git-based history">
              Commit normalized specs and rely on git diffs for versioning today. "Chronicle" UI is planned.
            </FeatureCard>
            <FeatureCard icon={Code2} title="Code awareness (usage detection)">
              Intrig detects where generated hooks are used across your codebase to help track coverage.
            </FeatureCard>
          </div>
        </Container>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how-it-works" className="">
        <Container>
          <H title="How it works" subtitle="Point Intrig at an OpenAPI doc and let it do the heavy lifting." />
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <FeatureCard icon={BookOpen} title="1) Connect your spec">
              Add a remote or local OpenAPI 3 definition. Intrig normalizes and validates.
            </FeatureCard>
            <FeatureCard icon={Rocket} title="2) Generate SDK">
              Normalize the OpenAPI and commit it. Intrig builds a typed SDK into <code>node_modules</code> for your app code (avoid committing generated code).
            </FeatureCard>
            <FeatureCard icon={Zap} title="3) Use in code & ship">
              Import hooks from the SDK, benefit from code awareness, and publish your docs site.
            </FeatureCard>
          </div>
          <div className="mt-8 text-center">
            <Link className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold" style={{ border: `1px solid ${BRAND}`, color: BRAND, background: "transparent" }} to="/docs/intro">Read the quickstart</Link>
          </div>
        </Container>
      </Section>

      {/* FINAL CTA */}
      <Section id="cta">
        <Container>
          <div className="rounded-2xl p-8 md:p-10 border" style={{ background: BRAND_TINT_BG, borderColor: BRAND_TINT_BORDER }}>
            <div className="md:flex items-center justify-between gap-6">
              <div className="max-w-2xl">
                <h3 className="text-2xl md:text-3xl font-bold">Bring your APIs to life in React.</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Spin up typed hooks, searchable docs, and an engineer-friendly workbench in minutes.</p>
              </div>
              <div className="mt-6 md:mt-0 flex gap-3">
                <Link className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold" style={{ border: `1px solid ${BRAND}`, color: BRAND, background: "transparent" }} to="/docs/intro">Get started</Link>
                <a className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-white/80 hover:bg-white/10" href={GITHUB_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  );
}
