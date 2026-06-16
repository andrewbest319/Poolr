import Navbar from "./Navbar";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 -z-10 max-w-full overflow-hidden bg-[linear-gradient(135deg,rgba(16,185,129,0.10),transparent_34%,rgba(56,189,248,0.07)_68%,rgba(255,255,255,0.04))]" />

      <Navbar />
      {children}
    </main>
  );
}
