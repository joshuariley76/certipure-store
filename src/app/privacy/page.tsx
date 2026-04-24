export const metadata = {
  title: "Privacy Policy | CertiPure",
  description: "How CertiPure collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        <section>
          <p>
            CertiPure ("we," "us," or "our") respects your privacy. This Privacy Policy explains what information we collect, how we use it, who we share it with, and your rights regarding that information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Account Information:</strong> Full name, email address, and password (passwords are stored as salted hashes — we never see your actual password).</li>
            <li><strong>Order Information:</strong> Shipping address, billing address, order history, and payment confirmation details. Actual credit card numbers are handled exclusively by our payment processor (Stripe) and are never stored on our servers.</li>
            <li><strong>Age & Terms Acknowledgment:</strong> A record that you confirmed you are 21+ and agreed to our Terms & Conditions at the time of signup.</li>
            <li><strong>Technical Information:</strong> IP address, browser type, device information, and pages visited, collected automatically via cookies and similar technologies.</li>
            <li><strong>Communications:</strong> Messages you send to our support team.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>To create and manage your account</li>
            <li>To process and fulfill your orders</li>
            <li>To provide customer support</li>
            <li>To send order confirmations, shipping updates, and transactional emails</li>
            <li>To send marketing emails about new products, sales, and research insights (you can unsubscribe at any time)</li>
            <li>To detect and prevent fraud and enforce our Terms & Conditions</li>
            <li>To comply with legal obligations</li>
            <li>To improve our website and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">3. How We Share Your Information</h2>
          <p>We do not sell your personal information. We share information only with:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Service Providers:</strong> Payment processing (Stripe), database and authentication hosting (Supabase), website hosting (Vercel), email delivery services, and shipping carriers — only as needed to run our business.</li>
            <li><strong>Legal Compliance:</strong> When required by subpoena, court order, or other legal process, or when necessary to protect our rights or the safety of others.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">4. Cookies & Tracking</h2>
          <p>
            We use cookies and similar technologies to keep you logged in, remember your cart, analyze site traffic, and improve your experience. You can disable cookies in your browser settings, but parts of the site may not function properly without them.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">5. Data Security</h2>
          <p>
            We use industry-standard security measures including encryption in transit (HTTPS), secure password hashing, and role-based access controls. However, no system is 100% secure, and we cannot guarantee absolute security. You are responsible for keeping your account password confidential.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">6. Data Retention</h2>
          <p>
            We retain your account and order information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce agreements. You may request deletion of your account at any time (see "Your Rights" below).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">7. Your Rights</h2>
          <p>Depending on your state of residence, you may have the following rights:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
            <li><strong>Opt-Out of Marketing:</strong> Unsubscribe from marketing emails at any time via the link in any marketing email</li>
            <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at <a href="mailto:privacy@certipure.com" className="text-blue-600 hover:underline">privacy@certipure.com</a>. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">8. California Residents (CCPA)</h2>
          <p>
            California residents have additional rights under the California Consumer Privacy Act, including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. We do not sell personal information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">9. Children's Privacy</h2>
          <p>
            Our site is not intended for anyone under the age of 21. We do not knowingly collect information from individuals under 21. If we learn we have collected such information, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated via email or a prominent notice on our website. Continued use of the site after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3">11. Contact</h2>
          <p>
            For any privacy-related questions or requests, contact us at <a href="mailto:privacy@certipure.com" className="text-blue-600 hover:underline">privacy@certipure.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
