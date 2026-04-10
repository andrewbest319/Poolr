export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-8 py-8 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium text-zinc-300">Poolr</div>
          <div>Private pools, elevated.</div>
        </div>

        <div className="flex gap-6">
          <a href="/" className="hover:text-white transition">Home</a>
          <a href="/pricing" className="hover:text-white transition">Pricing</a>
          <a href="/login" className="hover:text-white transition">Login</a>
        </div>
      </div>
    </footer>
  );
}