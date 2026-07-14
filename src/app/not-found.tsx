import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="wrap flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="grade grade-f flex h-24 w-24 items-center justify-center text-5xl">F</div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">No rating on file</h1>
        <p className="mt-2 max-w-md text-ink-soft">
          That page — or that agent — isn&rsquo;t on the board. It may not have been graded yet, or the
          link is wrong.
        </p>
        <Link href="/#board" className="btn btn-primary mt-6">Back to the board</Link>
      </main>
      <Footer />
    </>
  );
}
