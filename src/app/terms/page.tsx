export const metadata = {
  title: "Terms & Conditions | CertiPure",
  description: "Terms and conditions for using CertiPure research peptides.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Terms & Conditions</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">1. Research Use Only</h2>
          <p>
            All products sold by CertiPure are intended strictly for <strong>laboratory research and in-vitro experimental use only</strong>. They are not intended for human consumption, ingestion, injection, inhalation, or any form of use in or on humans or animals. Products are not drugs, food, cosmetics, or dietary supplements, and have not been evaluated or approved by the U.S. Food and Drug Administration (FDA) for any purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">2. Age Requirement</h2>
          <p>
            You must be at least 21 years of age to purchase products from CertiPure. By creating an account or placing an order, you represent and warrant that you are 21 years of age or older. We reserve the right to cancel any order if we have reason to believe the purchaser is under the age of 21.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">3. Qualified Researcher Representation</h2>
          <p>
            By purchasing from CertiPure, you represent that you are a qualified researcher, laboratory, educational institution, or business with a legitimate research purpose, and that you will handle all products in a safe, legal, and professional manner in accordance with applicable laws and laboratory safety standards.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">4. No Resale for Human Use</h2>
          <p>
            You agree not to resell, redistribute, or repackage any CertiPure product for human consumption, clinical use, or veterinary use. Any violation of this provision terminates your rights under these Terms immediately and may result in legal action.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">5. Orders, Pricing & Shipping</h2>
          <p>
            All orders are subject to acceptance and availability. Prices are listed in U.S. dollars and may change without notice. CertiPure reserves the right to refuse or cancel any order at its sole discretion. Shipping times are estimates and not guaranteed. Risk of loss transfers to the buyer upon delivery to the shipping carrier.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">6. Returns & Refunds</h2>
          <p>
            Due to the sensitive nature of research chemicals, all sales are final. Refunds or replacements will only be considered in cases of products damaged in transit or clearly defective upon arrival, and must be reported within 7 days of delivery with photographic evidence. Opened or used products are not eligible for return.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, CertiPure, its officers, employees, and affiliates shall not be liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising from the purchase, handling, storage, or misuse of any product. In no event shall CertiPure's total liability exceed the purchase price of the product giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">8. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless CertiPure and its affiliates from any and all claims, damages, liabilities, losses, and expenses (including reasonable attorneys' fees) arising out of your use, misuse, or distribution of any product purchased from CertiPure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">9. Intellectual Property</h2>
          <p>
            All content on the CertiPure website — including text, graphics, logos, images, Certificates of Analysis, and product descriptions — is the property of CertiPure or its content suppliers and is protected by U.S. and international copyright laws. You may not reproduce, distribute, or create derivative works without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">10. Account Responsibility</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at the contact email below if you suspect any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Wisconsin, United States, without regard to its conflict of law principles. Any disputes shall be resolved exclusively in the state or federal courts located in Wisconsin.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">12. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes take effect immediately upon posting to this page. Your continued use of the site after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">13. Contact</h2>
          <p>
            Questions about these Terms? Contact us at <a href="mailto:support@certipure.com" className="text-blue-600 hover:underline">support@certipure.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
