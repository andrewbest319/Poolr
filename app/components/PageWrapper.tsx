import Navbar from "./Navbar";
import Footer from "./Footer";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="min-h-screen bg-[#050816] text-white overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-20 top-40 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-20 bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <Navbar />
      {children}
      <Footer />
    </main>
  );
}