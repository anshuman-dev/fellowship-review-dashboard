import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicant } from "@/lib/storage";
import ReviewClient from "./ReviewClient";

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = getApplicant(id);
  if (!applicant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-gray-200">|</span>
          <div>
            <span className="text-sm font-semibold text-gray-900">{applicant.name}</span>
            <span className="text-sm text-gray-400 ml-2">{applicant.email}</span>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <ReviewClient initial={applicant} />
      </main>
    </div>
  );
}
