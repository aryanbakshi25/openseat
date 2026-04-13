import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Built by{" "}
          <a
            href="https://purduethink.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            PurdueTHINK Consulting
          </a>
        </p>

        <a
          href="https://purduethink.com"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <Image
            src="/images/purduethink-light.png"
            alt="PurdueTHINK Consulting"
            width={40}
            height={40}
            className="h-9 w-9 block dark:hidden"
          />
          <Image
            src="/images/purduethink-dark.png"
            alt="PurdueTHINK Consulting"
            width={40}
            height={40}
            className="h-9 w-9 hidden dark:block"
          />
        </a>
      </div>
    </footer>
  );
}
