export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-sunken px-5 py-10">
      {children}
    </main>
  );
}
