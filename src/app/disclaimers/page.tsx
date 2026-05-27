export const metadata = {
  title: "Disclaimers | CertiPure",
  description: "Required disclaimers for CertiPure research peptide products.",
};

export default function DisclaimersPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Disclaimers</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">Research Use Only</h2>
          <p>All products currently listed on this site are for research purposes ONLY.</p>
          <p>All products sold on this website are intended for research and identification purposes only.</p>
          <p>These products are not intended for human dosing, injections, or ingestion.</p>
          <p>Peptides are strictly for laboratory, academic, or institutional research and not for human or animal consumption.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">Additional Disclaimers</h2>
          <p className="font-bold text-sm uppercase tracking-wider text-red-600">&quot;For Research Use Only. Not for Human Consumption.&quot;</p>
          <p>All products are sold for research, laboratory, or analytical purposes only, and are not for human consumption.</p>
          <p>CertiPure&trade; is a chemical supplier. CertiPure&trade; is not a compounding pharmacy or chemical compounding facility as defined under 503A of the Federal Food, Drug, and Cosmetic act. CertiPure&trade; is not an outsourcing facility as defined under 503B of the Federal Food, Drug, and Cosmetic act.</p>
          <p>The statements made within this website have not been evaluated by the US Food and Drug Administration. The products we offer are not intended to diagnose, treat, cure or prevent any disease.</p>
          <p className="font-semibold">Human/Animal Consumption Prohibited. Laboratory/In-Vitro Experimental Use Only.</p>
        </section>
      </div>
    </div>
  );
}
