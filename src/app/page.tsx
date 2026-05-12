export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-lg mb-6 animate-pulse-glow">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="text-gradient">SGO</span>
          </h1>
          <p className="text-lg text-muted">SGO</p>
        </div>

        {/* Status Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-md">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
            </span>
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Sistema activo
            </span>
          </div>

          <p className="text-muted mb-6">
            Todo está configurado y funcionando correctamente.
            <br />
            El siguiente paso es implementar el sistema de autenticación.
          </p>

          {/* Tech Stack Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Next.js 15", "React", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL"].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-surface-hover border border-border text-muted 
                             hover:border-primary hover:text-primary transition-all duration-200 cursor-default"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-sm text-muted opacity-60">
          Editá{" "}
          <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono border border-border">
            src/app/page.tsx
          </code>{" "}
          para empezar
        </p>
      </div>
    </div>
  );
}
