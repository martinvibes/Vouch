import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="wrap flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="grade grade-f flex h-24 w-24 items-center justify-center text-5xl">F</div>
        <h1 className="mt-6 text-3xl font-semibold">No rating on file</h1>
        <p className="mt-2 max-w-md text-[var(--color-fg-dim)]">
          That page — or that agent — isn&rsquo;t on the board. It may not have been mystery-shopped
          yet, or the link is wrong.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to the board
        </Link>
      </main>
      <Footer />
    </>
  );
}
