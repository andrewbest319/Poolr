export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-6 md:px-12 border-b border-white/10 backdrop-blur">
      <a href="/" className="text-2xl font-semibold tracking-wide">
        Poolr
      </a>

      <div className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
        <a href="/" className="hover:text-white transition">Home</a>
        <a href="/how" className="hover:text-white transition">How It Works</a>
        <a href="/pricing" className="hover:text-white transition">Pricing</a>
        <a href="/live" className="hover:text-white transition">Live Scoreboards</a>
        <a href="/login" className="hover:text-white transition">Login</a>
      </div>

      <a
        href="/login"
        className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition"
      >
        Create Pool
      </a>
    </nav>
  );
}