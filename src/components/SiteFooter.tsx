export function SiteFooter() {
  return (
    <footer className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
      <span>Criado por ne0.sys</span>
      <a
        href="https://www.instagram.com/ne0.sys/"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-primary"
      >
        📸 Instagram
      </a>
      <span>💬 Discord: neosupreme</span>
      <a
        href="https://www.tiktok.com/@sj34"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-primary"
      >
        🎵 TikTok
      </a>
    </footer>
  );
}